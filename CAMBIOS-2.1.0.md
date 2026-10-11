# Cambios 2.1.0 – piloto Centinela

- La vista de edición de informe presenta Word y PDF en la barra superior junto al nombre del informe.
- Se añadió la opción para seleccionar una imagen de firma e insertarla en el documento.
- Se mejoró el escalado de la firma para que encaje en su celda.
- Se añadió selector de paradas y soporte para importar paquetes ZIP de parada (`parada.json` y `plantilla.docx`).
- Se guarda el catálogo local de paradas en IndexedDB y se incorpora la parada activa a los respaldos globales.
- Se incrementó la versión Android a 2.1.0 (versionCode 20100) manteniendo el identificador de aplicación existente.

## Validación de este paquete

- `node --check` pasó para `paradas.js`, `document-editor.js`, `engine.js`, `workspace.js` y `local-db.js`.
- `npx cap sync android` pasó y copió los archivos web actualizados al proyecto Android.
- `npm test` no se pudo completar: Playwright no encuentra el navegador Chromium requerido.
- No se compiló un APK actualizado en este entorno. El archivo APK previo es de la versión anterior y no incluye estos cambios.

## Validación posterior en Windows
Se compiló un APK candidato y se corrigieron fallos detectados en importación, catálogo, selector y PDF. Consultar VALIDACION-2.1.0-ACTUAL.md: la actualización de la instalación real sigue pendiente de verificar.

