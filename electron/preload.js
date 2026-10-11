// Puente seguro entre la app web (sandbox, sin Node) y Electron.
// engine.js llama a window.escritorio.* — ver descargarBlob() en engine.js.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('escritorio', {
  esEscritorio: true,
  async guardarArchivo(nombreSugerido, arrayBuffer) {
    return ipcRenderer.invoke('guardarArchivo', nombreSugerido, arrayBuffer);
  },
  async mostrarEnCarpeta(ruta) {
    return ipcRenderer.invoke('mostrarEnCarpeta', ruta);
  },
});
