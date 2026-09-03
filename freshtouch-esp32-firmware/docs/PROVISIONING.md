# Provisioning — modo Access Point + portal cautivo

## Cuándo se activa

1. **Primer arranque** — NVS vacía, sin SSID guardado (`hasWifiCredentials()`
   en `lib/core/` devuelve `false`).
2. **Pérdida prolongada de Wi-Fi** — `WifiRetryPolicy` (`lib/core/`, probada
   nativamente) reintenta conectar cada 5s durante una ventana de 120s por
   defecto; si se agota sin éxito, `main.cpp` vuelve a modo provisioning
   automáticamente — **sin reflashear nada**, cumpliendo el requisito
   explícito de la autorización.

## Qué pasa al activarse

1. `WiFi.softAP("FreshTouch-Setup-XXXX")` — `XXXX` son los últimos 2 bytes de
   la MAC del dispositivo, para que dos ESP32 en el mismo lugar no muestren
   el mismo nombre de red.
2. `DNSServer` responde con la IP del propio AP (`192.168.4.1`) a
   *cualquier* consulta DNS — esto es lo que hace que el teléfono/laptop
   muestre automáticamente el aviso de "portal cautivo" al conectarse, en
   vez de tener que escribir la IP a mano.
3. `WebServer` sirve un formulario en `/` con: `machineId`, SSID, contraseña
   de Wi-Fi, modo de red (DHCP o IP estática — con campos IP/gateway/subnet
   que solo aplican en modo estático), y la contraseña de administrador para
   `/admin`.
4. Al enviar el formulario (`POST /save`): se valida con
   `validateForNormalOperation()` (la misma función que usa `/admin/
   save-config` — una sola fuente de verdad); si es válida, se guarda en NVS
   y el dispositivo se reinicia (`ESP.restart()`) para arrancar limpio con la
   configuración nueva.

## Qué NO hace todavía

- No verifica que el SSID/contraseña realmente conecten antes de guardar —
  si se equivocan, el dispositivo reiniciará, fallará al conectar, y volverá
  solo al modo provisioning tras la ventana de reintento (120s por
  defecto) — molesto pero no destructivo, y no requiere reflashear.
- No cifra la comunicación con el portal (HTTP plano en el AP local) — es el
  mismo modelo de amenaza que casi cualquier dispositivo IoT doméstico
  (router, bombilla inteligente) en su primer setup; ver `docs/SECURITY.md`.
