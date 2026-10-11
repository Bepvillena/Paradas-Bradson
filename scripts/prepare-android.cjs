// Prepara los archivos web y el logo para el proyecto Android incluido.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
process.chdir(root);

async function main() {
  fs.mkdirSync('www', { recursive: true });
  for (const name of ['index.html', 'styles.css', 'workspace.css', 'workspace.js', 'core.css', 'core-calculo.js', 'core-ui.js', 'engine.js', 'document-editor.js', 'paradas.js', 'local-db.js', 'seed-data.js', 'pets-links.js', 'firebase-config.js', 'manifest.json', 'sw.js']) {
    fs.copyFileSync(name, path.join('www', name));
  }
  for (const name of ['assets', 'icons']) fs.cpSync(name, path.join('www', name), { recursive: true });
  console.log('Archivos web e iconos Android preparados. Ejecuta npx cap sync android.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
