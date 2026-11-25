/* Service worker — Markaz Lughoh Temboro (PWA)
   - Berkas inti dimuat sekali lalu bisa dipakai offline.
   - Halaman utama, daftar data, dan buku PDF: jaringan dulu (selalu terbaru), cadangan dari cache bila offline.
   - Berkas lain (css, js, data pelajaran, game, gambar, audio): tampil cepat dari cache, lalu diperbarui diam-diam.
     Jadi saat Anda mengganti satu berkas di GitHub, hanya berkas itu yang diunduh ulang.
   Naikkan VERSION hanya jika Anda mengubah isi sw.js ini atau ingin mengosongkan seluruh cache pengguna. */
const VERSION = 'v3';
const CACHE = 'markaz-lughoh-' + VERSION;
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "data/manifest.json",
  "data/books.json",
  "assets/css/app.css",
  "assets/css/games-hub.css",
  "assets/css/library.css",
  "assets/css/login.css",
  "assets/js/app.js",
  "assets/js/config.js",
  "assets/js/games-hub.js",
  "assets/js/library.js",
  "assets/js/login.js",
  "assets/js/pwa-register.js",
  "data/kalimat/mubtadi-1.json",
  "data/kalimat/mubtadi-2.json",
  "data/kalimat/mutaqodim-1.json",
  "data/kalimat/mutaqodim-2.json",
  "data/kalimat/mutawassith-1.json",
  "data/kalimat/mutawassith-2.json",
  "data/kalimat/tamhidi-1.json",
  "data/kalimat/tamhidi-2.json",
  "data/nash/mubtadi-1.json",
  "data/nash/mubtadi-2.json",
  "data/nash/mutaqodim-1.json",
  "data/nash/mutaqodim-2.json",
  "data/nash/mutawassith-1.json",
  "data/nash/mutawassith-2.json",
  "data/nash/tamhidi-1.json",
  "data/nash/tamhidi-2.json",
  "assets/css/theme.css",
  "assets/js/theme.js"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(CORE.map(url =>
        cache.add(new Request(url, { cache: 'reload' })).catch(err => console.warn('SW: gagal cache', url, err))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('markaz-lughoh-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

let lastNotice = 0;
function notifyUpdated() {
  const now = Date.now();
  if (now - lastNotice < 5000) return;
  lastNotice = now;
  self.clients.matchAll({ type: 'window' }).then(list => list.forEach(c => c.postMessage({ type: 'markaz-updated' })));
}

function changed(oldRes, newRes) {
  for (const h of ['etag', 'last-modified', 'content-length']) {
    const a = oldRes.headers.get(h), b = newRes.headers.get(h);
    if (a && b) return a !== b;
  }
  return false;
}

async function networkFirst(req, key) {
  const cache = await caches.open(CACHE);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const res = await fetch(req, { cache: 'no-cache', signal: ctl.signal });
    clearTimeout(timer);
    if (res && res.status === 200) cache.put(key || req, res.clone());
    return res;
  } catch (err) {
    clearTimeout(timer);
    return (await cache.match(key || req)) || (await cache.match(req)) || Response.error();
  }
}

async function staleWhileRevalidate(event, req, quiet) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const net = fetch(req, { cache: 'no-cache' }).then(async res => {
    if (res && (res.status === 200 || res.type === 'opaque')) {
      await cache.put(req, res.clone());
      if (cached && !quiet && changed(cached, res)) notifyUpdated();
    }
    return res;
  }).catch(() => null);
  if (cached) { event.waitUntil(net); return cached; }
  return (await net) || Response.error();
}

async function rangeResponse(cached, range) {
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range || '');
  if (!m) return cached;
  const size = buf.byteLength;
  let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (!(start >= 0) || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  const headers = new Headers(cached.headers);
  headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!same && !isFont) return;

  // Permintaan sebagian (audio/PDF): layani dari cache bila ada, selain itu langsung ke jaringan.
  if (req.headers.has('range')) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req.url);
      return cached ? rangeResponse(cached, req.headers.get('range')) : fetch(req);
    }));
    return;
  }

  if (same && req.destination === 'document') {            // halaman utama
    event.respondWith(networkFirst(req, new URL('index.html', self.registration.scope).href));
    return;
  }
  if (same && /\/(manifest\.webmanifest|data\/manifest\.json|data\/books\.json)$/.test(url.pathname)) {
    event.respondWith(networkFirst(req));                  // daftar data & buku
    return;
  }
  if (same && /\/books\//.test(url.pathname)) {           // PDF buku
    event.respondWith(networkFirst(req));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, req, isFont));
});
