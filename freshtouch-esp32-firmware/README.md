# FreshTouch ESP32 firmware v3 — universal

Firmware ESP32 pensado para HX01, HX02, HX03 y máquinas futuras: **mismo
firmware, configuración individual por máquina** (Wi-Fi, `machineId`, mapa de
relés) guardada en NVS del propio dispositivo, no en el código fuente.

## Aislamiento

Este directorio es un proyecto independiente, con su propio `platformio.ini`
y sin ninguna dependencia hacia el resto del repositorio. No importa nada de
`fresh-touch-app/`, `freshtouch-core/`, ni de los archivos de HX01 en la raíz
(`app.js`, `config.js`, `index.html`, `styles.css`, `img/`) — y ninguno de
esos archivos fue tocado para construir esto. Mismo patrón ya usado por
`freshtouch-hx02-cubo-lab/` (que vive en su propio repositorio separado): si
más adelante se quiere mover esto a un repositorio propio, esta carpeta se
puede copiar tal cual, sin arreglar rutas.

**HX01 no fue tocado en ningún momento** — ni su código (`app.js`,
`config.js`), ni su firmware físico. El HTTP GET/POST que HX01 usa hoy se leyó
como referencia (documentado en `docs/PROTOCOL.md`) para mantener
compatibilidad, nunca se copió ni modificó ese código.

## ⚠️ Estado de verificación — leer antes de flashear nada

Este firmware se escribió en un entorno de desarrollo (sandbox en la nube)
cuyo acceso de red bloquea, por política, el registro de paquetes de
PlatformIO (`api.registry.platformio.org`) y las descargas de
`downloads.arduino.cc`/`espressif.github.io`. Eso significa:

- **La lógica que no depende de Arduino/ESP32** (`lib/core/` — el mapa de
  relés, el parser de `/relay`, la validación de configuración, el hash de la
  contraseña de admin, el JSON de `/status`, la política de reintento de
  Wi-Fi) **sí se compiló y probó de verdad**, con el compilador nativo del
  sistema (`g++`), 115 verificaciones — ver `test/native/`.
- **El código específico de Arduino/ESP32** (`src/*.cpp`, todo lo que usa
  `WiFi.h`/`WebServer.h`/`DNSServer.h`/`Preferences.h`) se escribió con
  cuidado contra APIs bien conocidas y estables, pero **nunca pasó por un
  compilador real para ESP32** — no hay garantía de que compile sin ajustes
  menores.

**Antes de flashear nada en HX02**, el primer paso es correr `pio run` (o
abrir el proyecto en Arduino IDE) desde una máquina con acceso normal a
internet, y corregir cualquier error de compilación que aparezca — ver
`docs/FIRST-FLASH-HX02.md`, que empieza exactamente por ahí.

## Estructura

```
freshtouch-esp32-firmware/
├── platformio.ini          configuración de build (ESP32, Arduino, sin dependencias externas)
├── src/                    código específico de Arduino/ESP32 (NO compilado aquí, ver arriba)
├── lib/core/               lógica portable, sin Arduino.h — SÍ compilada y probada aquí
├── test/native/            115 pruebas nativas (g++), corren en cualquier máquina
├── config/secrets.example.h  placeholder — este firmware no guarda secretos en código fuente
└── docs/
    ├── PROTOCOL.md          los endpoints HTTP, compatibilidad con HX01
    ├── PROVISIONING.md      cómo funciona el modo Access Point + portal cautivo
    ├── OTA-ARCHITECTURE.md  diseño de actualización OTA — NO implementado todavía, a propósito
    ├── SECURITY.md          separación firmware/configuración/secretos, límites conocidos
    └── FIRST-FLASH-HX02.md  guía paso a paso para mañana
```

## GPIO por defecto (confirmados por el propietario para HX01/HX02/HX03)

| Componente | GPIO | Nota |
|---|---|---|
| `puerta` (electroimán) | 25 | |
| `vapor` | 33 | |
| `secado` | 32 | |
| `luzuv` | 18 | |

Configurables por máquina (vía el portal de provisioning o `/admin`) — estos
son solo los valores por defecto. **La polaridad de los relés (active-HIGH vs
active-LOW) NO está confirmada** — ver `docs/FIRST-FLASH-HX02.md`, es lo
primero que hay que verificar físicamente antes de confiar en cualquier
comando de relé.

## Compilar y probar la lógica portable (esto sí funciona ya)

```bash
cd freshtouch-esp32-firmware
g++ -std=c++17 -Wall -Wextra -Werror -I lib/core/include -I test/native \
  lib/core/src/*.cpp test/native/*.cpp -o /tmp/ft_native_tests
/tmp/ft_native_tests
```
