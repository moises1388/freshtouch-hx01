# Arquitectura OTA — diseño únicamente, NO implementado

La autorización de esta fase es explícita: preparar la arquitectura y
documentarla, pero no implementarla — "NO hacerlo destructivo ni
implementarlo de manera insegura". `src/OtaManager.h` existe como el punto
de enganche en `main.cpp` (`begin()`/`tick()`, ambos vacíos hoy) para que,
el día que se implemente, no haga falta tocar el flujo principal otra vez.

## Por qué no se implementó ahora

Un OTA mal hecho puede dejar una máquina física inoperable (un "brick") si
algo falla a medio proceso, o puede ser un vector de ataque serio si no
verifica el origen del binario. Ninguna de las dos cosas es aceptable para
implementar sin verificación cuidadosa — y ese cuidado no se le puede dar
correctamente en la misma sesión que ni siquiera pudo compilar el firmware
base contra el toolchain real (ver README.md). Mejor documentar el diseño
ahora y construirlo con calma, con hardware real disponible para probar cada
paso.

## Diseño propuesto (para cuando se autorice implementarlo)

1. **Particiones A/B** (`min_spiffs` o una tabla de particiones custom con
   `ota_0`/`ota_1`) — el ESP32 ya soporta esto de fábrica vía
   `Update.h`/`esp_ota_ops`. El firmware nuevo se escribe en la partición
   inactiva; el bootloader decide cuál partición arrancar.
2. **Origen del binario**: servido desde un endpoint HTTPS controlado por
   Hydrox (probablemente `freshtouch-core`, cuando llegue esa fase — fuera
   de alcance de este firmware hoy), nunca desde una URL arbitraria pasada
   por parámetro sin validar.
3. **Verificación de integridad y origen antes de aplicar**:
   - Hash SHA-256 del binario descargado, comparado contra un valor
     esperado servido por separado (nunca confiar solo en el `Content-Length`
     o en que la descarga "terminó sin error").
   - Firma criptográfica del binario (ej. firma Ed25519 con una clave
     pública embebida en el firmware, verificada con `mbedtls`, ya
     disponible en el core sin agregar dependencias) — el ESP32 rechaza
     cualquier binario no firmado por Hydrox.
4. **Rollback automático**: `esp_ota_mark_app_valid_cancel_rollback()` (o
   equivalente) solo se llama después de que el firmware nuevo reporta salud
   OK (ej. conecta a Wi-Fi y responde `/status` correctamente) dentro de una
   ventana corta tras arrancar; si no, el bootloader vuelve solo a la
   partición anterior en el siguiente reinicio — nunca hay que ir
   físicamente a rescatar una máquina por un OTA fallido.
5. **Disparo manual, no automático al inicio** — al menos en una primera
   versión: `/admin` expone un botón "Buscar actualización" que consulta el
   endpoint, muestra la versión disponible, y pide confirmación explícita
   antes de aplicar. Actualización automática silenciosa es un paso
   posterior, solo después de que el flujo manual se haya probado en
   hardware real varias veces.

## Qué NO se decidió todavía (a propósito)

- Dónde vive exactamente el servidor de binarios (¿`freshtouch-core`?
  ¿GitHub Releases con un proxy? ¿otra cosa?) — depende de decisiones de
  Fase 7 (CORE/multi-máquina) que todavía no se han tomado.
- Cómo se gestiona/rota la clave privada de firma — es una decisión de
  seguridad operativa, no de este firmware.
