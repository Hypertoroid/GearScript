#!/usr/bin/env node
/* Before publishing: catches the things that are easy to forget. Run from the project folder: node scripts/release-check.js */
'use strict';
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const problems = [], notes = [];
/* site settings */
global.window = {}; new Function('window', read('site-config.js'))(global.window); const S = global.window.ORRERY_SITE || {};
if (!S.owner) problems.push('site-config.js: owner is empty');
if (!S.contactEmail || /example\.(com|org)$/.test(S.contactEmail)) problems.push(`site-config.js: contactEmail is a placeholder (${S.contactEmail})`);
if (!S.coffeeUrl || /yourname/.test(S.coffeeUrl)) notes.push('site-config.js: coffeeUrl is a placeholder, so the coffee links stay hidden');
if (!S.repoUrl || /your-org/.test(S.repoUrl)) problems.push('site-config.js: repoUrl is a placeholder (' + (S.repoUrl || 'empty') + '); the header GitHub button links to it');
/* one version everywhere */
const v = (read('studio.html').match(/version: '([\w.-]+)'/) || [])[1];
const cli = JSON.parse(read('cli/package.json')).version, sw = (read('sw.js').match(/orrery-([\w.-]+)'/) || [])[1], log = ((read('CHANGELOG.md').match(/^## ([\d.]+(?: beta)?)/m) || [])[1] || '').replace(/^(\d+\.\d+) beta$/, '$1.0-beta');
const same = (a, b) => a && b && (a === b || b.startsWith(a + '.') || a.startsWith(b + '.'));
if (!same(v, cli)) problems.push(`versions differ: studio ${v}, cli/package.json ${cli}`);
if (!same(v, sw)) problems.push(`versions differ: studio ${v}, sw.js cache ${sw} (bump it, or installed apps keep the old files)`);
if (!same(v, log)) problems.push(`versions differ: studio ${v}, CHANGELOG ${log}`);
/* legal pages are templates until someone has read them */
for (const f of ['privacy.html', 'terms.html']) if (/TEMPLATE|template|Replace this/i.test(read(f))) notes.push(`${f} still reads as a template: have it reviewed for your country before launch`);
/* bundled files present */
for (const f of ['vendor/three.min.js', 'vendor/OrbitControls.js', 'vendor/codemirror6.js', 'vendor/GLTFLoader.js', 'vendor/mp4-muxer.js', 'vendor/webm-muxer.js', 'manifest.webmanifest', 'sw.js'])
  if (!fs.existsSync(path.join(root, f))) problems.push(`missing ${f}`);
/* the AI prompt must cover the whole language: every shape, property, block property, motion property and style key */
{
  const html = read('studio.html'), P = (html.match(/const AI_PROMPT = `([\s\S]*?)`;/) || [])[1] || '';
  const line = (n) => { const i = html.indexOf(n); return i < 0 ? '' : html.slice(i + n.length, html.indexOf('\n', i)).replace(/;\s*$/, ''); };
  const shapes = new Function('return ' + (html.match(/const SHAPES = (\{[\s\S]*?\n\});/) || [])[1])();
  const styleKeys = new Function('return ' + line('const STYLE_KEYS = '))(), special = new Function('return ' + line('const SPECIAL_PROPS = '))(), motion = new Function('return ' + line('const PART_MOTION = '))();
  const missing = [];
  for (const [t, d] of Object.entries(shapes)) { if (!new RegExp('\\b' + t + '\\b').test(P)) missing.push(t); for (const p of d.props) if (!P.includes(p)) missing.push(t + '.' + p); }
  for (const k of styleKeys) if (!P.includes(k)) missing.push('style ' + k);
  for (const [b, ps] of Object.entries(special)) for (const p of ps) if (!P.includes(p)) missing.push(b + '.' + p);
  for (const k of motion) if (!P.includes(k)) missing.push('motion ' + k);
  if (missing.length) problems.push(`the AI prompt (AI_PROMPT in studio.html) does not mention: ${missing.join(', ')}. Add them whenever a feature is added`);
}
for (const n of notes) console.log('note     ' + n);
for (const p of problems) console.log('PROBLEM  ' + p);
console.log(problems.length ? `\n${problems.length} problem(s) to fix before release` : '\nready, apart from the notes above');
process.exitCode = problems.length ? 1 : 0;
