/* ============================================================
   local-db.js — reemplazo 100% local (IndexedDB) de Firebase.

   Esta app pasó de necesitar Firestore/Storage (con sus problemas de cuota,
   conexión y "guardando en el servidor...") a guardar todo directo en el
   dispositivo, porque es de un solo usuario y no necesita compartir datos
   en vivo entre aparatos. Este archivo implementa el mismo subconjunto de la
   API de `firebase.firestore()` / `firebase.storage()` que ya usa engine.js
   (collection/doc, onSnapshot, add/set/update/delete, FieldValue.delete(),
   y Storage ref/put/getDownloadURL) pero respaldado en IndexedDB — así
   engine.js no necesitó cambiar ni una línea de su lógica de datos.

   Los archivos subidos (fotos, firmas, anexos) se guardan como Blob en un
   object store aparte, y getDownloadURL() devuelve una URL local
   (./__localfile/...) que el service worker (sw.js) intercepta y responde
   leyendo el Blob — así cualquier <img src="..."> sigue funcionando igual
   que con una URL real, sin tocar el código que las usa.
   ============================================================ */

(function () {
  const DB_NAME = 'curva_s_local_db';
  const STORE_DOCS = 'docs';
  const STORE_FILES = 'files';
  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_DOCS)) db.createObjectStore(STORE_DOCS);
        if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function storeTx(storeName, mode) {
    return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }
  function idbGet(storeName, key) {
    return storeTx(storeName, 'readonly').then((store) => new Promise((resolve, reject) => {
      const r = store.get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    }));
  }
  function idbPut(storeName, key, value) {
    return storeTx(storeName, 'readwrite').then((store) => new Promise((resolve, reject) => {
      const r = store.put(value, key);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    }));
  }
  function idbDelete(storeName, key) {
    return storeTx(storeName, 'readwrite').then((store) => new Promise((resolve, reject) => {
      const r = store.delete(key);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    }));
  }
  function idbGetAllWithPrefix(storeName, prefix) {
    return storeTx(storeName, 'readonly').then((store) => new Promise((resolve, reject) => {
      const results = [];
      const range = IDBKeyRange.bound(prefix, prefix + '￿');
      const cursorReq = store.openCursor(range);
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { results.push({ key: cursor.key, value: cursor.value }); cursor.continue(); }
        else resolve(results);
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    }));
  }

  // Sentinel para FieldValue.delete() — un merge/update con este valor borra
  // ese campo (o esa ruta anidada, ej "avance.3") en vez de asignarlo.
  const DELETE_SENTINEL = { __localDbDeleteField__: true };

  function applyFields(target, fields) {
    const out = JSON.parse(JSON.stringify(target || {}));
    for (const [key, value] of Object.entries(fields)) {
      const parts = key.split('.');
      let node = out;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (typeof node[p] !== 'object' || node[p] === null) node[p] = {};
        node = node[p];
      }
      const lastKey = parts[parts.length - 1];
      if (value === DELETE_SENTINEL) delete node[lastKey];
      else node[lastKey] = value;
    }
    return out;
  }

  function genId() {
    return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // path de colección -> Set de callbacks a re-disparar cuando algo cambia ahí
  const listeners = new Map();
  function notify(collectionPath) {
    const set = listeners.get(collectionPath);
    return set ? Promise.all(Array.from(set).map((fn) => fn())) : Promise.resolve();
  }
  function subscribe(collectionPath, fn) {
    if (!listeners.has(collectionPath)) listeners.set(collectionPath, new Set());
    listeners.get(collectionPath).add(fn);
    return () => listeners.get(collectionPath).delete(fn);
  }

  function makeSnapshotDoc(fullPath, data) {
    const id = fullPath.split('/').pop();
    return { id, data: () => JSON.parse(JSON.stringify(data)), metadata: { hasPendingWrites: false, fromCache: false } };
  }

  function collectionRef(path) {
    return {
      doc(id) {
        const docId = id !== undefined && id !== null ? String(id) : genId();
        return docRef(`${path}/${docId}`, path);
      },
      async add(data) {
        const docId = genId();
        await idbPut(STORE_DOCS, `${path}/${docId}`, data);
        await notify(path);
        return { id: docId };
      },
      onSnapshot(a, b, c) {
        // onSnapshot(cb, errCb) vs onSnapshot(options, cb, errCb) — lo que
        // distingue los dos casos es si el PRIMER argumento es una función
        // o no (revisar si el segundo es función falla: en la forma de dos
        // argumentos, el segundo — errCb — también es una función).
        const hasOptions = typeof a !== 'function';
        const cb = hasOptions ? b : a;
        const errCb = hasOptions ? c : b;
        let cancelled = false;
        const fire = async () => {
          if (cancelled) return;
          try {
            const rows = await idbGetAllWithPrefix(STORE_DOCS, path + '/');
            const directRows = rows.filter((r) => !r.key.slice(path.length + 1).includes('/'));
            const docs = directRows.map((r) => makeSnapshotDoc(r.key, r.value));
            cb({ forEach: (fn) => docs.forEach(fn), docs, size: docs.length, empty: docs.length === 0 });
          } catch (e) {
            if (errCb) errCb(e);
          }
        };
        fire();
        const unsub = subscribe(path, fire);
        return () => { cancelled = true; unsub(); };
      },
    };
  }

  function docRef(path, parentCollectionPath) {
    return {
      id: path.split('/').pop(),
      collection(name) { return collectionRef(`${path}/${name}`); },
      async get() {
        const data = await idbGet(STORE_DOCS, path);
        return makeSnapshotDoc(path, data || {});
      },
      async set(data, opts) {
        if (opts && opts.merge) {
          const existing = await idbGet(STORE_DOCS, path);
          await idbPut(STORE_DOCS, path, applyFields(existing || {}, data));
        } else {
          await idbPut(STORE_DOCS, path, JSON.parse(JSON.stringify(data)));
        }
        await notify(parentCollectionPath);
      },
      async update(data) {
        const existing = await idbGet(STORE_DOCS, path);
        await idbPut(STORE_DOCS, path, applyFields(existing || {}, data));
        await notify(parentCollectionPath);
      },
      async delete() {
        await idbDelete(STORE_DOCS, path);
        await notify(parentCollectionPath);
      },
    };
  }

  // ---- Shim de firebase.firestore() ----
  function firestoreShim() {
    return {
      collection(name) { return collectionRef(name); },
      settings() {},
      enablePersistence() { return Promise.resolve(); },
    };
  }
  firestoreShim.FieldValue = { delete: () => DELETE_SENTINEL };

  // ---- Shim de firebase.storage() ----
  function storageRefFactory(path) {
    return {
      put(file) {
        // Se guardan los bytes crudos (ArrayBuffer) y no el objeto File/Blob:
        // algunos navegadores fallan al guardar Blobs en IndexedDB (sobre todo
        // abierto como archivo suelto, file://), los bytes crudos siempre van.
        const task = file.arrayBuffer()
          .then((buf) => idbPut(STORE_FILES, path, {
            __localFile: true, type: file.type || 'application/octet-stream', name: file.name || '', buf,
          }))
          .then(() => ({ ref: this }));
        task.on = (eventName, onProgress) => {
          if (onProgress) onProgress({ bytesTransferred: file.size || 0, totalBytes: file.size || 0 });
        };
        return task;
      },
      async getDownloadURL() {
        // Abierto directo como archivo (file://) no hay service worker que
        // sirva ./__localfile/..., así que ahí la URL es el archivo mismo
        // embebido (data:) — sirve en cualquier lado sin depender de nada.
        if (location.protocol === 'file:' || window.__FORCE_DATAURL) {
          const stored = await idbGet(STORE_FILES, path);
          if (!stored) throw new Error('No se encontró el archivo recién guardado');
          const blob = stored.buf ? new Blob([stored.buf], { type: stored.type }) : stored;
          return await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(blob);
          });
        }
        return './__localfile/' + encodeURIComponent(path);
      },
    };
  }
  function storageShim() {
    return { ref: storageRefFactory };
  }

  // ---- Archivos guardados (./__localfile/<ruta>) SIN depender del service
  // worker. Dentro del APK (WebView de Android) el service worker no siempre
  // controla la página, y sin él las fotos guardadas no cargaban (íconos rotos)
  // ni se podían leer para armar el Word/PDF. Acá se resuelven directo desde
  // IndexedDB: fetch() devuelve el archivo, y las <img>/<a> que apuntan a esa
  // ruta se cambian por una URL blob: en cuanto aparecen en pantalla. ----
  function rutaDeUrlLocal(url) {
    const m = /__localfile\/([^?#]*)/.exec(String(url || ''));
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }
  async function blobDeArchivoLocal(path) {
    const stored = await idbGet(STORE_FILES, path);
    if (!stored) return null;
    return stored.buf ? new Blob([stored.buf], { type: stored.type || 'application/octet-stream' }) : stored;
  }

  const fetchOriginal = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const ruta = rutaDeUrlLocal(url);
    if (ruta) {
      return blobDeArchivoLocal(ruta).then((blob) => (blob
        ? new Response(blob, { status: 200, headers: { 'Content-Type': blob.type || 'application/octet-stream' } })
        : new Response('', { status: 404 })));
    }
    return fetchOriginal(input, init);
  };

  const blobUrls = new Map();
  async function resolverElementoLocal(el, attr) {
    const valor = el.getAttribute(attr);
    const ruta = valor && valor.indexOf('__localfile/') !== -1 ? rutaDeUrlLocal(valor) : null;
    if (!ruta) return;
    let u = blobUrls.get(ruta);
    if (!u) {
      const blob = await blobDeArchivoLocal(ruta);
      if (!blob) return;
      u = URL.createObjectURL(blob);
      blobUrls.set(ruta, u);
    }
    if (el.getAttribute(attr) === valor) el.setAttribute(attr, u);
  }
  function revisarArbolLocal(raiz) {
    if (!raiz || raiz.nodeType !== 1) return;
    const atributo = (el) => (el.tagName === 'IMG' ? 'src' : (el.tagName === 'A' ? 'href' : null));
    const a0 = atributo(raiz);
    if (a0) resolverElementoLocal(raiz, a0);
    raiz.querySelectorAll('img[src*="__localfile/"], a[href*="__localfile/"]').forEach((el) => resolverElementoLocal(el, atributo(el)));
  }
  function iniciarObservadorLocal() {
    new MutationObserver((muts) => {
      muts.forEach((m) => {
        if (m.type === 'childList') m.addedNodes.forEach(revisarArbolLocal);
        else if (m.type === 'attributes') revisarArbolLocal(m.target);
      });
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href'] });
    revisarArbolLocal(document.documentElement);
  }
  if (document.documentElement) iniciarObservadorLocal();
  else document.addEventListener('DOMContentLoaded', iniciarObservadorLocal);

  // ---- window.firebase (reemplaza al SDK real) ----
  window.firebase = {
    initializeApp() {},
    firestore: firestoreShim,
    storage: storageShim,
  };

})();
