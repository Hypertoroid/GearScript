# Changelog

## Unreleased

- Tours: a welcome card offers an **interactive tour** (recommended) or a quick one. The interactive tour walks through the whole workflow on a scratch crane project with a simulated AI: AI prompt, paste, Problems and Copy as JSON, the timeline and Copy state, then Export. The visitor clicks the real buttons; their project, settings and undo history come back afterwards.
- A **?** button in the header opens the tours. The quick tour is down to seven stops and leads with AI prompt.
- No length limit: animations and chapters can run as long as you like (W0503, which cut them at 120 s, is gone). Video exports run to 20 minutes at 30 fps, for a single animation as for a film.
- `fixed: bottom-left margin 5%;` and a separate `margin: 5%;` (common in AI replies) now build, with W0232 and a one-click Fix to `fixed: bottom-left 5%;`. The AI prompt spells out the right form.

## 1.0 beta

The first public release of the language (version 1) and the studio, for testing. Until 1.0 the
language may still change; from 1.0 on, projects that work keep working and error and warning codes
keep their meaning (see "Versions and stability" in SPEC.md).

**The language**
- Three sections, @scene, @style and @motion, as three files or one `.orrery` file opened by `@orrery 1`.
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
- `orrery` command line: check (with --fix), sample, render, test, format, eval, schema, join,
  split, examples, prompt; and an MCP server with check, sample, render, prompt, spec and schema.
- An AI prompt with design and pacing guidance, a JSON schema of the language, and an evaluation set.
