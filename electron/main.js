// CORE - Bitácora de Paradas de Planta - version de escritorio (Windows).
// Carga la MISMA app web (carpeta www/, copiada desde el proyecto principal por
// scripts/prepare-electron.cjs) dentro de una ventana de escritorio normal, sin
// las restricciones del WebView de Android: aqui SI se puede abrir/guardar
// cualquier archivo con el dialogo nativo de Windows.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ---- Datos "portables": en vez de guardar en AppData (separado del programa),
// se guardan en una carpeta "datos" DENTRO de la misma carpeta del programa —
// así copiar/mover toda esa carpeta a otra PC o a un USB lleva el programa y
// sus avances juntos, sin tener que buscar en AppData. Si por algún motivo esa
// carpeta no se puede escribir (por ejemplo, instalada en Archivos de programa
// sin permisos), se sigue usando la ubicación normal de Windows sin avisar con
// un error — la app igual funciona, solo que ese caso ya no sería portable.
(function usarCarpetaDePortableSiSePuede() {
  try {
    // En la versión de un solo archivo (portable), el programa se descomprime en una
    // carpeta temporal: la carpeta REAL donde el usuario puso el .exe la informa
    // electron-builder en PORTABLE_EXECUTABLE_DIR.
    const carpetaPrograma = process.env.PORTABLE_EXECUTABLE_DIR
      || (app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname);
    const carpetaDatos = path.join(carpetaPrograma, 'datos');
    fs.mkdirSync(carpetaDatos, { recursive: true });
    const pruebaArchivo = path.join(carpetaDatos, '.prueba-escritura');
    fs.writeFileSync(pruebaArchivo, 'ok');
    fs.unlinkSync(pruebaArchivo);
    app.setPath('userData', carpetaDatos);
  } catch (e) {
    console.warn('No se pudo usar una carpeta de datos portable junto al programa; se usa la ubicación normal de Windows.', e);
  }
})();

let ventanaPrincipal = null;

function crearVentana() {
  ventanaPrincipal = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'www', 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  ventanaPrincipal.loadFile(path.join(__dirname, 'www', 'index.html'));
  ventanaPrincipal.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  crearVentana();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- Guardar archivo: dialogo nativo "Guardar como" (Word, PDF, respaldo ZIP, imagenes) ----
ipcMain.handle('guardarArchivo', async (event, nombreSugerido, datos) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: nombreSugerido,
  });
  if (canceled || !filePath) return { cancelado: true };
  await fs.promises.writeFile(filePath, Buffer.from(datos));
  return { cancelado: false, ruta: filePath };
});

// ---- Abrir carpeta que contiene un archivo ya guardado ----
ipcMain.handle('mostrarEnCarpeta', async (event, rutaArchivo) => {
  shell.showItemInFolder(rutaArchivo);
  return true;
});
