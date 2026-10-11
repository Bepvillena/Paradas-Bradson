# Cambios de la versión 2.0

## Interfaz

- Inicio con resumen, avance ponderado por horas-hombre, avance por área y acceso al registro.
- Navegación lateral en escritorio e inferior en celular.
- Lista de actividades con búsqueda por número de OT, nombre, subactividad, área o supervisor.
- Filtros por área y estado; orden por área, OT o avance.
- Alternancia entre lista y cronograma, conservando el resumen por supervisores.
- Detalle de actividad en una ventana con cierre visible, navegación por teclado y protección de comentarios/fotos pendientes.
- Informes organizados en secciones desplegables y acciones con jerarquía visual.
- Recursos con PETS, certificados y respaldo/restauración.
- Mensajes correctos sobre almacenamiento local y periodo planificado finalizado.

## Fiabilidad y rendimiento

- Escrituras IndexedDB confirmadas al completar la transacción.
- Lectura y modificación de campos dentro de una transacción única para evitar sobrescrituras simultáneas.
- Notificación de cambios entre pestañas del mismo origen.
- Captura del turno y el valor antes del guardado diferido del porcentaje.
- Un avance explícito de 0% ya no elimina el campo ni recupera el porcentaje anterior.
- Comentarios y fotos asociados al turno seleccionado, con contexto capturado antes de tareas asíncronas.
- Confirmación de creación de informes después de guardar, con bloqueo de doble envío.
- Actualización de listas agrupada por fotograma, y eliminación de un refresco periódico innecesario.
- Estado local reconstruido desde los registros actuales para reflejar eliminaciones.
- Respaldo ZIP de los documentos y archivos; validación previa y restauración en transacción atómica.
- Caché de plantilla Word, logos e iconos para uso offline.
- Versiones coherentes en caché y actualización ofrecida al usuario, sin recarga automática mientras trabaja.

## Entrega

Código original actualizado, nueva capa de interfaz independiente, archivo portable, generador del portable, pruebas e instrucciones. No se añadieron dependencias remotas al funcionamiento de la app.
