# Changelog

## Unreleased

- **Orrery is now GearScript.** Projects are `.gscript` files that start with `@gearscript 1`; the command line is `gearscript` (cli/gearscript.js), the MCP tools are `gearscript_*`, AI replies use `gearscript` code blocks, and the schema is docs/gearscript-schema.json. There is no support for the old `.orrery` format or the old saved settings: this is a clean break.
- **New logo and brand files:** a silver gear whose ring opens into a gold G, drawn as vectors (logo-mark.svg, a simpler logo-mark-small.svg for small sizes, app-icon.svg, app-maskable.svg) with PNGs for app icons, a 1080-wide logo for light and dark backgrounds, a 1280x640 social preview, and a crop of the original render. The wordmark is Inter SemiBold, with Script in gold; scripts/make-brand.py rebuilds the set.
- **Type:** the home page uses one family, Inter (Inter Tight for headings), with JetBrains Mono for code, instead of five; the wordmark in every page header is Inter SemiBold.
- **404 page:** 404.html, with 4, a turning gear for the 0 and a gold gear meshing on top (it stands still with reduced motion). It finds the site's folder by itself, so its links work at any address; the bundled server sends it for missing pages.
- **Guide is now Documentation** in the home page, the studio's menu, the footers and the page itself.
- Tours: a welcome card offers an **interactive tour** (recommended) or a quick one. The interactive tour walks through the whole workflow on a scratch crane project with a simulated AI: AI prompt, paste, Problems and Copy as JSON, the timeline and Copy state, then Export. The visitor clicks the real buttons; their project, settings and undo history come back afterwards.
- A **?** button in the header opens the tours. The quick tour is down to seven stops and leads with AI prompt.
- No length limit: animations and chapters can run as long as you like (W0503, which cut them at 120 s, is gone). Video exports run to 20 minutes at 30 fps, for a single animation as for a film.
- Common slips in AI replies now build, each with a one-click **Fix**: a missing `@scene` line (W0148, also under `@common` and chapter lines), an unquoted chapter title (W0149), and a group member written `A::Sphere` (W0109). Clearer errors for style or motion written in the scene, blocks inside blocks, and a chapter using another chapter's parts or voices.
- Pasting a whole AI reply (with its prose and code fences) keeps only the code; three blocks labelled scene, style and motion fill the three sections.
- Problems found in other chapters showed an empty message, and their fixes could not be applied. Both work now.
- The AI prompt warns against these slips.
- **Neural narration in videos works again.** The voice library's ONNX Runtime came from the newest release, but its WebAssembly files from 1.18.0, so it failed with "no available backend found". It now uses that release's own files. Each voice gets its own session (a second voice used to reuse the first one's model), and a failed start no longer sticks until reload. The site server's security policy now allows what it needs: compiling WebAssembly, its workers, and downloads from the CDNs and huggingface.co.
- **Playback speed applies to sound:** at 0.5x or 2x, sounds and spoken lines play at the same speed as the picture.
- **Film is the default** for projects with chapters (the choice is remembered); clicking a chapter while the film plays moves the film there. The green underline on chapters is gone.
- **Export:** "Speak them into the video" is ticked by default (`gearscript render` still needs `--speak`). The spoken-lines row is laid out in lines instead of running together. After a render, changing the code or a setting shows an **Out of date** warning and dims the render; Save becomes "Save the earlier render" instead of being disabled, and the main button reads Render again. Turning speech on or off now counts as a change.
- The AI prompt suggests fonts that show everywhere (sans, serif, mono, or "IBM Plex Sans", which the studio always loads) rather than Helvetica or Calibri. "No problems" fits on one line, and Copy hides when there is nothing to copy.
- **Problems panel for long lists:** every row has its action in the same column (Fix, Fix with a **?** badge for a guess, or Ask AI), and the suggested word is in bold in the message ("Did you mean **Gear**?"). Repeats of one problem are a single row with ×n that opens to their places; its Fix fixes them all. Chips filter by errors, warnings or fixable.
- **Copy as JSON / Copy with code:** a split button. While the code is as last pasted (or as the site's AI wrote it), the default is the problems alone; once it has been edited, the default is a message ready to send with the problems and the code, in the reply format. Problem lines in it match the code the AI sees.
- **Prompt AI** (was AI prompt): a box to include the problems, ticked when there are any, so the AI fixes them first. The prompt brings the narration and chapter rules only when the request or the code uses them, and ends with a checklist of common slips. With chapters, **Ask about: This chapter** sends @common and the chapter on screen and asks for that chapter back.
- **Chapters:** a reply or paste with chapters is merged by chapter name (replace, add, keep the rest), with one Undo; when it would change more than one chapter, a dialog lists them so you can keep yours. The chapter strip is a timeline: blocks as wide as the chapters are long, with length, transition and a progress line; drag to reorder.
- **Words that do not cover the animation:** captions are split like subtitles (two short lines at a time, timed by their share of the line) in the preview, exports and .srt/.vtt files. `Scene { caption-band: 18%; }` draws the picture above a clear strip; captions sit at its bottom and `fixed: band;` Texts at its top. Texts at the same `fixed:` place stack instead of overlapping. New warnings: W0550 (a spoken line cut off by the next), W0551 (a line over 40 words), W0624 (caption-band out of range), W0625 (a Text of more than 16 words).
- **Fixes for "Expected …" errors:** `Door:Box` and `Door Box {` become `Door::Box`; a missing `;`, `}`, `)` or `:` is added; a comma between properties becomes `;`; a property name read as a value because its `;` is missing gets the `;`.
- **Header:** buttons in the order you use them: File, Examples, Insert and the view switch on the left; build status, Prompt AI, Save and Export on the right. The view switch reads **Three files / One file** (was Split / Combined).
- **Fix** in the Problems panel is now one button with a spanner and a menu, next to Copy as JSON and tinted so it stands out on the dark panel. It does the most useful thing first: **Fix all** (sure fixes), then **Apply suggestions** (guesses), then **Fix with AI** for the errors that are left. The menu adds **Fix as much as possible**, which repeats sure fixes and suggestions until nothing more changes, in one Undo. Every fix reports what it changed, with Undo and Show changes. Ctrl+. presses the button. Row Fix buttons have the spanner too; a guess shows the word it will write, with a dashed outline.
- **Did you mean …?** on misspelt names in errors, with a one-click fix: shape types, units, sections, parts, members and anchors, styles, sounds, voices, chapters to extend, colours, materials, light and plot kinds, text sides and font styles, class names in motion. A swapped pair of letters counts as one slip.
- New fixes: an ignored property is removed (W0516, W0531, W0548, W0621); `true`/`yes`/`false`/`no` in on/off settings (wireframe, captions, shadow) become the right word; `font-size: 12` gets `mm` (W0622); a value out of range is written back inside it, or as a percentage when that fits (W0214, W0547, W0607–W0609, W0617); a `/* comment` never closed is guessed to end on its line (E0101).
- `gearscript check --fix` prints each change and applies fixes that sit on the same line together; `--fix --suggestions` applies the guesses too. Edits in `--json` can carry `guess` and `old`.
- `fixed: bottom-left margin 5%;` and a separate `margin: 5%;` (common in AI replies) now build, with W0232 and a one-click Fix to `fixed: bottom-left 5%;`. The AI prompt spells out the right form.

## 1.0 beta

The first public release of the language (version 1) and the studio, for testing. Until 1.0 the
language may still change; from 1.0 on, projects that work keep working and error and warning codes
keep their meaning (see "Versions and stability" in SPEC.md).

**The language**
- Three sections, @scene, @style and @motion, as three files or one `.gscript` file opened by `@gearscript 1`.
- 40 shapes, groups, `define` for reusable part types, `repeat` and `scatter` (random copies in a
  plane, a slab, along an axis, on any plane given as an equation, or in a volume).
- Connections that drive the motion: attach, hinge, slider, mesh, couple, belt, pin, with closed
  loops solved every frame.
- Motion in time blocks (`forever`, `0s..2s`, `then`), with positions, changes, speeds and
  accelerations, easings, expressions of t, look rules (opacity, color, luminosity) and a camera
  (Observer) that follows, orbits and tours.
- CSS-like style: colours, gradients, materials, outlines, opacity, luminosity, trails, `shadow: none`,
  named styles (`Metal::Style { … }`) reused with `use: Metal, Polished;`.
- Words: Text parts (they face the viewer by default) and text on any part's faces, flat or as
  solid 3D letters; labels as bare text, with an optional panel.
- `fixed: top-left;` (and eight other places, or `(x%, y%)`) keeps a title, logo or counter at one
  place on the screen whatever the camera does.
- Charts: Plot draws a function or data as a line, bars, points or an area, and can draw itself on.
- Scene: `frame` (YouTube, Shorts, Reels, TikTok, slides, 4K, ratios, pixels) with safe areas,
  `sky`, `ground` (`at` a height), and `sun: (height, direction)`: a sun on the sky that aims the
  main light and can rise or set in motion.
- Cutaways and exploded views: `cut: z 0mm;` with `cut-color`, `material: ghost;`, and
  `explode: 0 -> 1 along y;` in a Scene motion rule.
- Chapters: `@common` plus `@chapter Name "Title" extends Other fade | crossfade | cut`, each a
  complete animation, joined into one video.
- Sound: 34 generated sounds and audio files placed on the timeline; a narrator (`Voice`, `say:`)
  speaks lines in the preview and the 3D player, with captions drawn into exports and saved as .srt
  or .vtt, and optional neural speech in video exports (experimental).
- Over 100 numbered errors and warnings, each with a fix; many carry an exact edit. W0519 warns when
  a spoken line outlasts the motion.

**The studio**
- Runs in the browser, works offline once installed, no account. Split or Combined editing,
  type hints, beautify, checkpoints (undo stops there), click a part to jump to its code, and a
  Problems panel with Fix and Fix with AI on each problem.
- Chapter strip with settings, add, copy and close (with Undo); Film playback; a tracks panel.
- Examples and new projects open in the same tab (asking about unsaved work) or a new one.
- Exports: MP4 and WebM (supersampled, with sound), GIF, PNG frames with transparency, and a
  self-contained 3D player; the whole film or one chapter; a chapter list for video descriptions.
- Optional server: opt-in statistics and AI Generate and Fix with daily limits.

**For tools and AI agents**
- `gearscript` command line: check (with --fix), sample, render, test, format, eval, schema, join,
  split, examples, prompt; and an MCP server with check, sample, render, prompt, spec and schema.
- An AI prompt with design and pacing guidance, a JSON schema of the language, and an evaluation set.
