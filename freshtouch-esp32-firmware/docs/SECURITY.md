# Seguridad

## Separación firmware / configuración / secretos

- **Firmware** (este repo, código fuente): nunca contiene un SSID, una
  contraseña de Wi-Fi, un token de Telegram, un webhook de Make, ni
  ninguna credencial real. `config/secrets.example.h` es un placeholder
  vacío — no se usa en el código.
- **Configuración** (`MachineConfig` — `machineId`, mapa de relés, modo de
  red): vive en NVS del dispositivo. No es secreta, pero tampoco vive en el
  repositorio — cada ESP32 físico tiene la suya.
- **Secretos** (contraseña de Wi-Fi, hash+sal de la contraseña de admin):
  también en NVS, nunca en el repositorio, nunca en un log. El hash de admin
  usa SHA-256 con sal (ver abajo) — la contraseña en texto plano nunca se
  guarda, ni siquiera momentáneamente más allá del cálculo del hash.

## Auth de `/admin`

Sesión por cookie, un solo token activo a la vez (dispositivo de un solo
administrador en una red local, no un sistema multiusuario):

1. `POST /admin/login` con `password` -> se compara contra el hash guardado
   (`AdminAuth::verifyPassword`, `lib/core/`, probado en
   `test/native/test_admin_auth.cpp`) -> si coincide, se genera un token
   aleatorio de 16 bytes (`esp_random()`, RNG por hardware) y se entrega
   como cookie `HttpOnly` con expiración de 30 minutos.
2. Cada ruta de `/admin/*` que cambia algo revisa la cookie contra el token
   activo antes de hacer nada.

### Limitaciones conocidas, dichas explícitamente (no escondidas)

- **HTTP plano, no HTTPS** — un ESP32 sirviendo TLS con un certificado
  gestionable es posible pero agrega complejidad/RAM significativa; para un
  panel de admin en una red local de una sola máquina, se consideró fuera de
  alcance de esta fase. Quien necesite esto en una red no confiable debería
  ponerlo detrás de una VPN o una red aislada, no confiar en la red WiFi
  abierta.
- **Hash de una sola ronda (SHA-256 + sal), no un KDF con estiramiento**
  (PBKDF2/bcrypt/scrypt) — razonable para un panel local de un solo
  administrador; no es el estándar recomendado si esto alguna vez protegiera
  muchas cuentas de usuarios reales. Ver `lib/core/include/AdminAuth.h` para
  el razonamiento completo y cómo agregar iteraciones si se necesita.
- **Comparación de hashes no es de tiempo constante** — un timing attack de
  precisión de red contra un ESP32 en una LAN doméstica no es el vector de
  ataque prioritario para este dispositivo; documentado como conocido en vez
  de silenciado.
- **Un solo token de sesión activo** — si dos personas entran a `/admin`
  casi al mismo tiempo, la segunda sesión invalida a la primera. Aceptable
  para el caso de uso (un dueño/técnico a la vez).

## Cadena de suministro

`platformio.ini` no declara ninguna librería externa (`lib_deps` vacío) — la
implementación de SHA-256 es propia (`lib/core/src/Sha256.cpp`, probada
contra los vectores de prueba oficiales del NIST), y todo lo demás
(`WiFi.h`, `WebServer.h`, `DNSServer.h`, `Preferences.h`, `esp_system.h`) es
parte del núcleo `arduino-esp32` oficial. Esto minimiza la superficie de
paquetes de terceros que confiar.
