# Validación 2.1.0 — 27 septiembre 2026

## Resultado
APK candidato compilado con JDK 17, SDK 34 y Gradle 8.2.1. Dependencias Maven descargadas correctamente. Proyecto enviado a Android Studio para abrir; compilación y verificación realizadas por Gradle CLI.

- Archivo: entrega/Paradas-Bradson-2.1.0-prueba.1-candidato.apk
- applicationId: cl.bradson.paradas.prueba
- versionName: 2.1.0-prueba.1
- versionCode: 20100
- SHA-256 APK: D4E53C3FAC4C58873AA5344437EB823D3684673165261D11EE17546625A1C1CF
- SHA-256 certificado: 5966e5451bf6df9b2cc5ce3dd1620f33e36fbb8b3e25496cce194dc04f72519f
- Clave: android/app/paradas-prueba.keystore, variante debug de prueba. No es una entrega de producción.

## Correcciones encontradas durante la validación
- Importación de paquetes: usar firebase.storage(), la API existente.
- Catálogo: recuperar las paradas desde IndexedDB, sin depender de una lista localStorage ausente en equipos nuevos.
- Respaldo: recuperar también la parada activa del manifiesto al restaurar.
- Selector: trasladar el botón Paradas a la barra visible del espacio de trabajo.
- PDF del editor: acceder al estado real del informe; mejorar el contraste del botón.
- Actualizar la versión de caché web y regenerar assets Android y HTML portable.

## Evidencia
- npm test: 23 comprobaciones aprobadas, incluyendo Word, respaldo, persistencia, móvil y modo offline (tests/results.json).
- node tests/version-2.1.0.cjs: importación real de ZIP, aislamiento de datos, restauración en perfil nuevo, catálogo y parada activa, conservación de registros piloto, cabecera móvil en una fila, firma guardada y conservada tras recarga, descarga PDF desde el botón del editor.
- Página inicial del editor: 794 x 1123 px, equivalente a A4 a 96 dpi. Revisión visual de tests/editor-2.1.0-mobile.png.
- :app:assembleDebug y :app:testDebugUnitTest: BUILD SUCCESSFUL. La prueba unitaria Android incluida es básica y no sustituye pruebas funcionales en dispositivo.
- apksigner verify: correcto. Identidad y certificado registrados en entrega/identidad-apk.txt y entrega/firma-apk.txt.
- Se compararon hashes de los seis assets modificados dentro del APK con los fuentes: idénticos.
- Las pruebas web utilizaron perfiles aislados con datos ficticios.

## Pendiente antes de distribuir o actualizar
ADB no detectó ningún teléfono y no hay AVD configurado. NO se instaló ni ejecutó el APK en Android. NO se verificó la identidad/firma de la app instalada ni una actualización real con conservación de datos.

Conectar el teléfono existente mediante depuración USB autorizada. Consultar su paquete y versión mediante adb shell dumpsys package cl.bradson.paradas.prueba. Obtener la ruta del APK instalado con adb shell pm path cl.bradson.paradas.prueba, copiar ese APK mediante adb pull y consultar su certificado con apksigner verify --print-certs. Comparar el applicationId y certificado con este candidato, y confirmar que el versionCode permita actualizar.

Antes de reemplazar: exportar y verificar un respaldo de los datos actuales. Si no coinciden identidad y firma, detener la actualización; nunca desinstalar ni borrar datos para forzarla. Tras una actualización compatible, comprobar los registros, imágenes, firmas, informes y ambas paradas contra el respaldo y probar exportación/compartir Word y PDF en Android.

El PDF descargado se verificó por cabecera de archivo; no se certifica la paginación completa ni la equivalencia visual de todas sus páginas con Microsoft Word. La imagen de firma de la prueba es sintética. El HTML portable regenerado no tuvo una prueba específica adicional.

## Instalación física posterior
El usuario autorizó desinstalar cl.bradson.paradas e instalar la variante nueva. Se guardó copia técnica de los datos con la app cerrada (instaladas/datos-originales-app-cerrada.tar); su restauración no está validada. Instalación manual confirmada por ADB en el teléfono 22101320G: cl.bradson.paradas.prueba, versionCode 20100, versionName 2.1.0-prueba.1; actividad MainActivity en primer plano y proceso activo. No se encontraron cierres fatales de esta app en el registro consultado. Es una instalación nueva, no una actualización con migración de datos. Pendientes pruebas funcionales completas de Word/PDF, firma y persistencia en Android.

