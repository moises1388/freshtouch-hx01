# Protocolo HTTP

## Compatibilidad — NO cambiar sin documentarlo y sin autorización

Estos cuatro endpoints reproducen exactamente la forma que ya usa `app.js` de
HX01 (leído como referencia, nunca modificado ni copiado literal — la
implementación del lado del ESP32 es nueva):

### `GET /relay?comp=<componente>&state=0|1`

Enciende (`state=1`) o apaga (`state=0`) el relé del componente indicado.

- `comp` debe ser uno de los componentes configurados (por defecto: `vapor`,
  `secado`, `luzuv`, `puerta` — ver README para los GPIO). Un componente
  desconocido devuelve `404`.
- `state` debe ser literalmente `"0"` o `"1"` — cualquier otro valor (`"true"`,
  `"2"`, vacío) devuelve `400`. Esta validación está probada en
  `test/native/test_relay_command.cpp`.
- Éxito: `200`, cuerpo `ok`.

### `GET /status`

Devuelve JSON con el estado del dispositivo — ver forma completa abajo.
Este endpoint **no existía en HX01** (agregado en Fase 3 de la app web,
mock, y ahora implementado de verdad aquí).

### `POST /cycle-done?tipo=<tipo>`

Compatibilidad con HX01: se acepta, se registra, se incrementa
`totalCycles` en NVS. Este firmware no distingue lógica distinta según
`tipo` — solo lo recibe y lo cuenta, igual de simple que en HX01.

## Nuevo en v3

### `GET /status` — forma exacta del JSON

```json
{
  "machineId": "HX02",
  "ip": "192.168.1.50",
  "rssi": -55,
  "uptimeSeconds": 3661,
  "firmwareVersion": "3.0.0-hx02-discovery",
  "totalCycles": 42,
  "wifiConnected": true,
  "relays": [
    {"component": "vapor", "gpio": 33, "on": false},
    {"component": "puerta", "gpio": 25, "on": true}
  ]
}
```

Construido por una función pura (`lib/core/src/StatusSnapshot.cpp`), probada
en `test/native/test_status_snapshot.cpp` — no depende de ninguna librería
JSON externa a propósito (mantiene `platformio.ini` sin dependencias de
terceros).

### `/admin` — panel protegido (ver docs/SECURITY.md para el modelo de auth)

- `GET /admin` — pantalla de login, o el panel si ya hay sesión activa.
- `POST /admin/login` — `password` -> cookie de sesión (30 min).
- `POST /admin/logout`
- `POST /admin/relay-test` — `comp=<componente>` — enciende 1s y apaga,
  requiere sesión. Marcado en la interfaz como "PRUEBA TÉCNICA".
- `POST /admin/save-config` — `machineId`, `ssid`, `pass`, `newAdminPass`
  (todos opcionales — solo se actualiza lo que venga no vacío), requiere
  sesión.
- `POST /admin/factory-reset` — borra toda la NVS, reinicia. Requiere
  sesión y confirmación explícita en la interfaz.

## Qué NO se hizo

No se agregaron endpoints de máquina nuevos (ej. "iniciar ciclo completo
desde el ESP32") — la autorización de esta fase pide explícitamente no
inventar funciones nuevas de la máquina. El ESP32 sigue siendo un ejecutor de
comandos de relé individuales; la orquestación del ciclo (qué relé quándo)
sigue viviendo en la app (ver `fresh-touch-app/web/src/main.js`,
`CYCLES`), igual que en HX01.
