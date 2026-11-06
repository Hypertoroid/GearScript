# Security

## Reporting a problem

Please don't open a public issue for a security problem. Use GitHub's private **Report a vulnerability** form (the repository's Security tab) if it is turned on, or write to the address in `site-config.js` (`contactEmail`) of the official instance. Expect a reply within a week.

Include what you found, how to reproduce it, and what an attacker could do with it.

## What to look at

- `server/`: static file serving (path handling), the statistics endpoint, cross-site checks, rate limits and the admin token.
- The 3D player export: it embeds the project's code in an HTML file other people open.
- Opening projects: `.ms`, `.zip` and `.json` files, and STL, GLB and glTF models, come from untrusted sources.

The studio runs entirely in the browser and has no accounts.
