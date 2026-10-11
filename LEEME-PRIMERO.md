# Paradas Bradson · versión 2.0

## Abrir la app ahora

1. Extrae el ZIP completo.
2. Abre **ABRIR-PARADAS.html** con Chrome o Microsoft Edge en tu computadora.
3. Entra en **Actividades**, busca una OT y pulsa sobre ella.
4. Selecciona el turno, abre una subactividad y registra su porcentaje.
5. Para comentarios y fotos, utiliza **Guardar avance de esta actividad**.

El archivo portable incluye estilos, librerías y plantilla Word. No necesita instalar paquetes para abrirlo. El navegador debe permitir almacenamiento local. En algunos dispositivos móviles es preferible instalar la PWA o utilizar el APK.

## Si ya tienes datos en la versión anterior

Los registros y las fotos viven en el navegador o la instalación Android, no dentro del ZIP del código.

- Para conservarlos, actualiza los archivos en **la misma dirección web** o actualiza **la misma instalación Android**, sin borrar sus datos.
- Esta versión utiliza el mismo nombre de base de datos y las mismas claves de la anterior.
- Abrir la app desde otra dirección, otro navegador o un archivo diferente puede mostrar un almacenamiento distinto y vacío.
- Después de actualizar, entra en **Recursos → Descargar respaldo**. El ZIP de respaldo incluye tus registros y archivos locales.
- **Restaurar respaldo** valida el archivo y pide confirmar antes de reemplazar los datos. Solo acepta respaldos de esta parada. El límite implementado es de 300 MB; el límite práctico también depende de la memoria disponible.
- El ZIP del proyecto y el ZIP de respaldo son archivos diferentes.

## Navegación

| Pantalla | Para qué sirve |
|---|---|
| Resumen | Ver cantidades, avance ponderado por HH, áreas y actividades por registrar. |
| Actividades | Buscar OT, descripción o supervisor; filtrar por área y estado; alternar Lista/Cronograma. |
| Curva S | Comparar avance planificado y registrado por turno, y exportar la imagen. |
| Informes | Crear un informe, completar sus secciones, editarlo sobre el documento y descargar Word o PDF borrador. |
| Recursos | Agregar PETS, consultar certificados cuando tengan enlace y respaldar/restaurar datos. |

En computadora hay menú lateral; en celular, navegación inferior. Los porcentajes se guardan automáticamente. El botón del formulario guarda comentarios y fotos. En el informe los campos se guardan automáticamente; las fotos de preparativos tienen su botón Guardar.

## Ejecutar desde una dirección local estable

Con Python instalado, abre una terminal en esta carpeta:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Abre http://127.0.0.1:8765/index.html. Usa siempre la misma dirección y puerto para conservar el mismo almacenamiento. Para desarrollo, el navegador puede conservar una versión en caché; acepta la actualización ofrecida por la app después de guardar.

## PWA y Android

- Los archivos fuente siguen siendo HTML, CSS y JavaScript sin paso de compilación web.
- Para PWA, publica esta carpeta en tu alojamiento HTTPS habitual.
- La primera carga necesita descargar los recursos antes de poder usarlos offline, incluida la plantilla Word.
- El Service Worker mantiene una versión coherente en caché y ofrece actualizar sin recargar automáticamente mientras escribes.
- El workflow `.github/workflows/apk.yml` ya incorpora `workspace.js` y `workspace.css` al empaquetar Android.
- El APK no se compiló ni se probó en un teléfono físico en esta entrega. Mantén el identificador de `capacitor.config.json` y la firma de la instalación original al distribuir una actualización.

## Archivos principales

- `workspace.js` y `workspace.css`: nueva navegación, paneles, búsqueda, filtros, accesibilidad y respaldo.
- `engine.js`: lógica original de mantenimiento e informes, con correcciones de guardado y estado.
- `local-db.js`: almacenamiento IndexedDB, transacciones atómicas y respaldo/restauración.
- `sw.js`: caché offline y actualización controlada.
- `seed-data.js`: planificación original, conservada.
- `assets/plantilla-informe.docx`: plantilla original, conservada byte por byte.
- `build-portable.py`: regenera `ABRIR-PARADAS.html` después de editar los fuentes.
- `VALIDACION.md`: alcance de las pruebas realizadas y limitaciones.

Después de modificar el proyecto:

```bash
python build-portable.py
```

Para publicar nuevos cambios del código fuente, cambia también la versión de `CACHE_NAME` en `sw.js`.

## Alcance de los indicadores

El resumen muestra el avance de las actividades planificadas vigentes ponderado por sus HH; excluye canceladas y emergentes de ese porcentaje. La Curva S conserva su cálculo original contra la base de planificación, incluyendo las curvas de emergentes. Por ello, sus porcentajes pueden diferir si se cambia el alcance.

La planificación entregada corresponde a agosto de 2026. La app muestra “Periodo finalizado” según la fecha del equipo, sin afirmar que todas las actividades hayan terminado. Un 0% significa que no existe avance registrado o que se registró explícitamente cero; no se añadieron avances ficticios.

## Actualización 2.1.0

La versión fuente incorpora cambios en el encabezado de exportación, carga de firma y selector/catálogo local de paradas. El APK anterior incluido en la recuperación es 2.0.0 y **no contiene esos cambios**. Esta sesión no pudo compilar un APK 2.1.0 porque el proceso Gradle no pudo conectarse a Google Maven/Maven Central. Consulta `CAMBIOS-2.1.0.md` e `INSTRUCCIONES-APK.md` antes de instalar; valida que el APK se firme con la misma clave y applicationId de tu instalación si necesitas conservar datos.
