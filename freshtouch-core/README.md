# FreshTouch CORE — Etapa 1 (laboratorio) + revisión formal (commit 960592c)

Este PR corrige los hallazgos de la revisión formal de seguridad y código
hecha sobre el commit `960592c` (Etapa 1 original). No conecta nada real
todavía — sigue siendo laboratorio con datos de prueba. Ver la sección
"Correcciones de la revisión formal" más abajo para el detalle de qué
cambió y por qué.

Sistema de autorización y reporte para la flota de máquinas FreshTouch
(HX01, HX02, HX03...). Responde `/status` por Telegram respetando permisos
por usuario/máquina, y audita cada consulta.

## Aislamiento de HX01

**HX01 en producción no fue tocado.** Ningún archivo fuera de esta carpeta
(`freshtouch-core/`) fue creado, editado ni borrado. `app.js`, `config.js`,
`index.html`, `freshtouch_app.html`, `styles.css` e `img/`, en la raíz del
repositorio, pertenecen a la app de la tablet y no tienen relación con este
código — ni este código los importa, ni ellos importan nada de aquí (la
prueba 7 en `tests/authorization.test.js` lo verifica automáticamente).

No se creó, movió, reutilizó ni mostró ninguna credencial. No se conectó
nada con HX01, Cubo, Make, Google Sheets ni el ESP32. No se activó ningún
servidor ni token real de Telegram.

## Correcciones de la revisión formal (este PR)

| # | Hallazgo | Corrección |
|---|---|---|
| 1 | `handleTelegramUpdate` asumía que todo Update trae `.message` | `extractSupportedMessage()` valida la forma antes de leer nada; `edited_message`, `channel_post`, `callback_query` y mensajes sin texto se ignoran de forma segura, nunca lanzan |
| 2 | `assertDataLocationIsSafe()` existía pero nadie la llamaba | `createDatabase()` la invoca ella misma, antes de abrir cualquier ruta — no depende de que el llamador se acuerde |
| 3 | `assertExpectedEnvironment()` solo se aplicaba en `demo.js` | Ahora también se invoca al inicio de `createDatabase()` y `handleTelegramUpdate()` — los dos puntos de entrada reales de la librería |
| 4 | `machine.status` no tenía ningún efecto | Política implementada: una máquina `suspended` nunca aparece como disponible para `owner`/`tenant`/`technician`; `super_admin` sí ve que existe y que está suspendida. Ningún dato se borra — es una bandera de lectura, no un filtro destructivo |
| 5 | No había preparación para validar que un webhook viene realmente de Telegram | `src/telegram/webhookAuth.js` (comparación en tiempo constante) + `src/config.js` (lee el secreto de una variable de entorno, nunca hardcodeado) — preparado y probado con secretos ficticios, **no conectado a ningún servidor todavía** |
| 6 | Sin pruebas del rol `technician` | Agregado a los datos de prueba (`seed.js`) y cubierto en `tests/security.test.js` |
| 7 | Pruebas 7 y 8 duplicaban el mismo recorrido de directorio | Extraído a `tests/helpers/scanSourceFiles.js`, usado por ambas |

## Qué es esta etapa (y qué no es)

Es la base mínima para demostrar, con datos de prueba, el flujo completo:

```
Telegram (simulado) → FreshTouch CORE → AuthorizedUser → Permission → Machine → /status
```

No es: un bot de Telegram real (no hay servidor HTTP, no hay token), no
tiene ventas reales (los montos de `/status` son un fixture fijo,
marcado explícitamente como "DATOS DE PRUEBA"), y no tiene `Operation`,
`Sale`, `Incident` ni `DailyReport` todavía — quedaron fuera de esta etapa
a propósito.

## Estructura

```
freshtouch-core/
├── README.md                      este archivo
├── CORE.md                        marcador de entorno esperado (ver src/security.js)
├── package.json                   cero dependencias externas
├── demo.js                        simula 4 mensajes /status y los imprime
├── src/
│   ├── security.js                principios de seguridad (no copia security-config.js de Runtime v1)
│   ├── config.js                  única lectura de variables de entorno (secretos, nunca hardcodeados)
│   ├── db/
│   │   ├── schema.sql              Machine, Owner, Tenant, AuthorizedUser, Permission, AuditEvent
│   │   ├── connection.js           único lugar que abre la base (node:sqlite) — aplica los guardias de security.js
│   │   └── seed.js                 datos de prueba (Moisés, Owner HX02, Tenant HX02, Técnico, HX03 suspendida)
│   ├── repositories/               una función por consulta, sin SQL disperso por el resto del código
│   ├── auth/
│   │   └── authorize.js            ÚNICO lugar que decide qué máquinas puede ver un usuario (respeta machine.status)
│   ├── status/
│   │   ├── testFixtureData.js      ⚠️ datos ficticios, a reemplazar en Etapa 2
│   │   └── statusService.js        arma la respuesta a partir de lo ya autorizado
│   └── telegram/
│       ├── handleUpdate.js         punto de entrada con forma de Telegram Update — valida la forma, aplica los guardias
│       ├── formatStatus.js         formato de texto (función pura)
│       └── webhookAuth.js          preparación (no activación) de la validación de secreto de webhook
├── data/                           vacío — aquí viviría un .db de laboratorio si se usa uno con archivo (gitignored)
└── tests/
    ├── authorization.test.js       las 8 pruebas originales de Etapa 1
    ├── security.test.js            las pruebas de la revisión formal (hallazgos 1-6)
    └── helpers/scanSourceFiles.js  recorrido de archivos compartido (antes duplicado, hallazgo 7)
```

## Tecnología

**Node.js + `node:sqlite`** (built-in desde Node 22.5, experimental). Cero
paquetes que instalar — nada que aprobar ni que auditar como dependencia
externa. Es exactamente el motor que ya se recomendó como base del futuro
CORE ($0, Node+SQLite, migrable a PostgreSQL cuando el volumen lo
justifique) en el informe de arquitectura previo. Se usa `:memory:` por
defecto (tests y demo) — no se creó ningún archivo `.db` persistente en
esta etapa.

## Cómo correrlo

```bash
cd freshtouch-core
npm test     # node --test tests/*.test.js — 28 de 28 pruebas, sin dependencias
npm run demo # simula 4 usuarios preguntando /status (incluye una máquina suspendida)
```

## Cómo migrar esto a un repositorio propio (cuando corresponda)

Esta carpeta no tiene ninguna dependencia de ruta hacia el resto de
`freshtouch-hx01` — se puede copiar tal cual a un repositorio nuevo. Los
únicos tres ajustes al hacerlo:
1. Actualizar `CORE_ROOT` en `src/security.js` si cambia la profundidad
   relativa a la raíz del nuevo repo (hoy asume que `freshtouch-core/` es
   la raíz de sí misma, así que en realidad no cambiaría nada).
2. Mover `CORE.md` junto con el resto — el marcador de entorno viaja con
   la carpeta.
3. Si para entonces ya existe un archivo `.db` de datos reales (Etapa 2+),
   decidir explícitamente si se migra o se re-crea desde cero — nunca
   copiarlo por accidente junto con el código.

## Qué falta (Etapa 2, no autorizada todavía)

- Tablas reales `Operation`, `Sale`, `Incident`, `DailyReport` reemplazando
  `testFixtureData.js`.
- Conexión real de lectura a la hoja de Google Sheets existente (sin
  escribirla).
- Servidor webhook real de Telegram (con su propio token, nunca uno ya
  expuesto) — hoy `handleTelegramUpdate` se invoca solo desde pruebas y
  desde `demo.js`. `webhookAuth.js` ya queda preparado para validar el
  secreto una vez que ese servidor exista; falta conectarlo.
- El resumen automático de las 17:00.
- El evento de reporte de ciclo desde `app.js` (cambio a HX01, requiere
  autorización explícita aparte, según ya se detalló en el informe de
  arquitectura anterior).
