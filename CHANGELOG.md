# Changelog

## Unreleased

- **Natural narration.** Spoken lines in MP4 and WebM now use Kokoro (Apache 2.0, run in the browser by kokoro-js) for English: 11 voices, American and British, chosen in the export panel under **Narration › Voice** or with `neural: bf_emma;` on a Voice. Piper still speaks other languages and takes over if Kokoro cannot load. `rate:` now sets how fast Kokoro speaks, and a **Sample** button plays a sentence in the chosen voice. NOTICE and the privacy policy list the new library.
- **The natural voice no longer freezes or crashes the tab.** Kokoro ran on the page itself, so the studio stopped responding while lines were made, and its memory only grew until Chrome closed the tab ("Aw, Snap!", SIGILL). It now runs in a background worker that is closed after every batch (each chapter of an export, a Listen, a Sample) and replaced every 16 lines, so its memory is handed back; Kokoro and Piper are never loaded at once, and the old two-minute retry, which loaded a second copy, is gone. While lines are being made, Render, Listen and Sample turn into **Cancel**, which stops at once: the natural voice's download is stopped, and a fast-voice download (which cannot be stopped) finishes unseen without overwriting the message.
- **Sample plays only the voice you picked.** If a natural voice cannot load, Sample now says why instead of quietly playing the fast voice; an export still falls back to the fast voice and names both voices in its notice. A line spoken by the fallback voice is no longer kept as if the natural voice had made it, so it is made again with the right voice next time.
- **Listen speaks only what it plays.** It used to generate every line of the narration (every chapter of a film) before playing 8 seconds; now it speaks only the lines in those seconds.
- **The export panel is tidier:** Picture, Narration and Sound are sections that fold away, each with a one-line summary, and the panel remembers which are open. The voice balance has its own row.
- **Exports sound clearly.** Every video's sound track is brought to a set loudness, with a limiter, so a quiet voice no longer stays quiet; each spoken line is levelled, and a Voice's `volume:` applies in exports. The export panel's **Audio level** (Quieter, Standard, Louder), **Balance** between voice and sounds, and **Listen** button (the video's own sound, before rendering) set and check it. The preview after an export plays with sound.
- **Sharper videos.** Exports use the browser's software encoder first (graphics-card encoders often ignore the bitrate and blur fine edges), render at whole-number supersampling only (2× or 1×: 1.5× and the 1.07× that 4K got softened every edge), and fall back to 1× if the browser gives a smaller drawing area than asked.
- **Pausing stops the sound.** Audio files and long sounds kept playing after a pause; they now stop, and pick up from the same moment when playing again.

- **gearscript.org:** the official site now lives at its own domain, published from this repository with GitHub Pages (`CNAME`). `site-config.js` sets `siteUrl`, and Share GearScript copies the site's address. The home page has a canonical address and a share card (brand/social-1280x640.png).
- **Privacy policy and terms of use rewritten for gearscript.org** as it actually runs: static files on GitHub Pages, visit counts with GoatCounter (no cookies, no stored IP addresses), no server, so no cookie banner and no AI buttons. The template notices and placeholders are gone.
- The GoatCounter counters load only on gearscript.org. The studio's counter used to sit in the page snapshot, so it was copied into exported 3D players and the offline studio; it now loads after the snapshot. The home page's counter moved into `<head>`.
- Removed docs/Inside_GearScript.pdf (written for the old Orrery name) and the home page's link to a syntax PDF that did not exist. README, SELF-HOSTING, SECURITY, TRADEMARKS and NOTICE are up to date with the domain, the `.gscript` format and the fonts the pages load.

- **Video fonts ship with GearScript:** Montserrat, Oswald, Bebas Neue, Playfair Display, Space Grotesk, Inter, Caveat, JetBrains Mono and Noto Sans Devanagari (SIL Open Font License, from Fontsource), in vendor/fonts. Write `font-family: Montserrat;` and the text looks the same in the preview, on every computer, in the offline copy, the 3D player and every export. Each font loads the first time a project uses it, and exports wait for it. The type hints list them with what each is good for; scripts/make-fonts.js rebuilds them.
- **Two text styles for titles:** `text-transform: uppercase | capitalize | lowercase | none;` and `letter-spacing: 8%;` (a share of the letter height, or a length such as `1.5mm`; negative tightens). Both work on flat and 3D letters and on face text. New errors E0626 and E0627.
- **W0628: words over words.** Two Texts that cover each other on the picture while both are showing get a warning naming them and the first moment, in the studio and in `gearscript check`. Texts stacked at one `fixed:` place and quick crossfades between captions are left alone.
- The AI prompt lists the bundled fonts with their roles and pairings, shows the new text styles, and asks that Texts never cover each other.
- **One file is the default view**, because it is the easiest to hand to an AI. The header switch now reads One file | Three files; the choice is remembered, and a project opened from a .zip follows it.
- The version moved out of the header: it is shown in the More (⋯) menu and at the foot of Settings (with a What's new link when the repository is set), read from the compiler's own version number.
- Fixed: "Showing the last build that compiled" could stay over the view beside a green tick after an error was fixed while a film was playing. Every build path now sets that note, starting the film clears it, and an error in another chapter while the film plays shows as an error rather than a green tick.
- .gitignore covers lock files, SQLite files, .env files, test and render output, and editor and system files.
- **Undo and Redo buttons** next to Beautify, greyed out when there is nothing to undo or redo. Each file and chapter keeps its own history, as with Ctrl+Z.

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
