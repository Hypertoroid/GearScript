#!/usr/bin/env node
/* Rebuilds vendor/fonts/*.js, the video fonts that ship with GearScript (all under the SIL Open Font License 1.1).
   Each family becomes one small script that the studio loads only when a project uses it, so text looks the same in
   the preview, in the offline copy and in every export, with or without internet.

   The fonts come from the Fontsource packages on npm:
     mkdir /tmp/f && cd /tmp/f && npm install @fontsource-variable/inter @fontsource-variable/montserrat \
       @fontsource-variable/oswald @fontsource-variable/playfair-display @fontsource-variable/space-grotesk \
       @fontsource-variable/caveat @fontsource-variable/jetbrains-mono @fontsource-variable/noto-sans-devanagari @fontsource/bebas-neue
     node scripts/make-fonts.js /tmp/f/node_modules

   The list of families must match WEBFONTS in studio.html. */
'use strict';
const fs = require('fs'), path = require('path');
const src = process.argv[2]; if (!src) { console.error('usage: node scripts/make-fonts.js <node_modules folder with the Fontsource packages>'); process.exit(2); }
const out = path.join(__dirname, '..', 'vendor', 'fonts');
const FAMILIES = [
  // id, display name, package, files (subset: file name part)
  ['inter', 'Inter', '@fontsource-variable/inter', ['latin-wght-normal']],
  ['montserrat', 'Montserrat', '@fontsource-variable/montserrat', ['latin-wght-normal']],
  ['oswald', 'Oswald', '@fontsource-variable/oswald', ['latin-wght-normal']],
  ['bebas-neue', 'Bebas Neue', '@fontsource/bebas-neue', ['latin-400-normal']],
  ['playfair-display', 'Playfair Display', '@fontsource-variable/playfair-display', ['latin-wght-normal']],
  ['space-grotesk', 'Space Grotesk', '@fontsource-variable/space-grotesk', ['latin-wght-normal']],
  ['caveat', 'Caveat', '@fontsource-variable/caveat', ['latin-wght-normal']],
  ['jetbrains-mono', 'JetBrains Mono', '@fontsource-variable/jetbrains-mono', ['latin-wght-normal']],
  ['noto-sans-devanagari', 'Noto Sans Devanagari', '@fontsource-variable/noto-sans-devanagari', ['devanagari-wght-normal', 'latin-wght-normal']],
];
fs.mkdirSync(out, { recursive: true });
const licences = [];
for (const [id, name, pkg, parts] of FAMILIES) {
  const dir = path.join(src, pkg), meta = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const css = fs.readFileSync(path.join(dir, 'index.css'), 'utf8');
  const faces = parts.map(p => {
    const file = fs.readdirSync(path.join(dir, 'files')).find(f => f.endsWith(`-${p}.woff2`));
    if (!file) throw new Error(`${pkg}: no file for ${p}`);
    const block = css.split('@font-face').find(b => b.includes(file)) || '';
    const range = ((block.match(/unicode-range:\s*([^;]+);/) || [])[1] || '').trim();
    const weight = ((block.match(/font-weight:\s*([^;]+);/) || [])[1] || '400').trim();
    return { weight, range, data: fs.readFileSync(path.join(dir, 'files', file)).toString('base64') };
  });
  const js = `/* ${name}, SIL Open Font License 1.1, from ${pkg} ${meta.version} (Fontsource). See vendor/fonts/FONTS-LICENSE.txt. Built by scripts/make-fonts.js. */\n`
    + `(window.GEARSCRIPT_WEBFONTS = window.GEARSCRIPT_WEBFONTS || {})[${JSON.stringify(id)}] = ${JSON.stringify(faces)};\n`;
  fs.writeFileSync(path.join(out, id + '.js'), js);
  const lic = fs.readFileSync(path.join(dir, 'LICENSE'), 'utf8').trim();
  licences.push(`==== ${name} (${pkg} ${meta.version}) ====\n\n${lic}\n`);
  console.log(`${id}.js  ${(js.length / 1024).toFixed(0)} KB`);
}
fs.writeFileSync(path.join(out, 'FONTS-LICENSE.txt'), 'The fonts in vendor/fonts are used under the SIL Open Font License 1.1. Each file is a font from the\nFontsource project (https://fontsource.org), stored as base64 inside a script. Their copyright notices and licences follow.\n\n' + licences.join('\n'));
