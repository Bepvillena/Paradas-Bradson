# Paradas Bradson · versión de escritorio (Windows)

Es la MISMA app (mismo `engine.js`, misma base de datos local, mismos informes),
empaquetada con Electron para que corra como programa de Windows normal, con
diálogos nativos de "Guardar como" y "Abrir archivo" — sin las restricciones
del WebView de Android.

## Compilar (con Node.js instalado)

Desde la carpeta `proyecto/`:

```bash
node scripts/prepare-electron.cjs
cd electron
npm install
npm run dist:win
```

El instalador queda en `electron/dist/*.exe`.

## Compilar sin Node.js instalado (GitHub Actions)

El workflow `.github/workflows/exe.yml` hace exactamente esos mismos pasos en
un runner de Windows en la nube. Se dispara solo (`workflow_dispatch`) o al
subir cambios a `main` que toquen el código web o la carpeta `electron/`.
El `.exe` queda como artefacto descargable: pestaña **Actions** → la
ejecución más reciente → **Artifacts** → `paradas-bradson-escritorio-windows`.

## Qué cambia respecto al APK de Android

- `engine.js` ahora revisa primero `window.escritorio` (ver `preload.js`): si
  existe, usa el diálogo nativo de Windows para guardar Word/PDF/respaldos en
  la carpeta que el usuario elija, en vez de la ruta fija de Android.
- Importar un paquete ZIP de parada, restaurar un respaldo o adjuntar fotos ya
  funciona igual que en cualquier programa de escritorio (el `<input type=file>`
  normal de la página), sin necesidad de código adicional: Electron no tiene
  las restricciones del WebView de Android para eso.
- Todo lo demás — datos guardados en el dispositivo (IndexedDB), Curva S,
  informes, firma, catálogo de paradas — es exactamente el mismo código.

## Pendiente

- Ícono: usa `www/icons/icon-512.png`; conviene generar un `.ico` propio de
  Windows con varias resoluciones para que se vea nítido en la barra de tareas.
- No se firmó el instalador con un certificado de código: Windows SmartScreen
  puede advertir "Editor desconocido" la primera vez. Para distribución interna
  esto es aceptable; para distribución más amplia se necesitaría un certificado
  de firma de código.
- No se probó en un Windows real todavía (este entorno no tiene Node.js para
  compilar ni ejecutar Electron). Antes de usarlo en producción, compilar con
  el workflow y probar: abrir Word, PDF, respaldo, importar paquete ZIP y
  persistencia de datos tras cerrar y reabrir la app.
