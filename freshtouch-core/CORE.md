# FreshTouch CORE — marcador de entorno esperado

Este archivo existe únicamente para que `src/security.js` pueda verificar,
en tiempo de ejecución, que el proceso corre dentro del directorio
`freshtouch-core/` esperado — el mismo principio que usa
`hydrox-ai/runtime/security-config.js::assertExpectedRepo()`, adaptado a
este sistema (sin copiar su código: aquí no hay ni `claude` CLI, ni
catálogo de agentes, ni invocación de modelo — el "entorno esperado" es
simplemente "esta carpeta, no la app de la tablet").

Si este archivo no existe donde `security.js` lo espera, el CORE se niega
a arrancar. No mover ni renombrar sin actualizar `src/security.js`.

## Qué es FreshTouch CORE

Sistema de reporte y autorización para la flota de máquinas FreshTouch
(HX01, HX02, HX03...). Responde `/status` por Telegram, respetando
permisos por usuario/máquina, y audita cada consulta.

## Qué NO es

- No es parte de la aplicación que corre en la tablet de cada máquina
  (`app.js`, `config.js`, `index.html`, `freshtouch_app.html`, `styles.css`,
  `img/`, en la raíz del repositorio). Este directorio no importa nada de
  esos archivos, y esos archivos no importan nada de aquí.
- No controla relés, ESP32, ni el ciclo de lavado.
- No procesa pagos ni conoce Cubo.
- No modifica ningún escenario de Make.
- No está conectado a producción todavía — etapa de laboratorio, con datos
  de prueba explícitamente marcados como tales.

## Aislamiento físico

Este directorio puede copiarse tal cual a un repositorio propio en el
futuro — no tiene ninguna dependencia de ruta hacia el resto de
`freshtouch-hx01`. Ver `README.md` para el detalle de migración.
