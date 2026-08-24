# Configuración de máquina — FreshTouch App HX02+

## Separación de cuatro cosas (regla de esta fase, no negociable)

1. **Configuración pública/no secreta** — este archivo. `machineId`,
   nombre, ubicación, owner, tenant, ESP32, precios, y los identificadores
   de Cubo que NO son secretos (`cuboEnvironment`, `cuboPosId`,
   `cuboPosSerial`). Validado por `machineConfigContract.js`, que además
   **rechaza activamente** el archivo si detecta una clave que parezca un
   secreto (`cuboApiKey`, `apiKey`, `secret`, `token`, `password`).
2. **Secretos** — NUNCA en este archivo, NUNCA en Git. Fase 6 los mueve a
   Android Keystore, gestionados exclusivamente a través de
   `nativeBridge.saveSecret()` (que ni siquiera en el mock de esta fase
   retiene el valor).
3. **Estado operativo** — vive en `operationState/` y en los propios
   proveedores (`payment/`, `esp32/`) en memoria, mientras la app corre. No
   es configuración, no se persiste en este archivo.
4. **Diagnóstico** — vive en `nativeBridge.getDiagnostics()`. Tampoco es
   configuración.

## Cómo agregar una máquina nueva (HX03, HX04...)

Copiar `machine.config.example.json`, completar los campos, cambiar
`machineId`/`machineName` — **sin tocar ningún archivo de código**. Ese es
el objetivo explícito de este esquema.
