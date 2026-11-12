#!/usr/bin/env node
/* GearScript server (optional).
   Serves the landing page, the studio and the guide, and keeps opt-in usage statistics.
   There are no accounts: the studio works the same with or without this server.
   No dependencies beyond Node 22.13+ (node:sqlite).

   - Statistics are stored only for visitors who allowed the analytics cookie in the studio's banner.
     An event is a name (page_view, example_open, export_gif, ...), a few properties, a random visitor id and a time.
     No names, emails or IP addresses are stored. Events are kept 13 months.
   - Cross-site POSTs are refused, events are rate-limited per IP, and every response carries security headers.
   - AI (optional): with ANTHROPIC_API_KEY set, POST /api/ai passes the studio's prompt to the Claude API and returns the reply,
     for the studio's Generate and Fix with AI buttons. Requests and replies are not stored. Each visitor has a daily number of
     requests, counted under a salted hash of the IP address that changes every day (kept two days), and the site has a daily total.

   Environment:
     PORT=8080  DB=./gearscript.db  TRUST_PROXY=1 (behind a reverse proxy)  ADMIN_TOKEN=<long random string>
     PUBLIC_URL=https://your.domain   (optional; used to check where POSTs come from)
     SECURE_COOKIES=1                 (send HSTS; set it behind HTTPS)
     ANTHROPIC_API_KEY=<key>          (optional: turns AI on)   AI_MODEL=claude-sonnet-5-5   AI_MAX_TOKENS=8000
     AI_DAILY_PER_VISITOR=20  AI_DAILY_SITE=500  AI_PER_MINUTE=4  HASH_SALT=<long random string>
   Usage numbers: GET /api/admin/stats?days=30 with "Authorization: Bearer <ADMIN_TOKEN>". */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); } catch (e) { console.error('This server needs Node 22.13 or later (for node:sqlite).'); process.exit(1); }

const env = process.env;
const PORT = +env.PORT || 8080;
const ROOT = path.resolve(env.STATIC_ROOT || path.join(__dirname, '..'));
const DB_FILE = env.DB || path.join(__dirname, 'gearscript.db');
const SECURE = env.SECURE_COOKIES === '1';
const ADMIN_TOKEN = env.ADMIN_TOKEN || '';
const EVENT_NAMES = new Set(['page_view', 'example_open', 'export_gif', 'ai_prompt_copy', 'tour_end', 'view_change', 'chapters_start', 'film_play', 'ai_run']);
const AI_KEY = env.ANTHROPIC_API_KEY || '', AI_URL = (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '') + '/v1/messages';
const AI_MODEL = env.AI_MODEL || 'claude-sonnet-5-5', AI_MAX_TOKENS = Math.min(16000, +env.AI_MAX_TOKENS || 8000);
const AI_PER_VISITOR = +env.AI_DAILY_PER_VISITOR || 20, AI_PER_SITE = +env.AI_DAILY_SITE || 500, AI_PER_MINUTE = +env.AI_PER_MINUTE || 4, AI_MAX_PROMPT = 120000;
const HASH_SALT = env.HASH_SALT || crypto.randomBytes(16).toString('hex');   /* without one, a fresh salt each start (counts reset on restart) */

/* ---------- database ---------- */
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    ts TEXT NOT NULL,
    vid TEXT,
    name TEXT NOT NULL,
    props TEXT,
    path TEXT
  );
  CREATE INDEX IF NOT EXISTS events_name_ts ON events(name, ts);
  CREATE TABLE IF NOT EXISTS ai_usage (
    day TEXT NOT NULL,
    who TEXT NOT NULL,
    n INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, who)
  );
`);
const addEvent = db.prepare('INSERT INTO events (ts, vid, name, props, path) VALUES (?, ?, ?, ?, ?)');
const now = () => new Date().toISOString();
setInterval(() => { db.prepare('DELETE FROM events WHERE ts < ?').run(new Date(Date.now() - 395 * 864e5).toISOString()); db.prepare('DELETE FROM ai_usage WHERE day < ?').run(new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10)); }, 3600e3).unref();   /* events 13 months, AI counts two days */

/* ---------- helpers ---------- */
const buckets = new Map();
function limited(key, max, windowMs) {
  const t = Date.now(); const b = buckets.get(key) || { n: 0, reset: t + windowMs };
  if (t > b.reset) { b.n = 0; b.reset = t + windowMs; }
  b.n++; buckets.set(key, b); return b.n > max;
}
setInterval(() => { const t = Date.now(); for (const [k, b] of buckets) if (t > b.reset) buckets.delete(k); }, 600e3).unref();
function send(res, status, obj, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(status === 204 ? undefined : JSON.stringify(obj));
}
function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size <= limit) chunks.push(c); else if (size > limit * 64) req.destroy(); });   /* read to the end, so the 413 reaches the client */
    req.on('end', () => { if (size > limit) return reject(Object.assign(new Error('too large'), { status: 413 })); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(Object.assign(new Error('bad json'), { status: 400 })); } });
    req.on('error', reject);
  });
}
const isSecure = (req) => SECURE || req.headers['x-forwarded-proto'] === 'https';
const clientIp = (req) => (env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
function publicUrl(req) { return (env.PUBLIC_URL || `${isSecure(req) ? 'https' : 'http'}://${req.headers.host}`).replace(/\/$/, ''); }
function sameOrigin(req) {
  const o = req.headers.origin; if (!o) return req.headers['sec-fetch-site'] ? ['same-origin', 'none'].includes(req.headers['sec-fetch-site']) : true;
  try { return new URL(o).origin === new URL(publicUrl(req)).origin; } catch (e) { return false; }
}

/* ---------- API ---------- */
async function apiHandler(req, res, url) {
  const route = `${req.method} ${url.pathname.replace(/^\/api/, '')}`;
  if (req.method === 'POST') {
    if (!sameOrigin(req)) return send(res, 403, { error: 'Requests must come from this site.' });
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'Send JSON.' });
  }
  switch (route) {
    case 'GET /health':   /* the studio asks this to know whether statistics can be sent, and whether to show its AI buttons */
      return send(res, 200, { ok: true, analytics: true, ai: !!AI_KEY });
    case 'POST /ai': return ai(req, res);
    case 'POST /events': {
      if (!/(^|; )ms_consent=analytics(;|$)/.test(req.headers.cookie || '')) return send(res, 204, {});   /* no consent cookie: drop */
      if (limited('ev:' + clientIp(req), 120, 60e3)) return send(res, 429, { error: 'Slow down.' });
      const b = await readJson(req, 4096); const name = String(b.name || '');
      if (!EVENT_NAMES.has(name)) return send(res, 400, { error: 'Unknown event.' });
      const vid = /^[A-Za-z0-9-]{8,64}$/.test(String(b.vid || '')) ? b.vid : null;
      const props = JSON.stringify(b.props && typeof b.props === 'object' ? b.props : {}).slice(0, 1000);
      addEvent.run(now(), vid, name, props, String(b.path || '').slice(0, 200));
      return send(res, 204, {});
    }
    case 'GET /admin/stats': {
      const auth = String(req.headers.authorization || '');
      if (!ADMIN_TOKEN || auth.length !== ADMIN_TOKEN.length + 7 || !crypto.timingSafeEqual(Buffer.from(auth), Buffer.from('Bearer ' + ADMIN_TOKEN))) return send(res, 401, { error: 'Admin only.' });
      const since = new Date(Date.now() - (+url.searchParams.get('days') || 30) * 864e5).toISOString();
      return send(res, 200, {
        visitors: db.prepare('SELECT COUNT(DISTINCT vid) AS n FROM events WHERE ts >= ?').get(since).n,
        returning: db.prepare("SELECT COUNT(*) AS n FROM (SELECT vid FROM events WHERE ts >= ? AND vid IS NOT NULL GROUP BY vid HAVING COUNT(DISTINCT substr(ts, 1, 10)) > 1)").get(since).n,
        events: db.prepare('SELECT name, COUNT(*) AS n FROM events WHERE ts >= ? GROUP BY name ORDER BY n DESC').all(since),
        examples: db.prepare("SELECT json_extract(props, '$.name') AS example, COUNT(*) AS n FROM events WHERE name = 'example_open' AND ts >= ? GROUP BY example ORDER BY n DESC").all(since),
        exports: db.prepare("SELECT json_extract(props, '$.format') AS format, COUNT(*) AS n FROM events WHERE name = 'export_gif' AND ts >= ? GROUP BY format ORDER BY n DESC").all(since),
        daily: db.prepare("SELECT substr(ts, 1, 10) AS day, COUNT(DISTINCT vid) AS visitors, SUM(name = 'export_gif') AS exports FROM events WHERE ts >= ? GROUP BY day ORDER BY day").all(since),
      });
    }
    default:
      return send(res, 404, { error: 'Not found.' });
  }
}

/* ---------- AI: the studio sends its whole prompt; the reply's text goes back ---------- */
async function ai(req, res) {
  if (!AI_KEY) return send(res, 404, { error: 'AI is not set up on this site. Use Copy prompt with any assistant instead.' });
  const ip = clientIp(req), day = new Date().toISOString().slice(0, 10);
  if (limited('ai:' + ip, AI_PER_MINUTE, 60e3)) return send(res, 429, { error: 'Too many requests at once. Wait a minute and try again.' });
  const b = await readJson(req, AI_MAX_PROMPT * 2), prompt = typeof b.prompt === 'string' ? b.prompt : '';
  if (!prompt.trim()) return send(res, 400, { error: 'The request was empty.' });
  if (prompt.length > AI_MAX_PROMPT) return send(res, 413, { error: 'This project is too large to send to the AI here. Use Copy prompt with an assistant instead.' });
  const who = crypto.createHash('sha256').update(`${HASH_SALT}|${day}|${ip}`).digest('hex').slice(0, 24);
  const row = db.prepare('SELECT COALESCE(SUM(CASE WHEN who = ? THEN n ELSE 0 END), 0) AS mine, COALESCE(SUM(n), 0) AS total FROM ai_usage WHERE day = ?').get(who, day);
  if (row.mine >= AI_PER_VISITOR) return send(res, 429, { error: `You have used today's ${AI_PER_VISITOR} AI requests on this site. Copy prompt still works with any assistant.` });
  if (row.total >= AI_PER_SITE) return send(res, 429, { error: "The site has used today's AI allowance. Copy prompt still works with any assistant." });
  let r;
  try {
    r = await fetch(AI_URL, { method: 'POST', signal: AbortSignal.timeout(170e3), headers: { 'content-type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2026-10-21' },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: AI_MAX_TOKENS, metadata: { user_id: who },
        system: 'You write animations in the GearScript language for the GearScript Studio web app. Follow the instructions and the output format in the user message exactly. Reply with the code block(s) it asks for and one or two plain sentences, nothing else.',
        messages: [{ role: 'user', content: prompt }] }) });
  } catch (e) { return send(res, 502, { error: 'The AI could not be reached. Try again, or use Copy prompt.' }); }
  if (!r.ok) { console.error('claude api', r.status, (await r.text().catch(() => '')).slice(0, 300)); return send(res, 502, { error: r.status === 429 || r.status === 529 ? 'The AI is busy right now. Try again in a minute.' : 'The AI could not answer this time. Try again, or use Copy prompt.' }); }
  const msg = await r.json(), text = (msg.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  db.prepare('INSERT INTO ai_usage (day, who, n) VALUES (?, ?, 1) ON CONFLICT(day, who) DO UPDATE SET n = n + 1').run(day, who);
  if (!text) return send(res, 502, { error: msg.stop_reason === 'refusal' ? 'The AI declined this request.' : 'The AI sent an empty reply. Try rewording the request.' });
  return send(res, 200, { text, stop: msg.stop_reason || null, model: AI_MODEL });
}

/* ---------- static files ---------- */
const TYPES = { '.webmanifest': 'application/manifest+json', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.pdf': 'application/pdf', '.md': 'text/markdown; charset=utf-8', '.ms': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const PUBLIC = /^\/(index\.html|404\.html|studio\.html|manifest\.webmanifest|sw\.js|help\.html|privacy\.html|terms\.html|site-config\.js|SPEC\.md|LICENSE|NOTICE|TRADEMARKS\.md|brand\/[\w.-]+|docs\/[\w.-]+|vendor\/[\w.-]+|examples\/[\w.-]+|examples\/[\w-]+\/[\w.-]+)$/;
/* a missing page: the 404 page for a browser, plain text for anything else */
function notFound(req, res) {
  if (!/text\/html/.test(req.headers.accept || '')) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  fs.readFile(path.join(ROOT, '404.html'), (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(req.method === 'HEAD' ? undefined : data);
  });
}
function serveStatic(req, res, url) {
  let p; try { p = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/') p = '/index.html';
  if (!PUBLIC.test(p)) return notFound(req, res);
  const file = path.join(ROOT, p); if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) return notFound(req, res);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || (/\/(LICENSE|NOTICE)$/.test(file) ? 'text/plain; charset=utf-8' : 'application/octet-stream'), 'Cache-Control': p.endsWith('.html') || p === '/sw.js' ? 'no-cache' : 'public, max-age=3600' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

/* ---------- server ---------- */
/* the neural voice for video exports (Kokoro and Piper, in the browser) compiles WebAssembly ('wasm-unsafe-eval'), may start workers, fetches its runtime
   from the CDNs and the voice model from huggingface.co (connect-src) */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://huggingface.co https://*.huggingface.co https://*.hf.co; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};
const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  if (isSecure(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname.startsWith('/api/')) return await apiHandler(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, url);
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Something went wrong.' });
    if (!e.status) console.error(e);
  }
});
if (require.main === module) server.listen(PORT, () => {
  console.log(`GearScript server on http://localhost:${PORT}  (database ${DB_FILE})`);
  console.log(`Usage statistics: on, for visitors who allow them${ADMIN_TOKEN ? '' : '  (set ADMIN_TOKEN to read them)'}`);
  console.log(AI_KEY ? `AI: on (${AI_MODEL}, ${AI_PER_VISITOR} requests per visitor and ${AI_PER_SITE} for the site each day)` : 'AI: off (set ANTHROPIC_API_KEY to turn on Generate and Fix with AI)');
});
module.exports = { server };
