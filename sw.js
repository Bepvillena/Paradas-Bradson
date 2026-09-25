const CACHE_NAME = 'curva-s-local-v3';

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
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}
const ASSETS = [
  './',
  './index.html',
  './styles.css',
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
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: siempre intenta traer la version mas nueva del servidor.
// Solo usa la copia guardada si no hay conexion (para que la app siga
// funcionando en terreno con mala senal), y esa copia se refresca sola
// cada vez que SI hay conexion.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('/__localfile/')) {
    const path = decodeURIComponent(url.split('/__localfile/')[1]);
    event.respondWith(
      leerArchivoLocal(path).then((stored) => {
        if (!stored) return new Response('No encontrado', { status: 404 });
        const blob = stored.buf ? new Blob([stored.buf], { type: stored.type }) : stored;
        return new Response(blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } });
      }).catch(() => new Response('Error leyendo archivo local', { status: 500 }))
    );
    return;
  }

  // Ya no hay CDNs externos que excluir (Firebase se fue, y jsPDF/html2canvas/
  // PizZip/JSZip/docx-preview ahora se sirven locales desde ./assets/vendor/)
  // — todo lo que pide esta app es del mismo origen.
  event.respondWith(
    // cache:'reload' obliga a saltarse el cache HTTP normal del navegador y
    // preguntarle de verdad al servidor — sin esto, "network-first" podia
    // terminar sirviendo igual una copia vieja desde el disco (GitHub Pages
    // manda cabeceras de cache), y una actualizacion nueva no se notaba
    // hasta quien sabe cuando.
    fetch(event.request, { cache: 'reload' })
      .then((response) => {
        // Solo se guarda si de verdad vino bien (200) — si no, un error
        // pasajero (por ejemplo justo mientras GitHub Pages termina de
        // publicar una actualizacion) quedaba pegado en la cache para
        // siempre y se seguia sirviendo como si fuera la pagina real.
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
