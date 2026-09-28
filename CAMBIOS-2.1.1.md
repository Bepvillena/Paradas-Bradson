# Cambios 2.1.1 (versionCode 20101, applicationId y firma SIN cambios)

- Informe: se elimina toda opción de PDF (tarjeta, detalle y editor). Solo Word. Se borró generateInformePdf y la exportación PDF del editor. Los PDF de Curva S, componentes y polines siguen.
- Respaldo: «Guardar respaldo» abre el menú de compartir de Android (Drive, WhatsApp, correo). Aviso del último respaldo en Resumen.
- Guardado de archivos en Android: intenta Documentos y, si Android lo rechaza, usa la caché de la app y abre/comparte desde ahí.
- Parada piloto: la planificación se actualiza sola cuando cambia seed-data.js (definitionHash). Los avances no se tocan.
- Arranque: listParadas ya no carga las fotos en memoria.
- Menú «Mis paradas» rediseñado (botón Paradas de la barra superior); importación de ZIP con validación más estricta.
- Seguridad: se escapa el HTML de nombres de actividades, áreas, componentes y opciones; el XML de Word elimina caracteres de control y escapa comillas.
- Service Worker: no se registra dentro del APK (evita el aviso de error); caché v7.
- Nombre del informe en la lista: hasta 2 líneas.
- Pruebas: tests/version-2.1.0.cjs comprueba que no hay opción PDF en el informe.
Pendiente: respaldo automático a Google Drive (requiere proyecto de Google Cloud + plugin nativo de inicio de sesión).
