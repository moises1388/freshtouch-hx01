# Arduino IDE — FreshTouch ESP32 v3

`FreshTouchESP32v3/FreshTouchESP32v3.ino` es el mismo firmware de
`freshtouch-esp32-firmware/` (`lib/core/` + `src/`) fusionado en un solo
archivo, para poder abrirlo directamente en Arduino IDE. La carpeta se llama
igual que el archivo — requisito de Arduino IDE — no renombrar ninguno de
los dos por separado.

## Placa

**Tools > Board > "ESP32 Dev Module"** (paquete **"esp32" by Espressif
Systems**, instalado desde Boards Manager). Si no aparece: Tools > Board >
Boards Manager, buscar "esp32", instalar. Si tu Arduino IDE no lo encuentra
ahí, agregar esta URL en File > Preferences > "Additional Boards Manager
URLs": `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`

"ESP32 Dev Module" es un default genérico (equivalente al `board = esp32dev`
de `platformio.ini`) — ajustar si la inspección física de HX02 confirma un
módulo distinto (ESP32-S3, ESP32-C3, etc.).

## Librerías externas

**Ninguna.** `WiFi.h`, `WebServer.h`, `DNSServer.h`, `Preferences.h` y
`esp_system.h` vienen incluidas con el paquete de placas ESP32 — no instalar
nada desde Library Manager. Si Arduino IDE se queja de no encontrar alguno
de estos headers, es señal de que el paquete de placas ESP32 no se instaló
correctamente (ver arriba), no de que falte una librería de terceros.

## Otras opciones de Tools relevantes

- **Partition Scheme**: el default (`Default 4MB with spiffs` o similar) es
  suficiente — este firmware no usa OTA todavía (ver
  `../docs/OTA-ARCHITECTURE.md`), así que no hace falta un esquema con
  particiones A/B.
- **Upload Speed**: el default (921600) suele funcionar; si falla la subida,
  bajar a 115200.

## Antes de compilar

Ver `../docs/FIRST-FLASH-HX02.md` — el primer paso es correr Verify/Compile
(✓) y revisar cualquier error. Este archivo nunca se compiló contra un
toolchain real de ESP32 (ver el aviso al inicio del propio `.ino`).
