const CACHE_NAME = 'curva-s-local-v7-211';

// ---- Archivos locales (fotos/firmas/anexos guardados en IndexedDB, ver
// local-db.js) — el service worker corre en su propio contexto y no puede
// acceder al `window` de la página, pero sí a la misma IndexedDB del origen,
// así que lee el archivo directo de ahí para responder la petición. ----
const LOCAL_DB_NAME = 'curva_s_local_db';
const LOCAL_STORE_FILES = 'files';
function leerArchivoLocal(path) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LOCAL_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs');
      if (!db.objectStoreNames.contains(LOCAL_STORE_FILES)) db.createObjectStore(LOCAL_STORE_FILES);
    };
    req.onsuccess = () => {
      const db = req.result;
      const getReq = db.transaction(LOCAL_STORE_FILES, 'readonly').objectStore(LOCAL_STORE_FILES).get(path);
      getReq.onsuccess = () => { db.close(); resolve(getReq.result); };
      getReq.onerror = () => reject(getReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './workspace.css',
  './workspace.js',
  './paradas.js',
  './document-editor.js',
  './assets/plantilla-informe.docx',
  './assets/logo-centinela.jpg',
  './assets/logo-dimarza.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './engine.js',
  './local-db.js',
  './seed-data.js',
  './pets-links.js',
  './firebase-config.js',
  './manifest.json',
  './assets/vendor/jspdf.umd.min.js',
  './assets/vendor/html2canvas.min.js',
  './assets/vendor/pizzip.min.js',
  './assets/vendor/jszip.min.js',
  './assets/vendor/docx-preview.min.js',
  './assets/vendor/pdf.min.js',
  './assets/vendor/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );

});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('curva-s-local-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first: cada version instalada es un paquete coherente sin conexion.
// Las versiones nuevas esperan a que el usuario acepte actualizar (SKIP_WAITING).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/__localfile/')) {
    event.respondWith((async () => {
      try {
        const stored = await leerArchivoLocal(decodeURIComponent(url.pathname.split('/__localfile/')[1]));
        if (!stored) return new Response('No encontrado', { status: 404 });
        const blob = stored.buf ? new Blob([stored.buf], { type: stored.type }) : stored;
        return new Response(blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } });
      } catch (e) { return new Response('Error leyendo archivo local', { status: 500 }); }
    })());
    return;
  }
  // Each installed version is a coherent offline bundle. Updates wait for an explicit reload.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || new Response('App no disponible', {status:503});
      return new Response('Recurso no disponible sin conexión', {status:503});
    }
  })());
});

