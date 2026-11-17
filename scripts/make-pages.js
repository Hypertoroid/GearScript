#!/usr/bin/env node
/* Builds the site's content pages (why, gallery, educators, researchers, ai, about, careers, whats-new) from the bodies in
   scripts/pages/ and one shared layout, so they keep the same header, footer and look. whats-new.html is made from CHANGELOG.md,
   so run this again after editing the changelog. Run from the project folder: node scripts/make-pages.js
   Each page is one self-contained file (styles inline), like the other pages, so the service worker never serves a stale stylesheet. */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const SITE = 'https://gearscript.org/';

/* the logo and the favicon come from the home page, so a brand change there reaches every page */
const home = read('index.html');
const LOGO = home.match(/<a class="logo"[\s\S]*?<\/a>/)[0];
const ICON = home.match(/<link rel="icon"[^>]*>/)[0];
/* no visit counter here: privacy.html says only the home page and the studio are counted */

const PAGES = [
  { file: 'why.html', nav: 'Why', title: 'Why GearScript', og: 'why',
    description: 'Why describe a machine instead of animating it: how GearScript compares with Blender, After Effects, Manim, CAD and AI video generators, when not to use it, and answers to common questions.' },
  { file: 'gallery.html', nav: 'Gallery', title: 'Gallery', og: 'gallery',
    description: 'Engines, clocks, robots, linkages and scenes made with GearScript. Each one opens in the studio, ready to change.' },
  { file: 'educators.html', nav: 'Educators', title: 'GearScript for educators', og: 'educators',
    description: 'Show how things work and let students build them: moving lessons in physics, engineering and maths, narrated explainers, 3D models for your course page, and assignments that check themselves. Free, no accounts.' },
  { file: 'researchers.html', nav: 'Researchers', title: 'GearScript for researchers', og: 'researchers',
    description: 'Figures, supplementary videos and interactive 3D models for papers, made from a text file you can keep in your repository and render again. With kinematic checks and a citation.' },
  { file: 'ai.html', nav: 'AI', title: 'GearScript for AI', og: 'ai',
    description: 'A language AI models can write, check and fix: a syntax prompt, a JSON schema, numbered errors with fixes, patches, an MCP server, motion sampling and an evaluation set.' },
  { file: 'about.html', title: 'About', og: 'about',
    description: 'Who makes GearScript, why it exists, and how to get in touch.' },
  { file: 'careers.html', title: 'Careers', og: 'careers',
    description: 'Open roles at GearScript: LLM Engineer, to build a model that writes GearScript from a plain request.' },
  { file: 'whats-new.html', title: 'What’s new', og: 'whats-new',
    description: 'Every change to GearScript, newest first.' },
];
const NAV = PAGES.filter(p => p.nav);
/* the gallery: each example has a silent clip and a poster in gallery/ (made from the studio's built-in examples) */
const GALLERY = [
  ['v8', 'V8 engine', 'A cross-plane V8, cut away. One rotate line turns the crankshaft; the eight pistons are solved.'],
  ['clockwork', 'Skeleton wall clock', 'Assembled part by part, then started.'],
  ['robot', 'Walking robot', 'A humanoid robot walking in place on a treadmill.'],
  ['locomotive', 'Steam locomotive', 'Built only from library shapes. One speed is written; the rods follow.'],
  ['gearbox', 'How a gearbox works', 'Three chapters, joined into one film.'],
  ['hydraulic', 'Hydraulic cylinder', 'A section plane slides in, then the piston strokes inside the barrel.'],
  ['lighthouse', 'Lighthouse at dusk', 'The lamp turns, the beam sweeps the sea, the windows light up one by one.'],
  ['windmill', 'Windmill at dawn', 'The sails turn in the breeze as the sun comes up.'],
  ['eagle', 'Eagle in flight', 'It circles its prey, and the camera rides just behind it.'],
  ['solar', 'Solar system', 'Orbits within orbits, compressed so the motion reads.'],
  ['satellite', 'Satellite', 'Earth turns while a satellite circles it among the stars.'],
  ['turbines', 'Wind turbines', 'Three rotors on a ridge at sunset, each at its own speed.'],
  ['wiper', 'Windscreen wiper', 'A motor crank drives a four-bar linkage.'],
  ['linkage', 'Four-bar linkage', 'Only the crank is driven; the solver moves the coupler and rocker.'],
  ['car', 'Car', 'Built only from library shapes. No car primitive.'],
  ['arm', 'Two-link arm', 'A turntable arm: each hinge rides on the part below it.'],
  ['pendulum', 'Pendulum', 'One hinge, two motion blocks and an arrow for gravity.'],
];
function galleryHtml() {
  const have = GALLERY.filter(([id]) => fs.existsSync(path.join(root, 'gallery', id + '.mp4')) && fs.existsSync(path.join(root, 'gallery', id + '.webp')));
  const missing = GALLERY.filter(g => !have.includes(g)).map(g => g[0]);
  if (missing.length) console.warn('gallery: no clip yet for ' + missing.join(', ') + ' (left out)');
  return have.map(([id, t, d]) => `<a class="gcard" href="studio.html?example=${id}"><video muted loop playsinline preload="none" poster="gallery/${id}.webp" aria-label="${esc(t)}, a short silent preview"><source src="gallery/${id}.mp4" type="video/mp4"></video><span class="meta"><b>${esc(t)}</b><span>${esc(d)}</span><i>Open in the studio \u2192</i></span></a>`).join('\n');
}
/* values from site-config.js and the tool's version, for {{owner}} and friends in the page bodies */
const CFG = (() => { const w = {}; new Function('window', read('site-config.js'))(w); return w.GEARSCRIPT_SITE || {}; })();
const VERSION = JSON.parse(read('cli/package.json')).version;
function fill(body) {
  const owner = CFG.owner || '', parts = owner.trim().split(/\s+/), last = parts.length > 1 ? parts.pop() : owner, first = parts.join(' ');
  const vals = { owner, ownerLast: last, ownerFirst: first, year: String(CFG.year || new Date().getFullYear()), version: VERSION };
  return body.replace(/\{\{gallery\}\}/g, () => galleryHtml()).replace(/\{\{(owner|ownerLast|ownerFirst|year|version)\}\}/g, (m, k) => esc(vals[k]))
    .replace(/\\u2019/g, '\u2019');   /* \u2019 written in a page body becomes a real apostrophe */
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
:root {
  --void: #04060c; --deep: #070b16; --panel: rgba(14, 20, 36, 0.62); --panel-2: rgba(20, 28, 50, 0.55); --line: rgba(160, 180, 220, 0.14); --line-2: rgba(160, 180, 220, 0.26);
  --star: #eef2fb; --fg: #e6ebf5; --fg-2: #aab4c8; --fg-3: #7d889e; --sun: #ffb84d; --sun-2: #ffd89a; --sun-soft: rgba(255, 184, 77, 0.12); --sky: #6fc3ff;
  --display: 'Inter Tight', 'Inter', 'Segoe UI', system-ui, sans-serif; --sans: 'Inter', 'Segoe UI', system-ui, sans-serif; --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --ease: cubic-bezier(.22, .8, .18, 1); color-scheme: dark;
}
* { box-sizing: border-box; }
html { scroll-padding-top: 90px; }
html, body { margin: 0; color: var(--fg); background: var(--void); }
body { font-family: var(--sans); font-size: 17px; line-height: 1.7; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  background: radial-gradient(1100px 620px at 82% -12%, rgba(111, 195, 255, 0.09), transparent 62%), radial-gradient(900px 520px at 8% -8%, rgba(255, 184, 77, 0.07), transparent 60%), var(--void); }
a { color: var(--sun-2); text-underline-offset: 3px; }
a:hover { color: var(--sun); }
::selection { background: var(--sun); color: #1a1206; }
:focus-visible { outline: 2px solid var(--sun); outline-offset: 3px; border-radius: 6px; }
.skip { position: absolute; left: -999px; top: 8px; background: var(--sun); color: #1b1305; padding: 8px 14px; border-radius: 8px; z-index: 50; }
.skip:focus { left: 12px; }
/* top bar */
nav.top { position: sticky; top: 0; z-index: 30; background: rgba(4, 6, 12, 0.74); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid var(--line); }
nav.top .in { max-width: 1240px; margin: 0 auto; display: flex; align-items: center; gap: 26px; height: 68px; padding: 0 max(24px, env(safe-area-inset-right, 0px)) 0 max(24px, env(safe-area-inset-left, 0px)); }
.logo { display: inline-flex; align-items: center; gap: 11px; text-decoration: none; color: var(--fg); }
.logo svg { width: 28px; height: 28px; }
.logo b { font-family: "Inter", system-ui, sans-serif; font-weight: 600; font-size: 20px; letter-spacing: -0.012em; }
.logo b span { color: #f2bd3d; }
nav.top .links { display: flex; gap: 22px; flex: 1; justify-content: flex-end; }
nav.top .links a { text-decoration: none; color: var(--fg-2); font-size: 15px; white-space: nowrap; transition: color .2s; }
nav.top .links a:hover, nav.top .links a[aria-current="page"] { color: var(--fg); }
nav.top .links a[aria-current="page"] { box-shadow: inset 0 -2px 0 var(--sun); }
.btn { display: inline-flex; align-items: center; gap: 10px; height: 48px; padding: 0 24px; border-radius: 999px; text-decoration: none; font-weight: 500; font-size: 16px; white-space: nowrap; border: 1px solid transparent; transition: transform .25s var(--ease), box-shadow .25s, border-color .25s; }
.btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform .25s var(--ease); }
.btn:hover svg { transform: translateX(3px); }
.btn.sun { background: var(--sun); color: #1b1305; }
.btn.sun:hover { color: #1b1305; box-shadow: 0 0 36px rgba(255, 184, 77, 0.35); transform: translateY(-1px); }
.btn.ghost { border-color: var(--line-2); color: var(--fg); background: rgba(10, 14, 26, 0.4); }
.btn.ghost:hover { border-color: var(--fg-2); color: var(--fg); }
.btn.small { height: 40px; padding: 0 18px; font-size: 15px; }
/* page */
main { display: block; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 0 max(24px, env(safe-area-inset-right, 0px)) 0 max(24px, env(safe-area-inset-left, 0px)); }
.narrow > * { max-width: 780px; }   /* a narrower column, still lined up with the page's left edge */
.hero { padding: 88px 0 24px; }
.kick { font-family: var(--mono); font-size: 12.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sun); display: flex; align-items: center; gap: 14px; margin: 0 0 22px; }
.kick::before { content: ""; width: 28px; height: 1px; background: currentColor; opacity: .7; }
h1, h2, h3 { font-family: var(--display); color: var(--star); letter-spacing: -0.022em; text-wrap: balance; }
h1 { font-size: clamp(40px, 5.4vw, 68px); line-height: 1.05; font-weight: 700; margin: 0; }
h2 { font-size: clamp(28px, 3.1vw, 40px); line-height: 1.12; font-weight: 700; margin: 0 0 14px; }
h3 { font-size: 19px; line-height: 1.3; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.01em; }
h1 em, h2 em { font-style: normal; color: var(--sun-2); }
.lede { font-size: clamp(17px, 1.5vw, 20px); color: var(--fg-2); max-width: 40em; margin: 26px 0 0; }
.ctas { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 34px; }
section.block { padding: 72px 0 0; }
section.block > .wrap > p, .prose p, .prose li { color: var(--fg-2); }
section.block > .wrap > p { max-width: 46em; }
.sub { color: var(--fg-2); max-width: 46em; margin: 0 0 28px; }
.grid { display: grid; gap: 18px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid.five { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.grid.five .card { padding: 18px; }
.card { background: linear-gradient(180deg, var(--panel-2), rgba(9, 13, 24, 0.78)); border: 1px solid var(--line); border-radius: 16px; padding: 24px 24px 22px; }
.card p { margin: 0; color: var(--fg-2); font-size: 15.5px; line-height: 1.65; }
.card p + p { margin-top: 10px; }
.card .ico { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--sun-soft); margin-bottom: 16px; }
.card .ico svg { width: 22px; height: 22px; fill: none; stroke: var(--sun); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.card .go { display: inline-block; margin-top: 14px; font-size: 14.5px; }
.card ul { margin: 10px 0 0; padding-left: 18px; color: var(--fg-2); font-size: 15.5px; }
.card li + li { margin-top: 4px; }
code { font-family: var(--mono); font-size: .88em; background: rgba(160, 180, 220, 0.1); border: 1px solid var(--line); border-radius: 6px; padding: 1px 6px; color: var(--fg); }
pre.code { margin: 18px 0 0; padding: 18px 20px; background: rgba(9, 13, 24, 0.85); border: 1px solid var(--line); border-radius: 14px; font: 14px/1.75 var(--mono); color: var(--fg); overflow-x: auto; white-space: pre; }
pre.code code { background: none; border: 0; padding: 0; font-size: inherit; }
pre.code .n { color: #8fd3ff; } pre.code .k { color: var(--sun); } pre.code .c { color: var(--fg-3); font-style: italic; } pre.code .v { color: #c9b6ff; } pre.code .s { color: #a8e6a1; }
/* comparison table: rows become cards on phones */
table.compare { width: 100%; border-collapse: collapse; font-size: 15.5px; }
table.compare th { text-align: left; font: 500 12px/1.4 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3); padding: 0 16px 12px 0; }
table.compare td { vertical-align: top; padding: 18px 16px 18px 0; border-top: 1px solid var(--line); color: var(--fg-2); }
table.compare td:first-child { color: var(--star); font-weight: 600; width: 22%; }
table.compare td:first-child span { display: block; font-weight: 400; color: var(--fg-3); font-size: 14px; }
table.compare td.gs { color: var(--fg); }
.note { border: 1px solid var(--line-2); background: linear-gradient(90deg, rgba(255, 184, 77, 0.07), transparent); border-radius: 16px; padding: 22px 24px; }
.note h3 { margin-bottom: 6px; }
.note ul { margin: 8px 0 0; padding-left: 20px; color: var(--fg-2); }
.note li + li { margin-top: 6px; }
/* questions */
details.faq { border-top: 1px solid var(--line); }
details.faq:last-of-type { border-bottom: 1px solid var(--line); }
details.faq summary { cursor: pointer; list-style: none; padding: 18px 40px 18px 0; position: relative; font: 600 18px/1.4 var(--display); color: var(--star); }
details.faq summary::-webkit-details-marker { display: none; }
details.faq summary::after { content: "+"; position: absolute; right: 6px; top: 14px; font: 400 26px/1 var(--sans); color: var(--sun); transition: transform .25s var(--ease); }
details.faq[open] summary::after { transform: rotate(45deg); }
details.faq p { margin: 0 0 18px; color: var(--fg-2); max-width: 46em; }
/* steps */
ol.steps { list-style: none; counter-reset: s; padding: 0; margin: 0; display: grid; gap: 14px; }
ol.steps li { counter-increment: s; position: relative; padding: 2px 0 2px 52px; color: var(--fg-2); }
ol.steps li::before { content: counter(s, decimal-leading-zero); position: absolute; left: 0; top: 0; font: 600 15px/30px var(--mono); color: var(--sun); width: 38px; height: 30px; border: 1px solid var(--line-2); border-radius: 8px; text-align: center; }
ol.steps li b { color: var(--star); font-weight: 600; }
/* gallery */
.gallery { display: grid; gap: 20px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.gcard { display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; border: 1px solid var(--line); background: linear-gradient(180deg, rgba(20, 28, 50, 0.7), rgba(9, 13, 24, 0.85)); text-decoration: none; color: inherit; transition: transform .35s var(--ease), border-color .35s, box-shadow .35s; }
.gcard:hover { transform: translateY(-4px); border-color: rgba(255, 184, 77, 0.5); box-shadow: 0 22px 50px rgba(0, 0, 0, 0.45); color: inherit; }
.gcard video, .gcard img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: var(--deep); }
.gcard .meta { padding: 14px 18px 18px; border-top: 1px solid var(--line); }
.gcard .meta b { display: block; font: 600 17px/1.35 var(--display); color: var(--star); }
.gcard .meta span { display: block; margin-top: 4px; font-size: 14.5px; line-height: 1.55; color: var(--fg-2); }
.gcard .meta i { display: inline-block; margin-top: 10px; font: normal 500 13px/1 var(--mono); letter-spacing: .06em; color: var(--sun); }
/* long text pages */
.prose { max-width: 780px; }
.prose h2 { font-size: clamp(24px, 2.4vw, 30px); margin: 48px 0 12px; }
.prose h3 { margin: 28px 0 8px; }
.prose ul { padding-left: 22px; }
.prose li + li { margin-top: 6px; }
.prose li b, .prose p b { color: var(--fg); font-weight: 600; }
.release { border-top: 1px solid var(--line); padding-top: 8px; margin-top: 40px; }
.release h2 { margin-top: 28px; }
.release h3 { font: 500 12.5px/1.4 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--sun); margin: 26px 0 6px; }
/* closing call */
.closing { margin: 96px 0 0; padding: 44px 40px; border-radius: 22px; border: 1px solid var(--line-2); background: radial-gradient(600px 260px at 85% 0%, rgba(255, 184, 77, 0.14), transparent 70%), linear-gradient(180deg, rgba(20, 28, 50, 0.8), rgba(9, 13, 24, 0.9)); }
.closing h2 { margin: 0; }
.closing p { color: var(--fg-2); margin: 12px 0 0; max-width: 40em; }
/* footer */
footer.site { margin-top: 110px; border-top: 1px solid var(--line); background: rgba(4, 7, 14, 0.7); }
footer.site .cols { display: grid; grid-template-columns: 1.4fr repeat(4, minmax(0, 1fr)); gap: 28px; padding: 48px 0 30px; }
footer.site h4 { margin: 0 0 12px; font: 500 12px/1.4 var(--mono); letter-spacing: .16em; text-transform: uppercase; color: var(--fg-3); }
footer.site ul { list-style: none; margin: 0; padding: 0; }
footer.site li { margin: 0 0 8px; }
footer.site a { color: var(--fg-2); text-decoration: none; font-size: 15px; }
footer.site a:hover { color: var(--fg); }
footer.site .logo { color: var(--fg); }
footer.site .tag { color: var(--fg-3); font-size: 14.5px; margin: 14px 0 0; max-width: 22em; }
footer.site .base { display: flex; flex-wrap: wrap; gap: 8px 20px; border-top: 1px solid var(--line); padding: 18px 0 30px; color: var(--fg-3); font-size: 13.5px; }
footer.site .base a { font-size: 13.5px; color: var(--fg-3); }
@media (max-width: 960px) {
  .grid, .gallery, .grid.five { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  footer.site .cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  footer.site .brand { grid-column: 1 / -1; }
}
@media (max-width: 860px) {
  body { font-size: 16px; }
  nav.top .in { height: auto; flex-wrap: wrap; gap: 0 16px; padding-top: 12px; }
  nav.top .links { order: 3; flex: 0 0 100%; justify-content: flex-start; overflow-x: auto; gap: 20px; padding: 10px 0 12px; scrollbar-width: none; }
  nav.top .links::-webkit-scrollbar { display: none; }
  nav.top .studio { margin-left: auto; }
  .hero { padding-top: 54px; }
  section.block { padding-top: 56px; }
  table.compare thead { display: none; }
  table.compare, table.compare tbody, table.compare tr, table.compare td { display: block; width: 100% !important; }
  table.compare tr { border-top: 1px solid var(--line); padding: 14px 0; }
  table.compare td { border: 0; padding: 4px 0; }
  table.compare td[data-h]::before { content: attr(data-h); display: block; font: 500 11.5px/1.6 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--fg-3); }
  .closing { padding: 30px 22px; margin-top: 72px; }
}
@media (max-width: 600px) {
  .grid, .grid.two, .grid.five, .gallery { grid-template-columns: 1fr; }
  pre.code { font-size: 12.5px; padding: 14px; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function layout(p, body) {
  const url = SITE + p.file, img = `${SITE}brand/og/${p.og}.jpg`;
  const fullTitle = `${p.title} · GearScript`;
  const nav = NAV.map(n => `<a href="${n.file}"${n.file === p.file ? ' aria-current="page"' : ''}>${esc(n.nav)}</a>`).join('') + '<a href="help.html">Docs</a>';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="theme-color" content="#05070d">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GearScript">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="640">
<meta property="og:image:alt" content="${esc(p.title)}: GearScript">
<meta name="twitter:card" content="summary_large_image">
<!-- generated by scripts/make-pages.js from scripts/pages/${p.file}: edit that file and run the script again -->
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="brand/app-192.png">
${ICON}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,500..700&family=Inter+Tight:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<nav class="top" aria-label="Main"><div class="in">
  ${LOGO}
  <div class="links">${nav}</div>
  <a class="btn sun small studio" href="studio.html">Open the Studio ${arrow}</a>
</div></nav>
<main id="main">
${body.trim()}
</main>
<footer class="site"><div class="wrap">
  <div class="cols">
    <div class="brand">${LOGO.replace('class="logo"', 'class="logo" tabindex="-1"')}<p class="tag">Describe mechanisms in a CSS-like language. Watch them move.</p></div>
    <div><h4>Product</h4><ul><li><a href="studio.html">Studio</a></li><li><a href="gallery.html">Gallery</a></li><li><a href="help.html">Documentation</a></li><li><a href="whats-new.html">What’s new</a></li></ul></div>
    <div><h4>Use it for</h4><ul><li><a href="educators.html">Teaching</a></li><li><a href="researchers.html">Research</a></li><li><a href="ai.html">AI and agents</a></li></ul></div>
    <div><h4>Project</h4><ul><li><a href="why.html">Why GearScript</a></li><li><a href="about.html">About</a></li><li><a href="careers.html">Careers</a></li><li><a data-site="repoUrl" href="#" hidden>Source code</a></li><li><a data-site="coffeeUrl" href="#" hidden>Buy me a coffee</a></li></ul></div>
    <div><h4>Legal</h4><ul><li><a href="privacy.html">Privacy</a></li><li><a href="terms.html">Terms</a></li><li><a href="LICENSE">Licence</a></li></ul></div>
  </div>
  <div class="base"><span>© <span data-site="year">2026</span> <span data-site="owner"></span></span><span>Open source under the Apache License 2.0</span></div>
</div></footer>
<script src="site-config.js"></script>
<script>
(function () {
  var S = Object.assign({ owner: '', contactEmail: '', year: new Date().getFullYear(), coffeeUrl: '', repoUrl: '' }, window.GEARSCRIPT_SITE || {});
  document.querySelectorAll('[data-site]').forEach(function (el) {
    var k = el.getAttribute('data-site'), v = S[k];
    if (k === 'contactEmail') { el.textContent = v; if (el.tagName === 'A') el.href = 'mailto:' + v + (el.dataset.subject ? '?subject=' + encodeURIComponent(el.dataset.subject) : ''); }
    else if (k === 'repoUrl' || k === 'coffeeUrl') { if (v && !/yourname|your-org/.test(v)) { el.href = v; el.hidden = false; } }
    else el.textContent = v;
  });
})();
</script>${p.script || ''}
</body>
</html>
`;
}

/* ---------- What's new: CHANGELOG.md to HTML (the subset it uses: headings, paragraphs, lists, bold, code, links) ---------- */
function inline(s) {
  /* code spans are set aside first, so bold and links can run across them ("**the `Image` part.**") */
  const codes = [];
  let t = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  t = esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, u) => `<a href="${u.replace(/&amp;/g, '&')}">${a}</a>`);
  return t.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${esc(codes[+i])}</code>`);
}
function changelogHtml(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  let out = '', para = [], items = null, cur = null, inRelease = false;
  const flushPara = () => { if (para.length) { out += `<p>${inline(para.join(' '))}</p>\n`; para = []; } };
  const flushList = () => { if (items) { if (cur !== null) items.push(cur); out += '<ul>\n' + items.map(i => `<li>${inline(i)}</li>`).join('\n') + '\n</ul>\n'; items = null; cur = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^# /.test(line)) continue;   /* the file's own title */
    let m;
    if ((m = line.match(/^## (.+)/))) { flushPara(); flushList(); if (inRelease) out += '</section>\n'; inRelease = true; const t = m[1].trim(), id = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); out += `<section class="release" id="${id}">\n<h2>${inline(t)}</h2>\n`; continue; }
    if ((m = line.match(/^### (.+)/)) || (m = line.match(/^\*\*([^*]+)\*\*$/))) { flushPara(); flushList(); out += `<h3>${inline(m[1].trim())}</h3>\n`; continue; }
    if ((m = line.match(/^[-*] (.*)/))) { flushPara(); if (!items) items = []; if (cur !== null) items.push(cur); cur = m[1]; continue; }
    if (cur !== null && /^\s{2,}\S/.test(line)) { cur += ' ' + line.trim(); continue; }
    if (!line.trim()) { flushPara(); flushList(); continue; }
    flushList(); para.push(line.trim());
  }
  flushPara(); flushList(); if (inRelease) out += '</section>\n';
  return out;
}

/* ---------- build ---------- */
const pagesDir = path.join(__dirname, 'pages');
let wrote = 0;
for (const p of PAGES) {
  let body;
  if (p.file === 'whats-new.html') {
    body = `<div class="wrap"><header class="hero narrow"><div class="kick">What’s new</div><h1>Every change, <em>newest first</em>.</h1>
<p class="lede">GearScript is in beta, and it changes often. This page is made from the project’s changelog. Until 1.0, the language may still change; from 1.0 on, projects that work keep working.</p></header>
<div class="prose">${changelogHtml(read('CHANGELOG.md'))}</div></div>`;
  } else body = fill(fs.readFileSync(path.join(pagesDir, p.file), 'utf8'));
  const sm = body.match(/<script data-page>[\s\S]*?<\/script>/);   /* a page's own script goes after the shared one */
  if (sm) { body = body.replace(sm[0], ''); p.script = '\n' + sm[0].replace(' data-page', ''); }
  fs.writeFileSync(path.join(root, p.file), layout(p, body)); wrote++;
}
console.log(`wrote ${wrote} pages: ${PAGES.map(p => p.file).join(', ')}`);
