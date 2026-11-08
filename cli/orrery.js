#!/usr/bin/env node
/* Orrery command-line tool (v1.0 beta).
   Uses the same compiler as the studio: it reads the core straight out of ../studio.html,
   so the browser and the command line can never disagree about what a project means.

   orrery check   <project> [--json]
   orrery sample  <project> [--at 0,1,2] [--points Crank.end.b,Pen.center] [--parts A,B]
   orrery render  <project> -o out.gif|out.mp4|out.webm|out.png|frames.zip|sound.wav [--width 480] [--height 360] [--fps 20] [--time 1.5 (png)]
   orrery eval    <tasks.json> <answers-folder> [--json]
   orrery examples <folder>
   orrery format  <project> [--write]
   orrery mcp     (a Model Context Protocol server on stdin/stdout)

   A project is a folder with .scene, .style and .motion files, a project.orrery.json file,
   or one of the three files (its siblings with the same name are picked up).
   A .orrery file with @chapter lines is a project with chapters: check and test cover every chapter,
   sample takes --chapter, and render makes the whole film. */
'use strict';
const fs = require('fs');
const path = require('path');

const STUDIO = process.env.ORRERY_STUDIO || path.join(__dirname, '..', 'studio.html');
let Orrery = null, EXAMPLES = null;
function core() {
  if (Orrery) return Orrery;
  globalThis.THREE = require('three');
  const html = fs.readFileSync(STUDIO, 'utf8');
  const src = html.match(/<script id="core">([\s\S]*?)<\/script>/);
  if (!src) throw new Error(`No compiler found in ${STUDIO}.`);
  new Function(src[1])();
  Orrery = globalThis.Orrery;
  const ex = html.match(/const EXAMPLES = (\{[\s\S]*?\n\});/);
  EXAMPLES = ex ? new Function('return ' + ex[1])() : {};
  return Orrery;
}

/* ---------- projects ---------- */
function readProject(p) {
  if (!p) throw usage('Name a project: a folder, a .json project file, or a .scene file.');
  const st = fs.statSync(p);
  const out = { scene: '', style: '', motion: '' };
  if (st.isDirectory()) {
    for (const k of Object.keys(out)) {
      const f = fs.readdirSync(p).find(n => n.endsWith('.' + k));
      if (f) out[k] = fs.readFileSync(path.join(p, f), 'utf8');
    }
    const j = fs.readdirSync(p).find(n => n.endsWith('.orrery.json'));
    if (!out.scene && j) return readProject(path.join(p, j));
    const single = fs.readdirSync(p).find(n => /\.orrery$/.test(n));
    if (!out.scene && single) return readProject(path.join(p, single));
    return out;
  }
  if (/\.orrery(\.txt)?$/.test(p) || (p.endsWith('.txt') && /^[ \t]*@(scene|chapter|common)\b/m.test(fs.readFileSync(p, 'utf8')))) return fromSingle(fs.readFileSync(p, 'utf8'));
  if (p.endsWith('.json')) { const j = JSON.parse(fs.readFileSync(p, 'utf8')); if (typeof j.film === 'string') return fromSingle(j.film); const f = j.files || j; return { scene: f.scene || '', style: f.style || '', motion: f.motion || '' }; }
  const base = p.replace(/\.(scene|style|motion)$/, '');
  for (const k of Object.keys(out)) if (fs.existsSync(base + '.' + k)) out[k] = fs.readFileSync(base + '.' + k, 'utf8');
  return out;
}

/* a single-file project: @scene, @style and @motion start each section. With @chapter lines it is a project with chapters (a film) */
function fromSingle(text) {
  if (core().isFilmText(text)) { const out = { scene: '', style: '', motion: '' }; Object.defineProperty(out, 'film', { value: core().splitFilm(text), enumerable: false }); Object.defineProperty(out, 'text', { value: text, enumerable: false }); return out; }
  const split = core().splitProject(text);
  const out = { ...split.files }; Object.defineProperty(out, 'single', { value: split, enumerable: false }); return out;
}
const plain = (p) => ({ scene: p.scene || '', style: p.style || '', motion: p.motion || '' });

/* the base prompt the studio's AI prompt button copies, in the three-file or one-file reply format */
function aiPrompt(single, chapters, task) {
  const html = fs.readFileSync(STUDIO, 'utf8');
  const get = (name) => { const m = html.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;')); return m ? m[1].replace(/\\`/g, '`').replace(/\\\\/g, '\\') : ''; };
  /* as in the studio: narration and chapters only when the task asks for them (with no task words, both, as a full reference) */
  const rx = (name) => { const m = html.match(new RegExp(name + ' = (/.*?/i)')); try { return m ? new Function('return ' + m[1])() : null; } catch (e) { return null; } };
  const narr = !task || (rx('AI_NARR_RX') || /narrat/i).test(task), chap = chapters || !task || (rx('AI_CHAP_RX') || /chapter/i).test(task);
  return [get('AI_PROMPT').trim(), narr ? get('AI_NARRATION').trim() : '', chap ? get('AI_CHAPTERS').trim() : '', get('AI_CHECK').trim(), get(chapters ? 'AI_FORMAT_FILM' : single ? 'AI_FORMAT_SINGLE' : 'AI_FORMAT_FILES')].filter(Boolean).join('\n\n');
}

/* ---------- schema: the language as data, for editors and AI tools ---------- */
function schema() {
  const M = core(), html = fs.readFileSync(STUDIO, 'utf8');
  const grab = (start, end) => { const i = html.indexOf(start), j = html.indexOf(end, i); return i < 0 || j < 0 ? '' : html.slice(i, j); };
  const tables = new Function(grab('const FACE_N', 'const LINE_ANCHOR') + grab('const SHAPE_DOC', 'const SHAPE_PROPS') + grab('const REQUIRED', '\n') + grab('const SPECIAL_PROPS', '\n') + grab('const STYLE_KEYS', '\n') + grab('const MATERIALS', '\n') + grab('const EASE', '\n') + grab('const UNITS = [[', '\n') + grab('const PART_MOTION', '\n') +
    'return { ANCHORS, SHAPE_DOC, PROP_DOC, REQUIRED, SPECIAL_PROPS, STYLE_KEYS, MATERIALS, EASE, UNITS, PART_MOTION };')();
  const doc = (k) => tables.PROP_DOC[k] ? { example: tables.PROP_DOC[k][0], doc: tables.PROP_DOC[k][1] } : {};
  const common = ['at', 'align', 'orient', 'visible', 'repeat', 'scatter', 'attach', 'hinge', 'slider', 'range', 'mesh', 'couple', 'belt', 'pin', 'overlap', 'fixed'];
  return {
    language: M.LANGUAGE, studio: M.version, versionLine: '@orrery 1', sections: ['scene', 'style', 'motion'], fileExtension: '.orrery',
    syntax: { part: 'Name::Type.class { prop: value; }', group: 'Name::Group { member: Type { ... } }', define: 'define Name(param, other = 10mm) :: Type { ... }', let: 'let name = value;', comment: '// line  or  /* block */', styleRule: 'Selector, .class, #Name { prop: value; }', motionRule: 'Target { forever: prop: value;  0s..2s: prop: a -> b ease-in-out;  then 2s: ... }' },
    units: Object.fromEntries(tables.UNITS.map(([u, k]) => [u, k])), easings: tables.EASE,
    shapes: Object.fromEntries(Object.entries(M.SHAPES).map(([k, v]) => [k, { properties: v.props.map(p => ({ name: p, ...doc(p) })), required: tables.REQUIRED[k] || [], anchors: tables.ANCHORS[k] || [], doc: tables.SHAPE_DOC[k] || '' }])),
    commonProperties: common.map(p => ({ name: p, ...doc(p) })),
    blocks: Object.fromEntries(Object.entries(tables.SPECIAL_PROPS).map(([k, v]) => [k, v.map(p => ({ name: p, ...doc(p) }))])),
    style: tables.STYLE_KEYS.map(p => ({ name: p, ...doc(p) })), materials: tables.MATERIALS.map(([m, d]) => ({ name: m, doc: d })),
    motion: { part: tables.PART_MOTION.map(p => ({ name: p, ...doc(p) })), observer: ['follow', 'orbit', 'look-at', 'zoom', 'move', 'x', 'y', 'z', 'position', 'sound'].map(p => ({ name: p, ...doc(p) })), scene: ['sound', 'say', 'explode'].map(p => ({ name: p, ...doc(p) })) },
    chapters: { common: '@common', chapter: '@chapter Name ["Title"] [extends Other] [cut | fade [time] [#colour] | crossfade [time]] [fade-out [time] [#colour]]', transitions: { cut: 'straight in', fade: 'through a colour (black unless given), 0.8 s unless given', crossfade: 'blends over the end of the chapter before, 1 s unless given' }, extends: 'the chapter starts from the other chapter\'s scene and style (not its motion); a later Observer replaces the inherited one', maxChapterSeconds: 120 },
    sounds: Object.fromEntries(Object.entries(M.SOUND_KINDS).map(([k, v]) => [k, v.doc])), skies: Object.keys(M.SKY_PRESETS), frames: Object.fromEntries(Object.entries(M.FRAME_PRESETS).map(([k, v]) => [k, v[0] + 'x' + v[1]])),
  };
}

/* ---------- check ---------- */
/* a project with chapters: every chapter compiled from @common, the chapters it extends and its own sections.
   Each problem is reported on its line in the .orrery file, with the chapter it was written in */
function checkFilm(project) {
  const M = core(), f = project.film, seen = new Set(), models = [];
  const diagnostics = f.issues.map(d => d.json());
  f.chapters.forEach((c, i) => {
    const cf = M.chapterFiles(f, i), m = M.compile(cf.files, { layered: true });
    if (!m.diags.some(d => d.sev === 'error')) try { m.diags.push(...M.overlapCheck(m, { budgetMs: 2000 })); } catch (e) {}
    for (const d of m.diags) {
      const j = d.json(), L = j.file && M.layerOf(cf.layers, j.file, j.line); let b = i, line = j.line;
      if (L) { b = L.box; const bx = L.box < 0 ? f.common : f.chapters[L.box]; line = bx.start[j.file] ? bx.start[j.file] + L.line - 1 : j.line; }
      const out = { ...j, section: j.file || undefined, chapter: b < 0 ? '@common' : f.chapters[b].name, file: 'project', line };
      if (out.edit) out.edit = { ...out.edit, line: line + (out.edit.line - j.line) };
      const k = [out.code, out.line, out.col, out.message].join('|'); if (seen.has(k)) continue; seen.add(k); diagnostics.push(out);
    }
    models.push(m);
  });
  const fr = (m) => m.sceneOpts.frame ? m.sceneOpts.frame.w + 'x' + m.sceneOpts.frame.h : 'none';   /* one video has one shape */
  models.forEach((m, i) => { if (i && fr(m) !== fr(models[0])) diagnostics.push({ severity: 'warning', code: 'W0147', file: 'project', line: f.chapters[i].line || 1, col: 1, chapter: f.chapters[i].name, message: `${f.chapters[i].name} has a different frame (${fr(m)}) from the first chapter (${fr(models[0])}).`, fix: "The export uses the first chapter's frame. Put Scene { frame: … } in @common so every chapter shares it." }); });
  const times = M.filmTimes(f.chapters, models.map(m => m.duration));
  const sounds = models.flatMap((m, i) => (m.soundEvents || []).map(e => ({ t: Math.round((times.list[i].s + e.t) * 1000) / 1000, sound: e.sound, kind: m.sounds.get(e.sound).kind, volume: Math.round(e.volume * 100) / 100, target: e.target, chapter: f.chapters[i].name })));
  const chapters = f.chapters.map((c, i) => ({ name: c.name, title: c.title || undefined, extends: c.ext || undefined, start: Math.round(times.list[i].s * 1000) / 1000, duration: models[i].duration, transition: c.trans.kind, fadeOut: !!c.fadeOut }));
  return { ok: !diagnostics.some(d => d.severity === 'error'), duration: Math.round(times.total * 1000) / 1000, chapters, parts: [...new Set(models.flatMap(m => m.order.map(e => e.name)))], sounds, diagnostics, model: models[0], models, film: f };
}
function check(project) {
  if (project.film) return checkFilm(project);
  const m = core().compile(plain(project));
  if (!m.diags.some(d => d.sev === 'error')) try { m.diags.push(...core().overlapCheck(m, { budgetMs: 4000 })); } catch (e) {}
  let diagnostics = m.diags.map(d => d.json());
  if (project.single) {   /* report lines in the single file, and say which section each one is in */
    const sp = project.single;
    diagnostics = [...sp.issues.map(d => d.json()), ...diagnostics.map(d => { const line = core().projectLine(sp, d.file, d.line); return { ...d, section: d.file, file: 'project', line, ...(d.edit ? { edit: { ...d.edit, line: line + (d.edit.line - d.line) } } : {}) }; })];
  }
  const sounds = (m.soundEvents || []).map(e => ({ t: Math.round(e.t * 1000) / 1000, sound: e.sound, kind: m.sounds.get(e.sound).kind, volume: Math.round(e.volume * 100) / 100, target: e.target }));
  return { ok: !diagnostics.some(d => d.severity === 'error'), duration: m.duration, parts: m.order.map(e => e.name), sounds, diagnostics, model: m };
}
/* where each section of a project lives on disk, for --fix */
function sourcePaths(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    const names = fs.readdirSync(p), out = {};
    for (const k of ['scene', 'style', 'motion']) { const f = names.find(n => n.endsWith('.' + k)); if (f) out[k] = path.join(p, f); }
    if (out.scene) return out;
    const single = names.find(n => /\.orrery$/.test(n)); return single ? { project: path.join(p, single) } : null;
  }
  if (/\.orrery(\.txt)?$/.test(p) || p.endsWith('.txt')) return { project: p };
  if (p.endsWith('.json')) return null;
  const base = p.replace(/\.(scene|style|motion)$/, ''), out = {};
  for (const k of ['scene', 'style', 'motion']) if (fs.existsSync(base + '.' + k)) out[k] = base + '.' + k;
  return out;
}
/* apply the machine edits problems carry, repeatedly until none are left. Sure edits only (# comments, other names for a property,
   easings, ignored properties …); with guesses, the likely corrections too ("Did you mean …?", a value back in its range), each round
   after the sure ones. Stops when a round changes nothing, when the project comes back to a text it already had, or after 10 rounds */
function fixProject(p, guesses) {
  const where = sourcePaths(p); if (!where) throw usage('--fix works on .orrery files and .scene/.style/.motion files.');
  let applied = 0; const changes = [], seenText = new Set();
  const snapshot = () => Object.values(where).map(f => fs.readFileSync(f, 'utf8')).join('\u0000');
  seenText.add(snapshot());
  for (let round = 0; round < 10; round++) {
    const c = check(readProject(p)); const fixable = c.diagnostics.filter(d => d.edit);
    let eds = fixable.filter(d => !d.edit.guess);
    if (!eds.length && guesses) eds = fixable.filter(d => d.edit.guess);
    if (!eds.length) return { applied, changes, check: c };
    const byFile = new Map();
    for (const d of eds) { const f = where.project ? 'project' : d.file; if (!where[f]) continue; if (!byFile.has(f)) byFile.set(f, []); byFile.get(f).push(d); }
    let n = 0;
    for (const [f, list] of byFile) {
      const r = core().applyEdits(fs.readFileSync(where[f], 'utf8'), list);
      if (!r.applied.length) continue;
      fs.writeFileSync(where[f], r.text); n += r.applied.length;
      for (const x of r.changes) changes.push(`${x.d.code} line ${x.line}: ${x.was ? JSON.stringify(x.was.trim()) + (x.ins ? ' → ' + JSON.stringify(x.ins.trim()) : ' removed') : 'added ' + JSON.stringify(x.ins.trim())}${x.d.edit.guess ? '  (guess)' : ''}`);
    }
    applied += n;
    const now = snapshot(); if (!n || seenText.has(now)) return { applied, changes, check: check(readProject(p)) };
    seenText.add(now);
  }
  return { applied, changes, check: check(readProject(p)) };
}
function fmtDiag(d) { return `${d.severity === 'error' ? 'error' : 'warning'} ${d.code} ${d.file || ''}:${d.line}:${d.col}${d.chapter || d.section ? ' (' + [d.chapter, d.section].filter(Boolean).join(' › ') + ')' : ''}  ${d.message}${d.edit ? (d.edit.guess ? '  [--fix --suggestions]' : '  [--fix]') : ''}${d.fix ? '\n    fix: ' + d.fix : ''}`; }

/* ---------- sample: numbers an agent can assert on ---------- */
const r3 = v => v.map(x => Math.round(x * 1000) / 1000);
function pointAt(m, mats, ref) {
  const parts = ref.split('.'); const ent = m.ents.get(parts[0]);
  if (!ent) throw new Error(`There is no part called "${parts[0]}".`);
  const la = m.localAnchor(ent, parts.slice(1), null);
  return new THREE.Vector3(...la.p).applyMatrix4(mats.get(ent.name)).toArray();
}
function sample(project, opts = {}) {
  const c = check(project); if (!c.ok) return { ok: false, diagnostics: c.diagnostics };
  let m = c.model, chapter;
  if (c.models) {   /* a project with chapters: one chapter at a time, at its own times (--chapter Name or a number; the first by default) */
    const k = opts.chapter === undefined ? 0 : /^\d+$/.test(String(opts.chapter)) ? +opts.chapter - 1 : c.chapters.findIndex(x => x.name === opts.chapter);
    if (!c.models[k]) throw new Error(`There is no chapter "${opts.chapter}". Chapters: ${c.chapters.map(x => x.name).join(', ')}.`);
    m = c.models[k]; chapter = c.chapters[k].name;
  }
  const times = opts.at && opts.at.length ? opts.at : [0, m.duration / 4, m.duration / 2, (3 * m.duration) / 4, m.duration].map(x => Math.round(x * 1000) / 1000);
  const parts = opts.parts && opts.parts.length ? opts.parts : m.order.map(e => e.name);
  const frames = [];
  for (const t of times) {
    const mats = core().solve(m, t); const f = { t, parts: {}, points: {} };
    for (const n of parts) {
      const M = mats.get(n); if (!M) throw new Error(`There is no part called "${n}".`);
      const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); M.decompose(pos, q, sc);
      const ang = 2 * Math.acos(Math.min(1, Math.abs(q.w))); const s = Math.sqrt(Math.max(0, 1 - q.w * q.w)) || 1;
      const axis = ang < 1e-9 ? [0, 0, 1] : [q.x / s, q.y / s, q.z / s].map(x => x * Math.sign(q.w || 1));
      f.parts[n] = { position: r3(pos.toArray()), rotation: { deg: Math.round(ang * 180 / Math.PI * 1000) / 1000, axis: r3(axis) } };
    }
    for (const p of opts.points || []) f.points[p] = r3(pointAt(m, mats, p));
    const cam = core().cameraAt(m, t, x => core().solve(m, x)); f.camera = { position: r3(cam.pos.toArray()), lookAt: r3(cam.look.toArray()) };
    frames.push(f);
  }
  return { ok: true, ...(chapter ? { chapter, chapters: c.chapters.map(x => x.name) } : {}), duration: m.duration, warnings: c.diagnostics, frames };
}

/* ---------- motion tests: where every part of every example is, at set moments, compared with a saved copy ----------
   "Compiles without errors" is not enough: a part can stop moving and every check still passes. These snapshots
   catch that. After an intended change, run with --update and review the diff of tests/motion before committing. */
const SNAP_FRACTIONS = [0, 0.13, 0.29, 0.5, 0.71, 0.87, 1];
function snapModel(m, prefix, parts, moving) {
  const M = core(), times = SNAP_FRACTIONS.map(f => Math.round(f * m.duration * 1000) / 1000), first = {};
  for (const t of times) {
    const mats = M.solve(m, t);
    for (const e of m.order) {
      const X = mats.get(e.name); if (!X) continue; const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); X.decompose(pos, q, sc);
      if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
      const v = [...pos.toArray().map(x => Math.round(x * 100) / 100), ...[q.x, q.y, q.z, q.w].map(x => Math.round(x * 1e4) / 1e4)], n = prefix + e.name;
      (parts[n] = parts[n] || []).push(v);
      if (!first[n]) first[n] = v; else if (v.some((x, i) => Math.abs(x - first[n][i]) > (i < 3 ? 0.05 : 2e-4))) moving.add(n);
    }
  }
  return times;
}
function motionSnapshot(project) {
  const c = check(project); if (!c.ok) return { ok: false, diagnostics: c.diagnostics };
  const parts = {}, moving = new Set();
  if (c.models) {   /* chapters: each chapter's parts, named Chapter/Part, sampled at that chapter's own times */
    const chapters = c.models.map((m, i) => ({ name: c.chapters[i].name, duration: m.duration, times: snapModel(m, c.chapters[i].name + '/', parts, moving) }));
    return { ok: true, duration: c.duration, chapters, warnings: c.diagnostics.map(d => d.code).sort(), sounds: c.sounds.length, moving: [...moving].sort(), parts };
  }
  const times = snapModel(c.model, '', parts, moving);
  return { ok: true, duration: c.model.duration, times, warnings: c.diagnostics.map(d => d.code).sort(), sounds: c.sounds.length, moving: [...moving].sort(), parts };
}
function motionTest(dir, outDir, update) {
  const files = fs.readdirSync(dir).filter(f => /\.orrery$/.test(f)).sort(); let bad = 0, made = 0;
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of files) {
    const name = f.replace(/\.orrery$/, ''), snapFile = path.join(outDir, name + '.json'), now = motionSnapshot(readProject(path.join(dir, f)));
    if (!now.ok) { console.log(`FAIL    ${name}: does not compile`); bad++; continue; }
    if (!now.moving.length) { console.log(`FAIL    ${name}: nothing moves`); bad++; }
    if (update || !fs.existsSync(snapFile)) { fs.writeFileSync(snapFile, JSON.stringify(now, (k, v) => Array.isArray(v) && v.length === 7 && typeof v[0] === 'number' ? JSON.stringify(v) : v, 1).replace(/"(\[[^"\]]*\])"/g, '$1') + '\n'); made++; console.log(`saved   ${name}`); continue; }
    const was = JSON.parse(fs.readFileSync(snapFile, 'utf8')), probs = [];
    if (Math.abs(was.duration - now.duration) > 1e-6) probs.push(`duration ${was.duration} -> ${now.duration}`);
    if (was.warnings.join() !== now.warnings.join()) probs.push(`warnings [${was.warnings}] -> [${now.warnings}]`);
    if (was.sounds !== now.sounds) probs.push(`sound events ${was.sounds} -> ${now.sounds}`);
    const lost = was.moving.filter(n => !now.moving.includes(n)); if (lost.length) probs.push(`stopped moving: ${lost.join(', ')}`);
    for (const [n, rows] of Object.entries(was.parts)) {
      const cur = now.parts[n]; if (!cur) { probs.push(`part ${n} is gone`); continue; }
      const when = (k) => { if (was.times) return was.times[k] + ' s'; const ch = (was.chapters || []).find(x => n.startsWith(x.name + '/')); return ch ? ch.times[k] + ' s of ' + ch.name : 'sample ' + (k + 1); };
      for (let k = 0; k < rows.length; k++) { const a = rows[k], b = cur[k] || []; const dp = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), dq = Math.max(...[3, 4, 5, 6].map(i => Math.abs(a[i] - b[i]))); if (dp > 0.5 || dq > 2e-3) { probs.push(`${n} at ${when(k)} is off by ${dp.toFixed(2)} mm / ${dq.toFixed(4)} in rotation`); break; } }
      if (probs.length > 6) break;
    }
    for (const n of Object.keys(now.parts)) if (!was.parts[n]) probs.push(`new part ${n}`);
    if (probs.length) { bad++; console.log(`FAIL    ${name}\n        ` + probs.slice(0, 8).join('\n        ')); } else console.log(`PASS    ${name} (${now.moving.length} moving parts)`);
  }
  console.log(`\n${files.length - bad}/${files.length} examples move as saved` + (made ? `, ${made} snapshot${made > 1 ? 's' : ''} written` : ''));
  if (bad) process.exitCode = 1;
}

/* ---------- render: drives the studio in a headless browser ---------- */
const apiProject = (project) => project.film ? project.text : plain(project);   /* a project with chapters renders as one film */
/* the sound track alone, as a 16-bit stereo WAV: no browser needed */
function renderWav(project, opts = {}) {
  const c = check(project); if (!c.ok) return { ok: false, diagnostics: c.diagnostics };
  const sr = 48000, secs = c.models ? c.duration : c.model.duration;
  let L, R;
  if (c.models) {   /* chapters: each chapter's sounds placed at its start in the film */
    const N = Math.max(1, Math.round(secs * sr)), t = core().filmTimes(c.film.chapters, c.models.map(m => m.duration)); L = new Float32Array(N); R = new Float32Array(N);
    c.models.forEach((m, i) => { const [l, r] = core().mixSounds(m, sr, 0, m.duration), o = Math.round(t.list[i].s * sr); for (let k = 0; k < l.length && o + k < N; k++) { L[o + k] += l[k]; R[o + k] += r[k]; } });
  } else [L, R] = core().mixSounds(c.model, sr, 0, secs);
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4); buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
  if (opts.out) fs.writeFileSync(opts.out, buf);
  return { ok: true, file: opts.out || null, format: 'wav', seconds: secs, events: c.sounds.length, bytes: buf.length };
}
async function render(project, opts = {}) {
  if (/\.wav$/i.test(opts.out || '')) return renderWav(project, opts);
  const c = check(project); if (!c.ok) return { ok: false, diagnostics: c.diagnostics };
  let chromium;
  try { chromium = require('playwright').chromium; } catch (e) {
    try { const pp = require('puppeteer'); chromium = { launch: async () => wrapPuppeteer(await pp.launch({ headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })) }; }
    catch (e2) { throw new Error('render needs a headless browser. Install one with: npm install playwright && npx playwright install chromium'); }
  }
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const system = [process.env.ORRERY_CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(p => p && fs.existsSync(p));
  let browser;
  try { browser = await chromium.launch(process.env.ORRERY_CHROME ? { args, executablePath: process.env.ORRERY_CHROME } : { args }); }
  catch (e) {
    if (!system.length) throw new Error('No browser to render with. Run: npx playwright install chromium   (or set ORRERY_CHROME to the path of Chrome)');
    browser = await chromium.launch({ args, executablePath: system[0] });
  }
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const threeDir = path.dirname(require.resolve('three/package.json'));
    await page.route('**/*', (route) => {
      const u = route.request().url();
      if (/three(\.min)?\.js$/.test(u) && /cdnjs|jsdelivr|unpkg/.test(u)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(threeDir, 'build', 'three.min.js'), 'utf8') });
      if (/OrbitControls\.js$/.test(u)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(threeDir, 'examples', 'js', 'controls', 'OrbitControls.js'), 'utf8') });
      for (const [pkg, file] of [['mp4-muxer', 'build/mp4-muxer.js'], ['webm-muxer', 'build/webm-muxer.js']]) {
        if (u.includes('/' + pkg + '@')) { const dir = (require.resolve.paths(pkg) || []).map(d => path.join(d, pkg)).find(d => fs.existsSync(path.join(d, file))); if (dir) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(dir, file), 'utf8') }); return route.continue(); }
      }
      if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return route.abort();
      return route.continue();
    });
    await page.goto('file://' + path.resolve(STUDIO));
    await page.waitForFunction(() => window.OrreryStudio, null, { timeout: 20000 });
    const fmt = /\.mp4$/i.test(opts.out || '') ? 'mp4' : /\.webm$/i.test(opts.out || '') ? 'webm' : /\.png$/i.test(opts.out || '') ? 'png' : /\.zip$/i.test(opts.out || '') ? 'zip' : 'gif';
    if (fmt === 'png' || fmt === 'zip') {
      const r = await page.evaluate(([p, o]) => window.OrreryStudio.renderPng(p, o), [apiProject(project), { format: fmt, width: opts.width, height: opts.height, fps: opts.fps, time: opts.time }]);
      if (!r.ok) return r;
      const buf = Buffer.from(r.data, 'base64'); if (opts.out) fs.writeFileSync(opts.out, buf);
      return { ok: true, file: opts.out || null, format: fmt, width: r.width, height: r.height, frames: r.frames, transparent: r.transparent, bytes: buf.length };
    }
    if (fmt !== 'gif') {
      const r = await page.evaluate(([p, o]) => window.OrreryStudio.renderVideo(p, o), [apiProject(project), { format: fmt, width: opts.width, height: opts.height, fps: opts.fps, speak: opts.speak }]);
      if (!r.ok) return r.diagnostics ? r : { ok: false, diagnostics: [{ severity: 'error', code: 'E0900', message: r.error || 'Video export failed.', fix: fmt === 'mp4' ? 'This browser may lack an H.264 encoder: try -o out.webm, or set ORRERY_CHROME to Google Chrome.' : '' }] };
      const buf = Buffer.from(r.data, 'base64'); if (opts.out) fs.writeFileSync(opts.out, buf);
      return { ok: true, file: opts.out || null, format: fmt, width: r.width, height: r.height, frames: r.frames, audio: r.audio === 'aac' || r.audio === 'opus' ? r.audio : null, bytes: buf.length };
    }
    const r = await page.evaluate(([p, o]) => window.OrreryStudio.renderGif(p, o), [apiProject(project), { width: opts.width, height: opts.height, fps: opts.fps }]);
    if (!r.ok) return r;
    const buf = Buffer.from(r.gif, 'base64');
    if (opts.out) fs.writeFileSync(opts.out, buf);
    return { ok: true, file: opts.out || null, width: r.width, height: r.height, frames: r.frames, bytes: buf.length, gif: opts.keepData ? r.gif : undefined };
  } finally { await browser.close(); }
}
function wrapPuppeteer(b) {
  return {
    newPage: async (o) => { const p = await b.newPage(); await p.setViewport(o.viewport); await p.setRequestInterception(true);
      let handler = null; p.on('request', (req) => handler ? handler({ request: () => req, fulfill: (x) => req.respond({ status: 200, contentType: x.contentType, body: x.body }), abort: () => req.abort(), continue: () => req.continue() }) : req.continue());
      return { route: async (_, h) => { handler = h; }, goto: (u) => p.goto(u), waitForFunction: (f, a, o2) => p.waitForFunction(f, o2), evaluate: (f, a) => p.evaluate(f, a) }; },
    close: () => b.close(),
  };
}

/* ---------- eval: score a set of answers against tasks ---------- */
function runChecks(project, task) {
  const c = check(project); const res = { id: task.id, compiles: c.ok, errors: c.diagnostics.filter(d => d.severity === 'error').map(d => d.code + ' ' + d.message), checks: [] };
  if (!c.ok) return res;
  const m = c.model;
  for (const ck of task.checks || []) {
    let pass = false, got = null, why = '';
    try {
      const mats = core().solve(m, ck.at || 0);
      if (ck.point) {
        got = r3(pointAt(m, mats, ck.point)); const tol = ck.tol == null ? 1 : ck.tol;
        pass = ck.expect.every((v, i) => v === null || Math.abs(got[i] - v) <= tol);
      } else if (ck.distance) {
        const a = pointAt(m, mats, ck.distance[0]), b = pointAt(m, mats, ck.distance[1]); const keep = [0, 1, 2].map(i => !ck.plane || ck.plane.includes('xyz'[i])); got = Math.hypot(...a.map((v, i) => keep[i] ? v - b[i] : 0));
        pass = Math.abs(got - ck.expect) <= (ck.tol == null ? 1 : ck.tol); got = Math.round(got * 1000) / 1000;
      } else if (ck.turn) {   /* signed turn of a part about an axis between two times, compared modulo 360deg */
        const qAt = (t) => { const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); core().solve(m, t).get(ck.turn).decompose(pos, q, sc); return q; };
        const q = qAt(ck.at).multiply(qAt(ck.from || 0).invert()); const ax = new THREE.Vector3(...(ck.axis || [0, 0, 1])).normalize();
        got = Math.round(2 * Math.atan2(q.x * ax.x + q.y * ax.y + q.z * ax.z, q.w) * 180 / Math.PI * 1000) / 1000;
        const wrap = (d) => ((d % 360) + 540) % 360 - 180; const tol = ck.tol == null ? 1 : ck.tol;
        pass = Math.abs(wrap(got - ck.expect)) <= tol || (!!ck.eitherWay && Math.abs(wrap(got + ck.expect)) <= tol);
      } else if (ck.camera) {
        const cam = core().cameraAt(m, ck.at || 0, x => core().solve(m, x)); got = r3(cam.pos.toArray()); const tol = ck.tol == null ? 1 : ck.tol;
        pass = ck.expect.every((v, i) => v === null || Math.abs(got[i] - v) <= tol);
      } else if (ck.uses) {
        const src = project.scene + '\n' + project.style + '\n' + project.motion; pass = new RegExp(ck.uses).test(src); got = pass ? 'found' : 'not found';
      } else if (ck.duration != null) { got = m.duration; pass = Math.abs(got - ck.duration) < 1e-6; }
      else if (ck.parts) { got = m.order.length; pass = got >= ck.parts; }
      else if (ck.sceneOpt) { got = ck.sceneOpt.split('.').reduce((o, k) => o == null ? o : o[k], m.sceneOpts); pass = typeof ck.expect === 'number' ? typeof got === 'number' && Math.abs(got - ck.expect) <= (ck.tol == null ? 1e-6 : ck.tol) : ck.expect === true ? got != null : got === ck.expect; }
      else if (ck.textOf) { const l = m.leaves.find(x => x.path === ck.textOf || (x.top && x.top.name === ck.textOf)); got = l && l.text ? l.text.str : null; pass = got != null && (ck.expect == null || got === ck.expect); }
    } catch (e) { why = e.message; }
    res.checks.push({ name: ck.name || JSON.stringify(ck), pass, got, why: why || undefined });
  }
  return res;
}
function evaluate(tasksFile, answersDir) {
  const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8')).tasks;
  const results = tasks.map(task => {
    const cands = [path.join(answersDir, task.id), path.join(answersDir, task.id + '.orrery'), path.join(answersDir, task.id + '.json'), path.join(answersDir, task.id + '.orrery.json')];
    const where = cands.find(p => fs.existsSync(p));
    if (!where) return { id: task.id, missing: true, compiles: false, checks: [] };
    return runChecks(readProject(where), task);
  });
  const n = results.length, compiled = results.filter(r => r.compiles).length;
  const allChecks = results.flatMap(r => r.checks), passed = allChecks.filter(c => c.pass).length;
  const solved = results.filter(r => r.compiles && r.checks.every(c => c.pass)).length;
  return { tasks: n, compiled, solved, checks: allChecks.length, checksPassed: passed, results };
}

/* ---------- MCP server (JSON-RPC 2.0 over stdio, one message per line) ---------- */
function mcp() {
  const TOOLS = [
    { name: 'orrery_check', description: 'Compile an Orrery project and return its diagnostics (errors with line, column and a suggested fix). Call this after every edit.', inputSchema: projSchema() },
    { name: 'orrery_sample', description: 'Solve the animation at given times and return part positions, rotations and the world position of named anchors such as Crank.end.b. Use it to verify motion numerically.', inputSchema: projSchema({ at: { type: 'array', items: { type: 'number' }, description: 'Times in seconds.' }, points: { type: 'array', items: { type: 'string' }, description: 'Anchors to report, such as Coupler.tip.' }, parts: { type: 'array', items: { type: 'string' } }, chapter: { type: 'string', description: 'With chapters: which chapter to sample (its name); the first by default.' } }) },
    { name: 'orrery_render', description: 'Render the project to an animated GIF and return it as an image. Needs a headless browser on this machine.', inputSchema: projSchema({ width: { type: 'number' }, fps: { type: 'number' }, out: { type: 'string', description: 'Optional file path to save the GIF.' } }) },
    { name: 'orrery_prompt', description: 'Return the short Orrery syntax prompt (the same one the studio copies). Set single to get the one-file reply format, or chapters for a project with chapters.', inputSchema: { type: 'object', properties: { single: { type: 'boolean' }, chapters: { type: 'boolean' } } } },
    { name: 'orrery_spec', description: 'Return the Orrery language reference written for AI agents.', inputSchema: { type: 'object', properties: {} } },
    { name: 'orrery_schema', description: 'Return the language as JSON: every shape with its properties, required properties and anchors; style, motion and Scene properties with examples; units, easings, sound kinds, sky and frame presets. Use it to write valid code without guessing names.', inputSchema: { type: 'object', properties: {} } },
  ];
  const send = (o) => process.stdout.write(JSON.stringify(o) + '\n');
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (chunk) => {
    buf += chunk; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
      let msg; try { msg = JSON.parse(line); } catch (e) { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); continue; }
      if (msg.id === undefined) continue; /* notification */
      try {
        let result;
        if (msg.method === 'initialize') result = { protocolVersion: (msg.params && msg.params.protocolVersion) || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'orrery', version: '1.1.0' } };
        else if (msg.method === 'tools/list') result = { tools: TOOLS };
        else if (msg.method === 'ping') result = {};
        else if (msg.method === 'tools/call') result = await callTool(msg.params.name, msg.params.arguments || {});
        else { send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found: ' + msg.method } }); continue; }
        send({ jsonrpc: '2.0', id: msg.id, result });
      } catch (e) { send({ jsonrpc: '2.0', id: msg.id, result: { isError: true, content: [{ type: 'text', text: String(e.message || e) }] } }); }
    }
  });
  async function callTool(name, a) {
    const project = typeof a.project === 'string' && a.project.trim() ? fromSingle(a.project) : { scene: a.scene || '', style: a.style || '', motion: a.motion || '' };
    const text = (o) => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : pretty(o) }] });
    if (name === 'orrery_check') { const c = check(project); return text({ ok: c.ok, duration: c.duration, parts: c.parts, diagnostics: c.diagnostics }); }
    if (name === 'orrery_sample') return text(sample(project, { at: a.at, points: a.points, parts: a.parts, chapter: a.chapter }));
    if (name === 'orrery_prompt') return text(aiPrompt(!!a.single, !!a.chapters, a.task || ''));
    if (name === 'orrery_spec') return text(fs.readFileSync(path.join(__dirname, '..', 'SPEC.md'), 'utf8'));
    if (name === 'orrery_schema') return text(schema());
    if (name === 'orrery_render') {
      const r = await render(project, { width: a.width, fps: a.fps, out: a.out, keepData: true });
      if (!r.ok) return text(r);
      return { content: [{ type: 'image', data: r.gif, mimeType: 'image/gif' }, { type: 'text', text: `${r.width}x${r.height}, ${r.frames} frames${r.file ? ', saved to ' + r.file : ''}` }] };
    }
    throw new Error('Unknown tool ' + name);
  }
}
function projSchema(extra = {}) {
  return { type: 'object', properties: { project: { type: 'string', description: 'The whole project as ONE file: lines @scene, @style and @motion start each section (a project with chapters adds @common and @chapter Name lines). Use this or scene/style/motion.' }, scene: { type: 'string', description: 'The .scene file: parts, groups, connections, camera.' }, style: { type: 'string', description: 'The .style file.' }, motion: { type: 'string', description: 'The .motion file.' }, ...extra } };
}

/* ---------- command line ---------- */
function usage(msg) { const e = new Error(msg); e.usage = true; return e; }
function parseArgs(argv) {
  const pos = [], o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--out') o.out = argv[++i];
    else if (a.startsWith('--')) { const k = a.slice(2); const v = !['single', 'json', 'write', 'update', 'fix', 'suggestions', 'speak', 'chapters'].includes(k) && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; }
    else pos.push(a);
  }
  return { pos, o };
}
const pretty = (o) => JSON.stringify(o, null, 2).replace(/\[\s+([-\d.eE,\s]+?)\s+\]/g, (m, a) => '[' + a.split(/,\s*/).join(', ') + ']');
const list = (v) => typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
async function main() {
  const [cmd, ...rest] = process.argv.slice(2); const { pos, o } = parseArgs(rest);
  switch (cmd) {
    case 'check': {
      if (o.fix) { const r = fixProject(pos[0], !!o.suggestions); if (!o.json) { for (const x of r.changes) console.log('  ' + x); console.log(`fixed ${r.applied} problem${r.applied === 1 ? '' : 's'}`); } }
      const c = check(readProject(pos[0]));
      if (o.json) console.log(JSON.stringify({ ok: c.ok, duration: c.duration, ...(c.chapters ? { chapters: c.chapters } : {}), parts: c.parts, sounds: c.sounds, diagnostics: c.diagnostics }, null, 2));
      else { for (const d of c.diagnostics) console.log(fmtDiag(d)); console.log(c.ok ? `ok: ${c.chapters ? c.chapters.length + ' chapters, ' : ''}${c.parts.length} parts, ${c.duration} s${c.sounds.length ? `, ${c.sounds.length} sound event${c.sounds.length === 1 ? '' : 's'}` : ''}` : 'failed'); }
      process.exitCode = c.ok ? 0 : 1; break;
    }
    case 'sample': {
      const r = sample(readProject(pos[0]), { at: list(o.at).map(Number), points: list(o.points), parts: list(o.parts), chapter: o.chapter });
      console.log(pretty(r)); process.exitCode = r.ok ? 0 : 1; break;
    }
    case 'render': {
      if (!o.out) throw usage('render needs -o out.gif (or out.mp4, out.webm, out.png, frames.zip)');
      const r = await render(readProject(pos[0]), { out: o.out, width: o.width && +o.width, height: o.height && +o.height, fps: o.fps && +o.fps, time: o.time !== undefined ? parseFloat(o.time) : undefined, speak: o.speak ? true : undefined });
      if (!r.ok) { for (const d of r.diagnostics) console.log(fmtDiag(d)); process.exitCode = 1; }
      else if (r.format === 'wav') console.log(`wrote ${r.file}: ${r.seconds} s of sound, ${r.events} event${r.events === 1 ? '' : 's'}, ${(r.bytes / 1024).toFixed(0)} KB`);
      else console.log(`wrote ${r.file}: ${r.width}x${r.height}, ${r.frames} frame${r.frames === 1 ? '' : 's'}${r.transparent ? ', transparent background' : ''}${r.audio ? ', with sound' : ''}, ${(r.bytes / 1024).toFixed(0)} KB`);
      break;
    }
    case 'eval': {
      const r = evaluate(pos[0], pos[1]);
      if (o.json) console.log(pretty(r));
      else {
        for (const t of r.results) console.log(`${t.missing ? 'MISSING' : t.compiles && t.checks.every(c => c.pass) ? 'PASS   ' : t.compiles ? 'PARTIAL' : 'NO-BUILD'} ${t.id}${t.errors && t.errors.length ? '  ' + t.errors[0] : ''}${t.checks.filter(c => !c.pass).map(c => `\n        failed: ${c.name} (got ${JSON.stringify(c.got)}${c.why ? ', ' + c.why : ''})`).join('')}`);
        console.log(`\n${r.compiled}/${r.tasks} compile, ${r.solved}/${r.tasks} fully solved, ${r.checksPassed}/${r.checks} checks pass`);
      }
      break;
    }
    case 'examples': {
      core(); const dir = pos[0] || 'examples'; fs.mkdirSync(dir, { recursive: true });
      for (const [k, ex] of Object.entries(EXAMPLES)) {
        if (ex.film) { fs.writeFileSync(path.join(dir, `${k}.orrery`), ex.film); continue; }   /* chapters stay one .orrery file */
        if (o.single) { fs.writeFileSync(path.join(dir, `${k}.orrery`), core().joinProject(ex)); continue; }
        const d = path.join(dir, k); fs.mkdirSync(d, { recursive: true }); for (const f of ['scene', 'style', 'motion']) fs.writeFileSync(path.join(d, `${k}.${f}`), ex[f] || '');
      }
      console.log(`wrote ${Object.keys(EXAMPLES).length} examples to ${dir}`); break;
    }
    case 'join': {   /* three files -> one */
      const jp = readProject(pos[0]), txt = jp.film ? jp.text : core().joinProject(plain(jp));
      if (o.out) { fs.writeFileSync(o.out, txt); console.log('wrote ' + o.out); } else process.stdout.write(txt);
      break;
    }
    case 'split': {  /* one file -> three */
      if (!pos[0] || !pos[1]) throw usage('split needs an .orrery file and a folder: orrery split project.orrery out/');
      const pr = readProject(pos[0]); if (pr.film) throw usage('A project with chapters stays one .orrery file: each chapter has its own @scene, @style and @motion inside it.');
      if (pr.single && pr.single.issues.some(d => d.sev === "error")) { for (const d of pr.single.issues) console.log(fmtDiag(d.json())); process.exitCode = 1; break; }
      fs.mkdirSync(pos[1], { recursive: true }); const name = path.basename(pos[0]).replace(/\.orrery$/, '');
      for (const k of ['scene', 'style', 'motion']) fs.writeFileSync(path.join(pos[1], `${name}.${k}`), pr[k]);
      console.log(`wrote ${name}.scene, ${name}.style and ${name}.motion to ${pos[1]}`); break;
    }
    case 'format': {   /* beautify: lay the code out like CSS; only whitespace changes */
      if (!pos[0]) throw usage('format needs a project: orrery format project.orrery [--write]');
      const M = core(), st = fs.statSync(pos[0]);
      const fmtFile = (f, kind) => { const src = fs.readFileSync(f, 'utf8'), out = M.beautify(src, kind); if (o.write) { if (out !== src) { fs.writeFileSync(f, out); console.log('formatted ' + f); } else console.log('already tidy: ' + f); } else process.stdout.write(out); };
      if (st.isDirectory()) { for (const n of fs.readdirSync(pos[0])) { const k = (n.match(/\.(scene|style|motion)$/) || [])[1]; if (k) fmtFile(path.join(pos[0], n), k); else if (/\.orrery$/.test(n)) fmtFile(path.join(pos[0], n), 'project'); } }
      else { const k = (pos[0].match(/\.(scene|style|motion)$/) || [])[1]; fmtFile(pos[0], k || 'project'); }
      break;
    }
    case 'test': {   /* motion snapshots of every example */
      motionTest(pos[0] || path.join(__dirname, '..', 'examples'), pos[1] || path.join(__dirname, '..', 'tests', 'motion'), !!o.update); break;
    }
    case 'prompt': {
      const task = pos.join(' ').trim();
      console.log(aiPrompt(!!o.single, !!o.chapters, task) + (task ? '\n\nTASK\n' + task : '')); break;
    }
    case 'mcp': mcp(); break;
    case 'schema': console.log(JSON.stringify(schema(), null, 1)); break;
    case 'version': core(); console.log('Orrery ' + Orrery.version); break;
    default:
      console.log(`Orrery ${core().version} command-line tool

  orrery check    <project> [--json] [--fix [--suggestions]]
                                            compile and list problems (exit code 1 on errors);
                                            --fix applies the sure fixes problems carry, until none are left;
                                            --suggestions also applies the guesses ("Did you mean …?")
  orrery schema                             print the language as JSON: shapes, properties, values
  orrery sample   <project> [--at 0,1,2] [--points Crank.end.b] [--parts A,B] [--chapter Name]
                                            solve the motion and print positions as JSON
  orrery render   <project> -o out.mp4|.webm|.gif|.png|frames.zip|sound.wav
                                            [--width 480] [--fps 20] [--time 1.5] [--speak]: render with the studio's engine;
                                            --speak puts say: lines in MP4/WebM with a neural voice (experimental)
  orrery test     [examples] [snapshots] [--update]
                                            check that every example still moves as saved
  orrery format   <project> [--write]       beautify: lay the code out like CSS
  orrery eval     <tasks.json> <answers-folder> [--json]
                                            score AI answers against the task set
  orrery examples <folder> [--single]       write the studio's examples as projects
  orrery join     <project> [-o out.orrery]     combine three files into one
  orrery split    <project.orrery> <folder>     split a single file into three
  orrery prompt   [task words] [--single | --chapters]   print the AI prompt
  orrery mcp                                run as an MCP server for AI agents

A project is a folder with .scene, .style and .motion files, a single .orrery file (sections start with
@scene, @style and @motion; @common and @chapter Name lines make a project with chapters), a .orrery.json
file, or a .scene file.`);
  }
}
main().catch(e => { console.error(e.usage ? e.message : 'error: ' + (e.stack || e.message)); process.exitCode = 2; });
