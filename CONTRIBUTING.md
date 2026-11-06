# Contributing to Orrery

Thanks for helping. Every kind of contribution is welcome: bug reports, examples, new shapes, clearer docs, fixes and tests.

## Before you start

- **Bugs:** open an issue with the smallest `.orrery` project that shows the problem, what you expected and what happened. A "Copy state" paste (the timeline button) helps a lot.
- **Language changes** (new keywords, properties or syntax): open an issue first. Every addition is something people and AI models have to learn, so each one needs a case where today's syntax falls short.
- **Small fixes and docs:** send a pull request directly.

## How the code is laid out

- `studio.html` is the whole studio, with no build step. `<script id="core">` is the language: lexer, parser, shapes, solver and motion. It runs in the browser and in the CLI. `<script id="app">` is the editor, the 3D view and export.
- `cli/orrery.js` loads the core from `studio.html`, so a language fix lands in both.
- `help.html`, `SPEC.md` and the AI prompt (`AI_PROMPT` in `studio.html`, also printed by `orrery prompt`) describe the language. **Change all three together** when the language changes. `node scripts/release-check.js` fails if the AI prompt leaves out any shape, property, block property or motion property, so a feature cannot ship without it; also add the feature's usual mistakes to the prompt's AVOID list.

## Checks before a pull request

```sh
cd cli && npm install
for f in ../examples/*.orrery; do node orrery.js check "$f" || echo "FAILED: $f"; done
node orrery.js eval ../evals/tasks.json ../evals/reference     # expect 16/16
node orrery.js test                                            # every example still moves as saved
node ../scripts/release-check.js                               # versions agree; the AI prompt covers every feature
cd ../server && npm test                                             # if you touched the server
```

Then open `studio.html`, load a few examples, and check the console shows no errors.

## Style

- Follow the code around you: plain JavaScript, no framework, no build step, no new runtime dependency unless it is loaded only when needed (as the video muxers are).
- Error messages say what is wrong and what to write instead, in plain words, with an example. Give a new error the next free code in its group, list it in `help.html`, and give it a fix line.
- Keep examples short and commented. Each one shows one idea.

## Licence of contributions

Orrery is under the Apache License 2.0. By sending a contribution you agree that it is licensed under the same terms (section 5 of the licence), and that you have the right to submit it.

Please sign off each commit to confirm this, as in the [Developer Certificate of Origin](https://developercertificate.org/):

```sh
git commit -s -m "Add a Spring example"
```

That adds `Signed-off-by: Your Name <you@example.com>` to the commit.
