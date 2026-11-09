# Security

## Reporting a problem

Please don't open a public issue for a security problem. Use GitHub's private **Report a vulnerability** form (the repository's Security tab) if it is turned on, or write to the contact address in the [gearscript.org privacy policy](https://gearscript.org/privacy.html) (also `contactEmail` in `site-config.js`). Expect a reply within a week.

Include what you found, how to reproduce it, and what an attacker could do with it.

## What to look at

- The official site, gearscript.org, is static files on GitHub Pages; `server/` is only for self-hosted copies.
- `server/`: static file serving (path handling), the statistics endpoint, cross-site checks, rate limits and the admin token.
- The 3D player export: it embeds the project's code in an HTML file other people open.
- Opening projects: `.gscript`, `.zip` and `.json` files, and STL, GLB and glTF models, come from untrusted sources.

The studio runs entirely in the browser and has no accounts.
