# Validación de la versión 2.0

Fecha: 26 de septiembre de 2026.

## Verificado en navegador Chromium automatizado

La batería principal terminó con 23 comprobaciones aprobadas y sin errores JavaScript en los recorridos ejecutados. Su resultado se incluye en `tests/resultado-validacion.json`.

- Carga de las 33 actividades de la planificación original.
- Búsqueda por OT, resultados vacíos y filtro por área.
- Registro de avance por subactividad y turno.
- Cambio rápido de turno mientras hay un guardado pendiente: conserva el turno original.
- Registro explícito de 0% después de un porcentaje anterior.
- Comentarios guardados en la OT y el turno seleccionados.
- Persistencia de avances y comentarios después de recargar.
- Escrituras concurrentes de campos distintos sin pérdida de datos.
- Alta de una emergente, filtrado y avance directo.
- Creación y apertura de un informe.
- Generación de Word con la plantilla original: documento ZIP válido, XML principal bien formado, código en las partes del documento y comentario registrado.
- Respaldo ZIP con registros y archivos; restauración de ambos; rechazo de archivos inválidos.
- Descarga de respaldo desde la interfaz.
- Resumen, Actividades, Curva S, Informes y Recursos sin desbordamiento horizontal a 360, 390, 768, 1024 y 1440 px.
- Apertura y cierre del detalle en móvil.
- Recarga sin conexión y acceso offline a la plantilla Word.

Comprobaciones complementarias:

- Elegir un turno antes de abrir una subactividad mantiene ese turno.
- Adjuntar una imagen, guardarla y mostrarla desde almacenamiento local.
- Cancelar el cierre de un comentario pendiente conserva el borrador.
- Campos del formulario de informe guardados correctamente.
- Editor visual de Word abierto mostrando el nombre introducido en el formulario.
- `ABRIR-PARADAS.html` abierto mediante `file://`: carga de las 33 actividades, escritura, recarga con persistencia y plantilla embebida disponible.

Se inspeccionaron visualmente capturas de escritorio, celular y formulario de informe. Las capturas de entrega muestran una base limpia; los registros de prueba no forman parte de los archivos distribuidos.

## Conservación del proyecto

Se compararon con el ZIP original: `seed-data.js`, `pets-links.js`, `capacitor.config.json` y `assets/plantilla-informe.docx` permanecen iguales byte por byte.

## Límites de esta validación

- No se compiló ni ejecutó el APK en un teléfono Android físico.
- No se abrió el Word generado en Microsoft Word de Windows. Se validó el XML y se probó el visor web; esto no certifica paginación idéntica en todas las versiones de Office.
- No se verificó cada combinación posible de anexos, firmas, polines y documentos. No se modificó la lógica de esos cálculos ni el contenido de la planificación.
- La app continúa siendo local. El respaldo permite trasladar datos; no hay sincronización de equipos por internet.
- La persistencia depende del navegador y de conservar sus datos. El archivo portable y una instalación web pueden tener almacenamientos separados.

## Repetir las pruebas principales

Con Node.js y npm instalados:

```bash
npm install
npx playwright install chromium
npm test
```

La prueba utiliza una sesión aislada del navegador y un servidor temporal en el puerto 8765. No modifica los datos de tu perfil habitual. El archivo `tests/integration.cjs` prueba la planificación entregada; si cambias el número de actividades base, actualiza esa expectativa.
