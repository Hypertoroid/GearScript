/* GearScript offline support. Pages come from the network when it is there (so updates arrive at once) and from
   this cache when it is not; the bundled libraries come from the cache first. Bump VERSION to replace the cache. */
const VERSION = 'gearscript-1.0.0-beta';
const CORE = ['studio.html', 'index.html', 'help.html', 'privacy.html', 'terms.html', 'site-config.js', 'manifest.webmanifest',
  'vendor/three.min.js', 'vendor/OrbitControls.js', 'vendor/codemirror6.js', 'vendor/GLTFLoader.js', 'vendor/mp4-muxer.js', 'vendor/webm-muxer.js', 'vendor/fonts3d.js',
  'brand/app-192.png', 'brand/app-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes('/api/')) return;   /* the optional statistics server is never cached */
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonts) return;
  const page = req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/');
  if (page) {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); if (r.ok) caches.open(VERSION).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('studio.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })));
});
