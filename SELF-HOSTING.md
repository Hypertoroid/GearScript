# Running GearScript

GearScript is static files. There are no accounts and nothing to configure. The official site, [gearscript.org](https://gearscript.org), is this repository published as it is with GitHub Pages.

## Just the studio

Open `index.html` (the landing page) or `studio.html` in a browser, or put these on any web host:

```
index.html  studio.html  help.html  privacy.html  terms.html  404.html  site-config.js
manifest.webmanifest  sw.js  vendor/  brand/  docs/  LICENSE  NOTICE
```

On its own the studio sets no cookies, shows no cookie banner and sends nothing anywhere. (The GoatCounter visit counter in `index.html` and `studio.html` runs only when the address is gearscript.org.) Its libraries (three.js, CodeMirror, glTF support, the video muxers) are in `vendor/`; a public CDN is used only if those files are missing. Fonts come from Google Fonts, with system fonts as the fallback.

**Offline and installable.** Served over HTTPS, the studio registers `sw.js`, so it keeps working without a connection once it has been opened, and Chrome and Edge show their own install icon in the address bar; the studio's **More › Download Studio** asks the same question. Installation needs HTTPS (or localhost). When you publish a new version, change `VERSION` in `sw.js` so installed copies fetch the new files. Where a browser cannot install, Download Studio offers the whole studio as one HTML file instead, which runs from disk with no internet.

**A page for missing addresses:** `404.html`. GitHub Pages, Netlify, Cloudflare Pages and Vercel use it on their own; on nginx add `error_page 404 /404.html;`, on Apache `ErrorDocument 404 /404.html`. It finds the site's folder by itself, so its links work wherever the site is published. The bundled server sends it too.

**Project links:** the documentation's "Try it" buttons open a project packed into the address after `#p=`; they work from your site as it is.

**GitHub Pages with your own domain:** publish the repository from its main branch (Settings › Pages), put the domain in `CNAME`, point the domain's DNS at GitHub Pages as GitHub's documentation describes, and tick **Enforce HTTPS** once the certificate is ready. Pages cannot run `server/`, so the cookie banner and the AI buttons stay hidden, as they should.

**Before you publish**, run `node scripts/release-check.js`: it lists placeholders left in `site-config.js` and version numbers that disagree.

## With usage statistics (optional)

The server in `server/` serves the same files and counts which features are used: page views, examples opened, exports by format, AI prompts copied, tours finished. It does this only for visitors who allow it in the studio's banner. It keeps a random visitor id and the event, with no names, emails or IP addresses, for 13 months. It has no dependencies; it needs Node 22.13 or later.

```sh
cd server
npm test                                   # checks on a throwaway database
ADMIN_TOKEN=<long random string> npm start # http://localhost:8080
```

Read the numbers:

```sh
curl -H "Authorization: Bearer <ADMIN_TOKEN>" "http://localhost:8080/api/admin/stats?days=30"
```

That returns visitors, returning visitors, events by name, the most-opened examples, exports by format, and a day-by-day count.

### In production

Run it behind HTTPS (a reverse proxy such as Caddy or nginx) with:

```
PORT=8080
DB=/var/lib/gearscript/gearscript.db   # back this file up
TRUST_PROXY=1                              # read the client IP from X-Forwarded-For, for rate limits
SECURE_COOKIES=1                           # send HSTS
ADMIN_TOKEN=<long random string>
PUBLIC_URL=https://your.domain             # optional: the site's own address, for cross-site checks
```

Rate limits live in memory, so run one server process, or move them to a shared store.

## With AI in the studio (optional)

With an API key, the server answers the studio's **Generate** and **Fix with AI** buttons: it passes the studio's prompt to the Claude API and returns the reply. Without a key the buttons stay hidden and **Copy prompt** works as before.

```
ANTHROPIC_API_KEY=<key from the Claude Console>   # turns AI on; set a monthly spend limit on the key too
AI_MODEL=claude-sonnet-5-5                        # optional
AI_DAILY_PER_VISITOR=20                           # AI requests per visitor per day
AI_DAILY_SITE=500                                 # for the whole site per day: your cost ceiling
AI_PER_MINUTE=4                                   # burst limit per visitor
HASH_SALT=<long random string>                    # keeps daily counts across restarts
```

Requests and replies are not stored. Daily counts are kept under a salted hash of the visitor's address that changes every day, and deleted after two days. If you turn AI on, say so in your privacy policy: who receives requests (Anthropic), what is kept and for how long.


## A public copy

If you run GearScript for other people:

- Give your site its own name and logo (see TRADEMARKS.md). "Powered by GearScript" is welcome.
- Put your details in `site-config.js`: owner, contact email, repository link, site address. Links with placeholder addresses stay hidden until you do. Replace `CNAME` with your domain, or delete it.
- `privacy.html` and `terms.html` are the policies of gearscript.org. Replace them with your own, written for how you run your site (for example, if you run the server with statistics or AI, say so), and have them reviewed by someone qualified.
- To count visits with your own GoatCounter, change the hostname and the counter address in the two loaders (one in `index.html`, one in `studio.html`).
