# Cómo armar el APK en tu otra computadora

## ¿Ya armaste el APK una vez y solo necesitas el arreglo de "Descargar"?

Si ya tienes la carpeta con `android/` creada en la otra computadora (o sea,
ya hiciste los pasos 1 a 5 una vez), no hace falta repetir todo — solo:

1. Reemplaza `engine.js` y `package.json` en esa carpeta por los de este ZIP
   nuevo (el resto de los archivos no cambió).
2. Corre `npm install` de nuevo (para bajar los dos plugins nuevos que arregla
   la descarga: Filesystem y Share).
3. Corre `npx cap sync android`.
4. En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)** de
   nuevo, e instala el APK nuevo en el celular (reemplaza al anterior).

Si prefieres partir de cero con esta carpeta completa, sigue los pasos de
abajo tal cual.


Esta carpeta ya tiene todo listo: la app funciona 100% local (sin Firebase, sin
internet para los datos) y todas sus librerías (PDF, Word) están guardadas
adentro, no se cargan de internet. Solo falta que la otra computadora tenga las
herramientas para "envolver" esta app web en un APK de Android — eso lo hace
**Capacitor**, y para correrlo se necesita Node.js, Java (viene con Android
Studio) y el Android SDK (también viene con Android Studio).

## 1. Revisa que tengas instalado

- **Node.js** (v18 o más nueva) — [nodejs.org](https://nodejs.org), descarga la
  versión "LTS". Para revisar si ya está: abre una terminal (PowerShell) y
  escribe `node --version`.
- **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio).
  Al instalarlo, dejar que instale el "Android SDK" cuando lo pida (viene
  marcado por defecto). Java (JDK) viene incluido, no hay que instalarlo aparte.
- Abre Android Studio **una vez** después de instalarlo, para que termine de
  bajar los componentes del SDK (puede pedirte aceptar licencias — acepta todas).

## 2. Copia esta carpeta completa a la otra computadora

Cópiala tal cual (USB, Google Drive, lo que sea) — todos los archivos que ves
acá (`index.html`, `engine.js`, `local-db.js`, `package.json`,
`capacitor.config.json`, la carpeta `assets/`, etc.) tienen que llegar juntos.

## 3. Instalar las dependencias de Capacitor

Abre una terminal (PowerShell) **dentro de esta carpeta** ya copiada, y corre:

```bash
npm install
```

Esto descarga Capacitor (necesita internet solo para este paso).

## 4. Generar el proyecto de Android

```bash
npx cap add android
```

Esto crea una carpeta nueva `android/` con el proyecto nativo completo — no
hay que tocarla a mano, Capacitor la arma sola.

Cada vez que cambies algo en `index.html`/`engine.js`/etc. y quieras que se
refleje en el APK, corre:

```bash
npx cap sync android
```

## 5. Abrir en Android Studio y generar el APK

```bash
npx cap open android
```

Esto abre el proyecto directamente en Android Studio. Una vez adentro:

1. Espera a que termine de "sincronizar" (Gradle) la primera vez — puede
   tardar varios minutos.
2. Ve al menú **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. Cuando termine, aparece un aviso abajo a la derecha ("APK(s) generated
   successfully") con un link **"locate"** — ahí está el archivo `.apk`.
   También se puede encontrar directo en:
   `android/app/build/outputs/apk/debug/app-debug.apk`

## 6. Instalar el APK en tu celular

Ese `app-debug.apk` ya se puede pasar al celular (por USB, WhatsApp Web,
Google Drive, lo que sea) y abrirlo ahí para instalarlo. Android va a pedir
permiso para "instalar apps de origen desconocido" la primera vez — hay que
aceptarlo (es normal para un APK que no viene de Play Store).

## Notas

- Este APK **no necesita internet para nada de los datos** — todo se guarda
  en el celular mismo (fotos, informes, avance). Sí usaría internet si en el
  futuro agregas algo que lo requiera, pero tal como está hoy, funciona
  completo sin señal.
- El ícono y nombre de la app salen de `manifest.json` (`icons/icon-192.png` y
  `icons/icon-512.png`) — si quieres cambiar el ícono, reemplaza esos dos
  archivos por otros del mismo tamaño antes del paso 4.
- Este APK generado así (`assembleDebug`) es perfecto para instalarlo tú mismo
  y probarlo — no hace falta "firmarlo" para eso. Firmar un APK solo se
  necesita si algún día quieres subirlo a la Google Play Store.
