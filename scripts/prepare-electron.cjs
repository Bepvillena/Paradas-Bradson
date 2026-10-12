// Copia los archivos web al proyecto Electron, igual que prepare-android.cjs
// hace para Android. No duplica logica: es el mismo www/ de siempre.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
process.chdir(root);

function main() {
  const destino = path.join('electron', 'www');
  fs.mkdirSync(destino, { recursive: true });
  for (const name of ['index.html', 'styles.css', 'workspace.css', 'workspace.js', 'core.css', 'core-calculo.js', 'core-distribucion.js', 'core-ui.js', 'engine.js', 'document-editor.js', 'paradas.js', 'local-db.js', 'seed-data.js', 'pets-links.js', 'firebase-config.js', 'manifest.json', 'sw.js']) {
    fs.copyFileSync(name, path.join(destino, name));
  }
  for (const name of ['assets', 'icons']) fs.cpSync(name, path.join(destino, name), { recursive: true });
  console.log('Archivos web copiados a electron/www. Ejecuta npm run dist:win dentro de electron/.');
}
main();
