# Paradas Bradson · APK de prueba con logo PB

Versión fuente: 2.1.0-prueba.1 (20100).

**APK incluido en el ZIP anterior:** 2.0.0-prueba.1; no incluye las modificaciones 2.1.0. El APK 2.1.0 no se pudo compilar en esta sesión porque Gradle no alcanza Maven/Google Maven desde el entorno.
Paquete: cl.bradson.paradas.prueba.

Identificador Android: `cl.bradson.paradas.prueba`. El APK existente corresponde a una variante de prueba y no garantiza actualizar instalaciones firmadas por otra clave o con otro identificador. No desinstales una instalación con datos hasta validar que el APK de reemplazo tenga la misma identidad y firma.

## Compilar APK 2.1.0

Sigue los pasos de Compilar de nuevo, instala el APK compilado solo si corresponde a la misma identidad y firma de tu instalación actual. No uses el APK 2.0 como si fuera la actualización 2.1.

El paquete declara Android 5.1 o superior; la compatibilidad real depende también de Android System WebView y requiere pruebas en tu teléfono. El APK 2.0.0 se compiló y verificó anteriormente; no se realizó una prueba en un dispositivo Android físico. No es el APK actualizado de esta entrega.

## Cambios de esta entrega

- Nuevo símbolo PB con flecha de avance, generado con la herramienta integrada de imágenes.
- Iconos para las cinco densidades de Android, pantalla inicial y marca lateral en la interfaz web.
- Permisos de almacenamiento limitados a Android 10 y anteriores para exportar documentos.
- Declaración de apertura de documentos con aplicaciones externas.
- Identidad independiente y clave de firma de desarrollo propia para esta variante de prueba.

Los errores mencionados sin descripción todavía requieren pasos para reproducirlos. Envía la pantalla, qué tocaste, qué ocurrió y qué esperabas.

## Compilar de nuevo

Requiere Node.js 20, JDK 17, Android SDK 34, Build Tools 34.0.0 y acceso a los repositorios de dependencias.

1. Ejecuta `npm ci` en la carpeta del proyecto.
2. Ejecuta `node scripts/prepare-android.cjs`.
3. Ejecuta `npx cap sync android` (el proyecto Android ya está incluido).
4. Configura `ANDROID_HOME` o `android/local.properties` con tu SDK.
5. Ejecuta `sh android/gradlew -p android :app:assembleDebug --no-daemon`.
6. Recoge `android/app/build/outputs/apk/debug/app-debug.apk`.

En Windows puedes ejecutar `android\gradlew.bat -p android :app:assembleDebug`.

La clave `android/app/paradas-prueba.keystore` es exclusivamente de desarrollo; usa las credenciales estándar de debug indicadas en build.gradle. Se conserva para firmar actualizaciones compatibles de esta misma variante. No usar esta clave para una publicación de producción. Para actualizar sin perder datos conserva la clave y el applicationId, e incrementa versionCode.

El ZIP de código no incluye node_modules, SDK, cachés, compilaciones ni rutas locales del entorno. El workflow incluido se inicia manualmente y no se ha ejecutado en GitHub durante esta entrega.

## Logo

Original: assets/logo-paradas-bradson.png.
Brief utilizado: monograma PB geométrico, ruta ascendente, marfil y verde menta sobre azul petróleo, legible como icono pequeño y con margen para el recorte circular de Android.
