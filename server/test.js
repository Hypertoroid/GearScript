/* Exercises the server end to end on a throwaway database: node test.js */
'use strict';
const os = require('node:os'), path = require('node:path'), fs = require('node:fs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-'));
/* a stand-in for the Claude API, so the AI route is tested without a real key */
const STUB_PORT = 40000 + Math.floor(Math.random() * 20000), seenAi = [];
const stub = require('node:http').createServer((q, s) => { let b = ''; q.on('data', c => b += c); q.on('end', () => { seenAi.push({ headers: q.headers, body: JSON.parse(b) }); s.writeHead(200, { 'Content-Type': 'application/json' }); s.end(JSON.stringify({ content: [{ type: 'text', text: '```orrery\n@scene\nA::Box { size: (10mm, 10mm, 10mm); }\n```\nA box.' }], stop_reason: 'end_turn' })); }); }).listen(STUB_PORT);
Object.assign(process.env, { DB: path.join(dir, 't.db'), ADMIN_TOKEN: 'admin-secret-token', PUBLIC_URL: '', ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: `http://127.0.0.1:${STUB_PORT}`, AI_DAILY_PER_VISITOR: '2', AI_PER_MINUTE: '50' });

const { server } = require('./server.js');

let pass = 0, fail = 0;
const ok = (c, what) => { if (c) { pass++; console.log('  ok  ' + what); } else { fail++; console.log('  FAIL ' + what); } };

server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(body) });
  try {
    let r = await fetch(base + '/'); const landing = await r.text();
    ok(r.status === 200 && /studio\.html/.test(landing), 'serves the landing page, which links to the studio');
    r = await fetch(base + '/studio.html'); ok(r.status === 200 && /Orrery Studio/.test(await r.text()), 'serves the studio');
    ok(r.headers.get('x-content-type-options') === 'nosniff' && /default-src 'self'/.test(r.headers.get('content-security-policy') || ''), 'security headers are set');
    for (const p of ['/help.html', '/vendor/codemirror6.js', '/LICENSE', '/NOTICE', '/site-config.js']) { r = await fetch(base + p); ok(r.status === 200, `serves ${p}`); }
    r = await fetch(base + '/LICENSE'); ok(/text\/plain/.test(r.headers.get('content-type')), 'LICENSE is plain text');
    for (const p of ['/server/server.js', '/server/t.db', '/../etc/passwd', '/%2e%2e/server/server.js', '/cli/orrery.js', '/.git/config']) { r = await fetch(base + p); ok(r.status === 404 || r.status === 403 || r.status === 400, `refuses ${p}`); }
    r = await fetch(base + '/studio.html', { method: 'POST' }); ok(r.status === 405, 'static files are GET only');

    const { DatabaseSync } = require('node:sqlite'); const look = new DatabaseSync(process.env.DB);
    const look_cols_has_prompt = () => look.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().some(t => look.prepare(`PRAGMA table_info(${t.name})`).all().some(c => /prompt|text|reply/.test(c.name)));
    for (const p of ['/api/me', '/api/auth/google/start', '/api/signup']) { r = await fetch(base + p); ok(r.status === 404, `${p} does not exist`); }

    /* health */
    r = await fetch(base + '/api/health'); const h = await r.json(); ok(r.status === 200 && h.ok && h.analytics, 'health says the server is there and counts with consent');
    ok(h.ai === true, 'health says AI is on when a key is set');

    /* AI */
    r = await post('/api/ai', { prompt: 'a box' }); let a = await r.json();
    ok(r.status === 200 && /A::Box/.test(a.text), 'AI request returns the model\'s reply');
    const sent = seenAi[0];
    ok(sent && sent.headers['x-api-key'] === 'test-key' && sent.headers['anthropic-version'] === '2026-10-21' && sent.body.messages[0].content === 'a box' && !('temperature' in sent.body), 'the request to the API carries the key, the version and the prompt');
    ok(!look_cols_has_prompt(), 'AI requests are not stored');
    r = await post('/api/ai', { prompt: 'x' }, { Origin: 'https://evil.example' }); ok(r.status === 403, 'cross-site AI request refused');
    r = await post('/api/ai', { prompt: '' }); ok(r.status === 400, 'empty AI request refused');
    r = await post('/api/ai', { prompt: 'x'.repeat(130000) }); ok(r.status === 413, 'oversized AI request refused');
    r = await post('/api/ai', { prompt: 'second' }); ok(r.status === 200, 'second AI request of the day allowed');
    r = await post('/api/ai', { prompt: 'third' }); a = await r.json(); ok(r.status === 429 && /today's 2 AI requests/.test(a.error), 'daily AI limit per visitor');

    /* events */
    r = await post('/api/events', { name: 'page_view', vid: 'visitor-123456' }); ok(r.status === 204, 'event without consent is accepted but dropped');
    const consent = { Cookie: 'ms_consent=analytics' };
    r = await post('/api/events', { name: 'page_view', vid: 'visitor-123456', path: '/studio.html' }, consent); ok(r.status === 204, 'event with consent is stored');
    r = await post('/api/events', { name: 'example_open', vid: 'visitor-123456', props: { name: 'v8' } }, consent); ok(r.status === 204, 'example_open stored');
    r = await post('/api/events', { name: 'export_gif', vid: 'visitor-123456', props: { format: 'mp4', bytes: 1000 } }, consent); ok(r.status === 204, 'export stored');
    r = await post('/api/events', { name: 'sign_in' }, consent); ok(r.status === 400, 'sign-in events are no longer accepted');
    r = await post('/api/events', { name: 'page_view' }, { ...consent, Origin: 'https://evil.example' }); ok(r.status === 403, 'cross-site POST refused');
    r = await fetch(base + '/api/events', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: base, ...consent }, body: '{}' }); ok(r.status === 415, 'non-JSON POST refused');
    r = await post('/api/events', { name: 'page_view', props: 'x'.repeat(5000) }, consent); ok(r.status === 413, 'oversized event refused');
    const n = look.prepare("SELECT COUNT(*) AS n FROM events WHERE vid = 'visitor-123456'").get().n; ok(n === 3, 'exactly the consented events were stored');
    const cols = look.prepare('PRAGMA table_info(events)').all().map(c => c.name);
    ok(!cols.includes('email') && !cols.includes('ip'), 'events hold no email or IP address');

    /* admin */
    r = await fetch(base + '/api/admin/stats'); ok(r.status === 401, 'stats need the admin token');
    r = await fetch(base + '/api/admin/stats', { headers: { Authorization: 'Bearer wrong-token-of-same-len' } }); ok(r.status === 401, 'wrong admin token refused');
    r = await fetch(base + '/api/admin/stats?days=7', { headers: { Authorization: 'Bearer admin-secret-token' } }); const s = await r.json();
    ok(r.status === 200 && s.visitors >= 1 && s.examples.some(e => e.example === 'v8') && s.exports.some(e => e.format === 'mp4'), 'stats report visitors, examples and export formats');
    ok(!('users' in s), 'stats no longer mention users');

    /* rate limit */
    let limitedHit = false; for (let i = 0; i < 130 && !limitedHit; i++) { r = await post('/api/events', { name: 'tour_end' }, consent); if (r.status === 429) limitedHit = true; }
    ok(limitedHit, 'events are rate-limited');
    look.close();
  } catch (e) { fail++; console.log('  FAIL threw: ' + (e.stack || e)); }
  console.log(`\n${pass} passed, ${fail} failed`);
  server.close(); stub.close(); fs.rmSync(dir, { recursive: true, force: true }); process.exit(fail ? 1 : 0);
});
