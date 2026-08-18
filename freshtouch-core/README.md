# FreshTouch CORE — Etapa 1 (laboratorio)

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
│   ├── db/
│   │   ├── schema.sql              Machine, Owner, Tenant, AuthorizedUser, Permission, AuditEvent
│   │   ├── connection.js           único lugar que abre la base (node:sqlite)
│   │   └── seed.js                 datos de prueba (Moisés, Owner HX02, Tenant HX02)
│   ├── repositories/               una función por consulta, sin SQL disperso por el resto del código
│   ├── auth/
│   │   └── authorize.js            ÚNICO lugar que decide qué máquinas puede ver un usuario
│   ├── status/
│   │   ├── testFixtureData.js      ⚠️ datos ficticios, a reemplazar en Etapa 2
│   │   └── statusService.js        arma la respuesta a partir de lo ya autorizado
│   └── telegram/
│       ├── handleUpdate.js         punto de entrada con forma de Telegram Update
│       └── formatStatus.js         formato de texto (función pura)
├── data/                           vacío — aquí viviría un .db de laboratorio si se usa uno con archivo (gitignored)
└── tests/
    └── authorization.test.js       las 8 pruebas pedidas
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
npm test     # node --test tests/  — 8 de 8 pruebas, sin dependencias
npm run demo # simula 4 usuarios preguntando /status
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
  desde `demo.js`.
- El resumen automático de las 17:00.
- El evento de reporte de ciclo desde `app.js` (cambio a HX01, requiere
  autorización explícita aparte, según ya se detalló en el informe de
  arquitectura anterior).
