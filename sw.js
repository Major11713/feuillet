/* Feuillet : tout fonctionne sans connexion après la première ouverture */
const VERSION = 'feuillet-v11';
const LOCAL = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];
const REMOTE = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCAL);
    // polices et bibliothèques PDF : on essaie, sans bloquer l'installation
    for (const u of REMOTE) { try { const r = await fetch(u, { mode: 'cors' }); if (r.ok) await c.put(u, r); } catch (err) { } }
    try {
      const page = await (await fetch('./index.html')).text();
      const m = page.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/);
      if (m) {
        const url = m[0].replace(/&amp;/g, '&'), r = await fetch(url, { mode: 'cors' });
        if (r.ok) {
          const txt = await r.clone().text(); await c.put(url, r);
          for (const f of txt.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) || []) { try { const fr = await fetch(f, { mode: 'cors' }); if (fr.ok) await c.put(f, fr); } catch (err) { } }
        }
      }
    } catch (err) { }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === location.origin;
  if (same && (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/'))) {
    // la page : réseau d'abord pour recevoir les mises à jour, sinon la copie enregistrée
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  if (same || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; })));
  }
});
