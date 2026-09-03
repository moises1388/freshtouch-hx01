// ============================================================================
// FreshTouch ESP32 firmware v3 — universal (HX01/HX02/HX03/...)
// Versión de un solo archivo para Arduino IDE.
//
// Fuente de verdad: freshtouch-esp32-firmware/ (lib/core/ + src/), en el
// repositorio moises1388/freshtouch-hx01. Este .ino es una fusión LITERAL de
// esos módulos (mismo código, mismo orden de dependencias, comentarios de
// diseño conservados) — no una reimplementación. Si alguna vez hay que
// elegir cuál de los dos confiar, lib/core/ + src/ (la versión modular) es
// la fuente canónica; este archivo debe volver a generarse desde ahí.
//
// ⚠️ ESTADO DE VERIFICACIÓN — leer antes de compilar ⚠️
// Este código se escribió en un entorno de desarrollo sin acceso al
// registro de paquetes de PlatformIO ni a las descargas de Arduino/
// Espressif (bloqueado por política de red) — así que la parte que
// depende de Arduino/ESP32 (WiFi, WebServer, DNSServer, Preferences)
// NUNCA pasó por un compilador real para ESP32. Sí se verificó de verdad,
// con g++ nativo, TODA la lógica que no depende de Arduino (el mapa de
// relés, el parser de /relay, la validación de configuración, el hash de
// la contraseña de admin con una implementación propia de SHA-256 contra
// los vectores oficiales del NIST, el JSON de /status, la política de
// reintento de Wi-Fi) — 115/115 verificaciones, ver
// freshtouch-esp32-firmware/test/native/. Ese código es idéntico al de
// aquí abajo.
//
// Placa: Tools > Board > "ESP32 Dev Module" (paquete "esp32 by Espressif
// Systems" en el Boards Manager). Es un default genérico — ajustar si la
// inspección física de HX02 confirma un módulo distinto.
// Librerías externas: NINGUNA. WiFi.h, WebServer.h, DNSServer.h,
// Preferences.h y esp_system.h vienen con el paquete de placas ESP32, no
// hace falta instalar nada desde el Library Manager.
//
// GPIO por defecto (confirmados por el propietario para HX01/HX02/HX03):
// puerta=25, vapor=33, secado=32, luzuv=18. La POLARIDAD de los relés
// (active-HIGH vs active-LOW) NO está confirmada — ver RelayAssignment
// más abajo y freshtouch-esp32-firmware/docs/FIRST-FLASH-HX02.md.
//
// Aislamiento: no modifica ni depende de HX01, fresh-touch-app/,
// freshtouch-hx02-cubo-lab/ ni freshtouch-core/. Sin credenciales reales
// — el Wi-Fi y la contraseña de admin se configuran en tiempo de
// ejecución vía el portal de provisioning (modo Access Point), nunca en
// este código fuente.
// ============================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <esp_system.h>

#include <array>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <map>
#include <sstream>
#include <string>
#include <vector>

// Versión de firmware — se reporta en /status. No confundir con la
// versión del protocolo HTTP (que no ha cambiado desde HX01).
#define FRESHTOUCH_FIRMWARE_VERSION "3.0.0-hx02-discovery"

namespace freshtouch {

// ============================================================================
// Sha256 — SHA-256 portable (FIPS 180-4), sin dependencias externas.
//
// Se implementa aquí, en vez de usar mbedtls (que sí trae el core ESP32
// Arduino), a propósito: así el MISMO código corre en el firmware real y en
// los tests nativos — no hay dos implementaciones que puedan divergir. Se
// probó contra los vectores de prueba oficiales del NIST.
// ============================================================================

namespace {

constexpr uint32_t kSha256K[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
};

inline uint32_t sha256Rotr(uint32_t x, uint32_t n) { return (x >> n) | (x << (32 - n)); }

struct Sha256State {
  uint32_t h[8] = {0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19};

  void processBlock(const uint8_t block[64]) {
    uint32_t w[64];
    for (int i = 0; i < 16; ++i) {
      w[i] = (static_cast<uint32_t>(block[i * 4]) << 24) |
             (static_cast<uint32_t>(block[i * 4 + 1]) << 16) |
             (static_cast<uint32_t>(block[i * 4 + 2]) << 8) |
             (static_cast<uint32_t>(block[i * 4 + 3]));
    }
    for (int i = 16; i < 64; ++i) {
      uint32_t s0 = sha256Rotr(w[i - 15], 7) ^ sha256Rotr(w[i - 15], 18) ^ (w[i - 15] >> 3);
      uint32_t s1 = sha256Rotr(w[i - 2], 17) ^ sha256Rotr(w[i - 2], 19) ^ (w[i - 2] >> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }

    uint32_t a = h[0], b = h[1], c = h[2], d = h[3];
    uint32_t e = h[4], f = h[5], g = h[6], hh = h[7];

    for (int i = 0; i < 64; ++i) {
      uint32_t s1 = sha256Rotr(e, 6) ^ sha256Rotr(e, 11) ^ sha256Rotr(e, 25);
      uint32_t ch = (e & f) ^ ((~e) & g);
      uint32_t temp1 = hh + s1 + ch + kSha256K[i] + w[i];
      uint32_t s0 = sha256Rotr(a, 2) ^ sha256Rotr(a, 13) ^ sha256Rotr(a, 22);
      uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
      uint32_t temp2 = s0 + maj;

      hh = g;
      g = f;
      f = e;
      e = d + temp1;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2;
    }

    h[0] += a; h[1] += b; h[2] += c; h[3] += d;
    h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
};

}  // namespace

// Hex en minúsculas, 64 caracteres.
std::string sha256Hex(const std::string& input) {
  Sha256State state;

  std::vector<uint8_t> msg(input.begin(), input.end());
  uint64_t bitLen = static_cast<uint64_t>(msg.size()) * 8;

  msg.push_back(0x80);
  while (msg.size() % 64 != 56) msg.push_back(0x00);
  for (int i = 7; i >= 0; --i) {
    msg.push_back(static_cast<uint8_t>((bitLen >> (i * 8)) & 0xff));
  }

  for (std::size_t off = 0; off < msg.size(); off += 64) {
    state.processBlock(&msg[off]);
  }

  static const char* kHexDigits = "0123456789abcdef";
  std::string out;
  out.reserve(64);
  for (int i = 0; i < 8; ++i) {
    uint32_t word = state.h[i];
    for (int b = 3; b >= 0; --b) {
      uint8_t byte = static_cast<uint8_t>((word >> (b * 8)) & 0xff);
      out += kHexDigits[byte >> 4];
      out += kHexDigits[byte & 0x0f];
    }
  }
  return out;
}

// ============================================================================
// RelayMap — el mapa componente lógico -> pin GPIO físico.
//
// GPIOs por defecto: los cuatro que el propietario confirmó como los que
// usa el firmware actual de HX01/HX02/HX03 (puerta=25, vapor=33, secado=32,
// luzuv=18). Se conservan como default, NO hardcodeados en el resto del
// firmware — todo el código que enciende/apaga un relé pasa por este mapa,
// nunca escribe un número de pin literal.
//
// Deliberadamente NO se asume que HX04 (o cualquier máquina futura) tendrá
// los mismos cuatro componentes: el mapa es una lista dinámica de pares
// (nombre, pin), no una struct fija con 4 campos.
// ============================================================================

struct RelayAssignment {
  std::string component;
  uint8_t gpio;
  // Polaridad del módulo de relés — MUCHOS módulos de 4 canales baratos
  // (como el que se ve en la foto de HX02, con entradas S1-S4) son
  // "active-LOW": el relé se energiza con la señal en LOW, no en HIGH. No
  // se puede saber cuál es sin probarlo físicamente — ver
  // docs/FIRST-FLASH-HX02.md, paso de verificación de polaridad, ANTES de
  // confiar en esto para vapor/secado/puerta/UV. Default = false
  // (active-HIGH) por ser la convención más simple, NO porque se haya
  // confirmado que así es el módulo real de HX02.
  bool activeLow = false;
};

constexpr uint8_t kDefaultGpioPuerta = 25;
constexpr uint8_t kDefaultGpioVapor = 33;
constexpr uint8_t kDefaultGpioSecado = 32;
constexpr uint8_t kDefaultGpioLuzUv = 18;

// Margen para máquinas futuras con más actuadores que HX01 — no es un
// límite del protocolo, solo del tamaño fijo de este arreglo en memoria.
constexpr std::size_t kMaxRelays = 8;

class RelayMap {
 public:
  RelayMap() = default;

  // false si "component" ya existe (usar update() para eso) o si ya se
  // alcanzó kMaxRelays.
  bool add(const std::string& component, uint8_t gpio, bool activeLow = false);

  // Reemplaza el pin de un componente ya existente, SIN tocar su polaridad
  // actual; false si no existe.
  bool update(const std::string& component, uint8_t gpio);

  // Cambia solo la polaridad de un componente ya existente; false si no
  // existe.
  bool updatePolarity(const std::string& component, bool activeLow);

  // -1 si el componente no está mapeado; 0/1 en vez de bool para poder
  // distinguir "no existe" con el mismo patrón que gpioFor().
  int activeLowFor(const std::string& component) const;

  bool remove(const std::string& component);

  // -1 si el componente no está mapeado.
  int gpioFor(const std::string& component) const;

  bool has(const std::string& component) const;

  std::size_t size() const { return count_; }

  const RelayAssignment& at(std::size_t index) const;

  // Ningún GPIO puede repetirse entre dos componentes distintos — evita una
  // configuración que, por error, controle dos actuadores con el mismo pin
  // sin darse cuenta.
  bool hasDuplicateGpio() const;

  static RelayMap withHx01Defaults();

 private:
  std::array<RelayAssignment, kMaxRelays> assignments_{};
  std::size_t count_ = 0;

  int indexOf(const std::string& component) const;
};

int RelayMap::indexOf(const std::string& component) const {
  for (std::size_t i = 0; i < count_; ++i) {
    if (assignments_[i].component == component) return static_cast<int>(i);
  }
  return -1;
}

bool RelayMap::add(const std::string& component, uint8_t gpio, bool activeLow) {
  if (indexOf(component) >= 0) return false;
  if (count_ >= kMaxRelays) return false;
  assignments_[count_] = RelayAssignment{component, gpio, activeLow};
  ++count_;
  return true;
}

bool RelayMap::update(const std::string& component, uint8_t gpio) {
  int idx = indexOf(component);
  if (idx < 0) return false;
  assignments_[static_cast<std::size_t>(idx)].gpio = gpio;
  return true;
}

bool RelayMap::updatePolarity(const std::string& component, bool activeLow) {
  int idx = indexOf(component);
  if (idx < 0) return false;
  assignments_[static_cast<std::size_t>(idx)].activeLow = activeLow;
  return true;
}

int RelayMap::activeLowFor(const std::string& component) const {
  int idx = indexOf(component);
  if (idx < 0) return -1;
  return assignments_[static_cast<std::size_t>(idx)].activeLow ? 1 : 0;
}

bool RelayMap::remove(const std::string& component) {
  int idx = indexOf(component);
  if (idx < 0) return false;
  for (std::size_t i = static_cast<std::size_t>(idx); i + 1 < count_; ++i) {
    assignments_[i] = assignments_[i + 1];
  }
  --count_;
  return true;
}

int RelayMap::gpioFor(const std::string& component) const {
  int idx = indexOf(component);
  if (idx < 0) return -1;
  return assignments_[static_cast<std::size_t>(idx)].gpio;
}

bool RelayMap::has(const std::string& component) const {
  return indexOf(component) >= 0;
}

const RelayAssignment& RelayMap::at(std::size_t index) const {
  return assignments_[index];
}

bool RelayMap::hasDuplicateGpio() const {
  for (std::size_t i = 0; i < count_; ++i) {
    for (std::size_t j = i + 1; j < count_; ++j) {
      if (assignments_[i].gpio == assignments_[j].gpio) return true;
    }
  }
  return false;
}

RelayMap RelayMap::withHx01Defaults() {
  RelayMap map;
  map.add("puerta", kDefaultGpioPuerta);
  map.add("vapor", kDefaultGpioVapor);
  map.add("secado", kDefaultGpioSecado);
  map.add("luzuv", kDefaultGpioLuzUv);
  return map;
}

// ============================================================================
// AdminAuth — verificación de la contraseña de /admin.
//
// NUNCA se guarda la contraseña en texto plano — ni en NVS, ni en memoria
// más tiempo del necesario para calcular el hash. Se guarda salt +
// sha256("salt:contraseña"), y verifyPassword() recalcula el mismo hash a
// partir de la contraseña recibida para compararlo.
//
// Advertencia honesta (ver docs/SECURITY.md): esto es un salted hash de una
// sola ronda, no un KDF con estiramiento (PBKDF2/bcrypt/scrypt) — es
// razonable para un panel de administración en la red local de una sola
// máquina, pero no es el estándar recomendado para un sistema con muchos
// más usuarios/mayor superficie de ataque.
// ============================================================================

struct AdminCredentialHash {
  std::string salt;  // hex, generado en el dispositivo (esp_random())
  std::string hash;   // sha256Hex(salt + ":" + password)
};

class AdminAuth {
 public:
  // saltHex debe venir ya generado por el llamador (esp_random(), ver
  // generateRandomHex más abajo) — esta clase no genera aleatoriedad, para
  // mantenerse pura y testable.
  static AdminCredentialHash hashPassword(const std::string& password, const std::string& saltHex);

  static bool verifyPassword(const std::string& password, const AdminCredentialHash& stored);
};

AdminCredentialHash AdminAuth::hashPassword(const std::string& password, const std::string& saltHex) {
  AdminCredentialHash out;
  out.salt = saltHex;
  out.hash = sha256Hex(saltHex + ":" + password);
  return out;
}

bool AdminAuth::verifyPassword(const std::string& password, const AdminCredentialHash& stored) {
  AdminCredentialHash recomputed = hashPassword(password, stored.salt);
  // Comparación de tiempo no-constante: limitación conocida, documentada en
  // docs/SECURITY.md — para el modelo de amenaza de un panel de admin en la
  // red local, el timing attack no es la prioridad.
  return recomputed.hash == stored.hash;
}

// ============================================================================
// WifiRetryPolicy — decide qué hacer ante una desconexión de Wi-Fi, sin
// tocar hardware. Recibe el reloj como parámetro (uint32_t ms) en vez de
// leer millis() internamente, para poder probarlo de forma determinista sin
// esperar tiempo real.
//
// Reglas pedidas en la autorización: "si se pierde Wi-Fi, intentar
// reconectar; si no puede conectarse durante un período configurable,
// permitir entrar nuevamente al modo de provisioning sin requerir
// reflashear el firmware."
// ============================================================================

enum class WifiConnState {
  Connected,
  RetryWait,             // desconectado, todavía dentro de la ventana de reintento
  ProvisioningRequired,  // se agotó la ventana — volver al portal de configuración
};

class WifiRetryPolicy {
 public:
  explicit WifiRetryPolicy(uint32_t maxRetryWindowMs = 120000, uint32_t retryIntervalMs = 5000);

  void onDisconnected(uint32_t nowMs);
  void onConnected();

  // ¿ya toca reintentar YA (nowMs - último intento >= retryIntervalMs)?
  bool shouldRetryNow(uint32_t nowMs) const;

  void markRetryAttempted(uint32_t nowMs);

  // Estado global a partir del reloj actual.
  WifiConnState evaluate(uint32_t nowMs) const;

 private:
  uint32_t maxRetryWindowMs_;
  uint32_t retryIntervalMs_;
  bool connected_ = true;  // arranca optimista; onDisconnected() lo corrige
  uint32_t disconnectedAtMs_ = 0;
  uint32_t lastRetryAtMs_ = 0;
};

WifiRetryPolicy::WifiRetryPolicy(uint32_t maxRetryWindowMs, uint32_t retryIntervalMs)
    : maxRetryWindowMs_(maxRetryWindowMs), retryIntervalMs_(retryIntervalMs) {}

void WifiRetryPolicy::onDisconnected(uint32_t nowMs) {
  if (connected_) {
    // Recién se cae — arranca la ventana de reintento ahora.
    disconnectedAtMs_ = nowMs;
    lastRetryAtMs_ = nowMs;
  }
  connected_ = false;
}

void WifiRetryPolicy::onConnected() {
  connected_ = true;
}

bool WifiRetryPolicy::shouldRetryNow(uint32_t nowMs) const {
  if (connected_) return false;
  return (nowMs - lastRetryAtMs_) >= retryIntervalMs_;
}

void WifiRetryPolicy::markRetryAttempted(uint32_t nowMs) {
  lastRetryAtMs_ = nowMs;
}

WifiConnState WifiRetryPolicy::evaluate(uint32_t nowMs) const {
  if (connected_) return WifiConnState::Connected;
  if ((nowMs - disconnectedAtMs_) >= maxRetryWindowMs_) {
    return WifiConnState::ProvisioningRequired;
  }
  return WifiConnState::RetryWait;
}

// ============================================================================
// QueryParser — parser de query string mínimo, portable. Probado en
// test/native/test_query_parser.cpp. (Nota de fidelidad: en el proyecto
// modular tampoco está cableado directamente dentro de ApiServer/
// ProvisioningPortal —ambos usan WebServer::arg()— así que aquí se conserva
// igual, disponible pero no invocado por las rutas HTTP.)
// ============================================================================

namespace {
int hexVal(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}
}  // namespace

// Decodifica application/x-www-form-urlencoded (%XX y '+' -> espacio).
std::string urlDecode(const std::string& encoded) {
  std::string out;
  out.reserve(encoded.size());
  for (std::size_t i = 0; i < encoded.size(); ++i) {
    char c = encoded[i];
    if (c == '+') {
      out += ' ';
    } else if (c == '%' && i + 2 < encoded.size()) {
      int hi = hexVal(encoded[i + 1]);
      int lo = hexVal(encoded[i + 2]);
      if (hi >= 0 && lo >= 0) {
        out += static_cast<char>((hi << 4) | lo);
        i += 2;
      } else {
        out += c;
      }
    } else {
      out += c;
    }
  }
  return out;
}

// "comp=vapor&state=1" -> {"comp": "vapor", "state": "1"}.
std::map<std::string, std::string> parseQueryString(const std::string& query) {
  std::map<std::string, std::string> result;
  std::stringstream ss(query);
  std::string pair;
  while (std::getline(ss, pair, '&')) {
    if (pair.empty()) continue;
    auto eq = pair.find('=');
    if (eq == std::string::npos) {
      result[urlDecode(pair)] = "";
    } else {
      std::string key = urlDecode(pair.substr(0, eq));
      std::string value = urlDecode(pair.substr(eq + 1));
      result[key] = value;
    }
  }
  return result;
}

// ============================================================================
// MachineConfig — el esquema completo de configuración persistida en NVS.
// Separación estricta pedida en la autorización: firmware (este archivo) |
// configuración (esto) | secretos (Wi-Fi password, admin password hash —
// nunca en el código fuente, solo en NVS del dispositivo).
// ============================================================================

enum class NetworkMode { Dhcp, Static };

struct NetworkConfig {
  NetworkMode mode = NetworkMode::Dhcp;
  std::string staticIp;
  std::string gateway;
  std::string subnet;
};

struct WifiCredentials {
  std::string ssid;
  std::string password;
};

struct MachineConfig {
  std::string machineId;
  WifiCredentials wifi;
  NetworkConfig network;
  RelayMap relays = RelayMap::withHx01Defaults();
  AdminCredentialHash admin;  // vacío = todavía no se configuró un admin
  uint32_t totalCycles = 0;
};

struct ConfigValidationResult {
  bool valid;
  std::string error;  // vacío si valid == true
};

bool hasWifiCredentials(const WifiCredentials& wifi) {
  return !wifi.ssid.empty();
  // La contraseña vacía es válida a propósito (redes abiertas existen); el
  // SSID vacío es lo único que estructuralmente no se puede conectar.
}

bool isValidIPv4(const std::string& value) {
  std::stringstream ss(value);
  std::string octet;
  int count = 0;
  while (std::getline(ss, octet, '.')) {
    if (octet.empty() || octet.size() > 3) return false;
    for (char c : octet) {
      if (c < '0' || c > '9') return false;
    }
    int n = std::atoi(octet.c_str());
    if (n < 0 || n > 255) return false;
    ++count;
  }
  return count == 4;
}

bool isValidStaticNetworkConfig(const NetworkConfig& net) {
  if (net.mode != NetworkMode::Static) return true;  // no aplica en DHCP
  return isValidIPv4(net.staticIp) && isValidIPv4(net.gateway) && isValidIPv4(net.subnet);
}

// "¿esta config alcanza para operar normalmente?" — el modo provisioning
// existe justo para cuando esto da false (sin Wi-Fi todavía, por ejemplo).
ConfigValidationResult validateForNormalOperation(const MachineConfig& cfg) {
  if (cfg.machineId.empty()) {
    return {false, "machineId vacío"};
  }
  if (!hasWifiCredentials(cfg.wifi)) {
    return {false, "sin SSID de Wi-Fi configurado"};
  }
  if (!isValidStaticNetworkConfig(cfg.network)) {
    return {false, "IP estática/gateway/subnet inválidos"};
  }
  if (cfg.relays.hasDuplicateGpio()) {
    return {false, "dos componentes comparten el mismo GPIO"};
  }
  if (cfg.relays.size() == 0) {
    return {false, "sin ningún relé configurado"};
  }
  return {true, ""};
}

// ============================================================================
// StatusSnapshot — la forma exacta de lo que /status devuelve, y la función
// pura que la serializa a JSON. Campos pedidos explícitamente en la
// autorización: machineId, IP, RSSI, uptime, firmware version, totalCycles,
// estado Wi-Fi, estado de los relés.
// ============================================================================

struct RelayStatus {
  std::string component;
  uint8_t gpio;
  bool on;
};

struct StatusSnapshot {
  std::string machineId;
  std::string ip;
  int rssi = 0;
  uint32_t uptimeSeconds = 0;
  std::string firmwareVersion;
  uint32_t totalCycles = 0;
  bool wifiConnected = false;
  std::vector<RelayStatus> relays;
};

namespace {
// Escapado JSON mínimo — suficiente para los valores que este firmware
// produce, no un serializador JSON genérico.
std::string jsonEscape(const std::string& in) {
  std::string out;
  out.reserve(in.size());
  for (char c : in) {
    switch (c) {
      case '"': out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n"; break;
      default: out += c;
    }
  }
  return out;
}
}  // namespace

// JSON compacto, sin dependencias externas (no se agrega ArduinoJson u otra
// librería solo para esto).
std::string buildStatusJson(const StatusSnapshot& s) {
  std::ostringstream out;
  out << "{";
  out << "\"machineId\":\"" << jsonEscape(s.machineId) << "\",";
  out << "\"ip\":\"" << jsonEscape(s.ip) << "\",";
  out << "\"rssi\":" << s.rssi << ",";
  out << "\"uptimeSeconds\":" << s.uptimeSeconds << ",";
  out << "\"firmwareVersion\":\"" << jsonEscape(s.firmwareVersion) << "\",";
  out << "\"totalCycles\":" << s.totalCycles << ",";
  out << "\"wifiConnected\":" << (s.wifiConnected ? "true" : "false") << ",";
  out << "\"relays\":[";
  for (std::size_t i = 0; i < s.relays.size(); ++i) {
    if (i > 0) out << ",";
    const auto& r = s.relays[i];
    out << "{\"component\":\"" << jsonEscape(r.component) << "\","
        << "\"gpio\":" << static_cast<int>(r.gpio) << ","
        << "\"on\":" << (r.on ? "true" : "false") << "}";
  }
  out << "]";
  out << "}";
  return out.str();
}

// ============================================================================
// RelayCommand — la validación de `GET /relay?comp=X&state=0|1`, el endpoint
// de compatibilidad más sensible de todos (no se puede cambiar su forma sin
// autorización). No toca ningún pin — solo decide si el comando es válido y,
// si lo es, qué componente/estado debe aplicar el llamador (ver ApiServer).
// ============================================================================

struct RelayCommandResult {
  int httpStatus = 400;
  std::string body;
  bool applied = false;   // true si el llamador debe escribir el GPIO
  std::string component;  // válido solo si applied
  bool state = false;     // válido solo si applied
};

RelayCommandResult handleRelayCommand(const std::map<std::string, std::string>& queryParams,
                                       const RelayMap& relays) {
  RelayCommandResult result;

  auto compIt = queryParams.find("comp");
  auto stateIt = queryParams.find("state");

  if (compIt == queryParams.end() || stateIt == queryParams.end()) {
    result.httpStatus = 400;
    result.body = "missing comp or state";
    return result;
  }

  const std::string& comp = compIt->second;
  const std::string& stateStr = stateIt->second;

  if (!relays.has(comp)) {
    result.httpStatus = 404;
    result.body = "unknown component: " + comp;
    return result;
  }

  if (stateStr != "0" && stateStr != "1") {
    result.httpStatus = 400;
    result.body = "state must be 0 or 1";
    return result;
  }

  result.httpStatus = 200;
  result.applied = true;
  result.component = comp;
  result.state = (stateStr == "1");
  result.body = "ok";
  return result;
}

// ============================================================================
// RandomUtil — el único lugar que llama a esp_random() (RNG por hardware
// del ESP32). Usado para generar la sal de AdminAuth.
// ============================================================================

// bytesLen*2 caracteres hex en minúsculas.
std::string generateRandomHex(std::size_t bytesLen) {
  static const char* kHex = "0123456789abcdef";
  std::string out;
  out.reserve(bytesLen * 2);
  for (std::size_t i = 0; i < bytesLen; ++i) {
    uint8_t b = static_cast<uint8_t>(esp_random() & 0xFF);
    out += kHex[b >> 4];
    out += kHex[b & 0x0F];
  }
  return out;
}

// ============================================================================
// NvsConfigStore — el ÚNICO lugar que sabe que MachineConfig se guarda en
// NVS (Preferences). El resto del firmware trabaja siempre con la struct
// MachineConfig — si mañana se cambia el backend de persistencia, este es
// el único bloque que cambia.
// ============================================================================

class NvsConfigStore {
 public:
  // Debe llamarse una sola vez en setup(), antes de cualquier otra
  // operación.
  void begin();
  void end();

  // Si no hay nada guardado todavía (primer arranque, o tras un reset de
  // fábrica), devuelve una MachineConfig con los defaults de HX01 para
  // relés, machineId/wifi vacíos, y admin sin configurar.
  MachineConfig load();

  void save(const MachineConfig& cfg);

  // Solo el contador — se llama en cada /cycle-done.
  void incrementAndSaveTotalCycles(uint32_t& outNewValue);

  // Borra TODA la configuración guardada — usado por el reset de fábrica
  // desde /admin. Nunca se llama automáticamente.
  void factoryReset();

 private:
  Preferences prefs_;
};

namespace {
constexpr const char* kNvsNamespace = "ftcfg";
}  // namespace

void NvsConfigStore::begin() {
  prefs_.begin(kNvsNamespace, /*readOnly=*/false);
}

void NvsConfigStore::end() {
  prefs_.end();
}

MachineConfig NvsConfigStore::load() {
  MachineConfig cfg;  // ya arranca con RelayMap::withHx01Defaults()

  cfg.machineId = prefs_.getString("machine_id", "").c_str();
  cfg.wifi.ssid = prefs_.getString("wifi_ssid", "").c_str();
  cfg.wifi.password = prefs_.getString("wifi_pass", "").c_str();

  uint8_t netMode = prefs_.getUChar("net_mode", 0);
  cfg.network.mode = (netMode == 1) ? NetworkMode::Static : NetworkMode::Dhcp;
  cfg.network.staticIp = prefs_.getString("net_ip", "").c_str();
  cfg.network.gateway = prefs_.getString("net_gw", "").c_str();
  cfg.network.subnet = prefs_.getString("net_mask", "").c_str();

  cfg.admin.salt = prefs_.getString("admin_salt", "").c_str();
  cfg.admin.hash = prefs_.getString("admin_hash", "").c_str();

  cfg.totalCycles = prefs_.getUInt("total_cycles", 0);

  // Mapa de relés: si nunca se guardó nada, se deja el default de HX01 que
  // ya trae la struct. Si sí hay algo guardado, se reemplaza por lo
  // guardado — nunca se mezclan ambos.
  uint8_t relayCount = prefs_.getUChar("relay_count", 0);
  if (relayCount > 0) {
    RelayMap stored;
    for (uint8_t i = 0; i < relayCount && i < kMaxRelays; ++i) {
      char nameKey[16];
      char gpioKey[16];
      snprintf(nameKey, sizeof(nameKey), "relay_name_%u", i);
      snprintf(gpioKey, sizeof(gpioKey), "relay_gpio_%u", i);
      std::string name = prefs_.getString(nameKey, "").c_str();
      uint8_t gpio = prefs_.getUChar(gpioKey, 0);
      if (!name.empty()) stored.add(name, gpio);
    }
    if (stored.size() > 0) cfg.relays = stored;
  }

  return cfg;
}

void NvsConfigStore::save(const MachineConfig& cfg) {
  prefs_.putString("machine_id", cfg.machineId.c_str());
  prefs_.putString("wifi_ssid", cfg.wifi.ssid.c_str());
  prefs_.putString("wifi_pass", cfg.wifi.password.c_str());

  prefs_.putUChar("net_mode", cfg.network.mode == NetworkMode::Static ? 1 : 0);
  prefs_.putString("net_ip", cfg.network.staticIp.c_str());
  prefs_.putString("net_gw", cfg.network.gateway.c_str());
  prefs_.putString("net_mask", cfg.network.subnet.c_str());

  prefs_.putString("admin_salt", cfg.admin.salt.c_str());
  prefs_.putString("admin_hash", cfg.admin.hash.c_str());

  prefs_.putUInt("total_cycles", cfg.totalCycles);

  uint8_t relayCount = static_cast<uint8_t>(cfg.relays.size());
  prefs_.putUChar("relay_count", relayCount);
  for (uint8_t i = 0; i < relayCount; ++i) {
    const RelayAssignment& r = cfg.relays.at(i);
    char nameKey[16];
    char gpioKey[16];
    snprintf(nameKey, sizeof(nameKey), "relay_name_%u", i);
    snprintf(gpioKey, sizeof(gpioKey), "relay_gpio_%u", i);
    prefs_.putString(nameKey, r.component.c_str());
    prefs_.putUChar(gpioKey, r.gpio);
  }
}

void NvsConfigStore::incrementAndSaveTotalCycles(uint32_t& outNewValue) {
  uint32_t current = prefs_.getUInt("total_cycles", 0);
  outNewValue = current + 1;
  prefs_.putUInt("total_cycles", outNewValue);
}

void NvsConfigStore::factoryReset() {
  prefs_.clear();
}

// ============================================================================
// RelayController — la ÚNICA capa que llama pinMode()/digitalWrite().
// Ningún otro bloque debe tocar un GPIO directamente.
// ============================================================================

class RelayController {
 public:
  // Configura pinMode(OUTPUT) para cada componente del mapa y los deja
  // todos apagados (fail-safe: arrancar con todo apagado).
  void begin(const RelayMap& relays);

  // false si el componente no está en el mapa.
  bool setRelay(const std::string& component, bool on);

  bool isOn(const std::string& component) const;

  const RelayMap& relayMap() const { return relays_; }

 private:
  RelayMap relays_;
  std::map<std::string, bool> state_;
};

void RelayController::begin(const RelayMap& relays) {
  relays_ = relays;
  state_.clear();
  for (std::size_t i = 0; i < relays_.size(); ++i) {
    const RelayAssignment& r = relays_.at(i);
    pinMode(r.gpio, OUTPUT);
    // Fail-safe: arrancar en el nivel eléctrico que corresponde a
    // "apagado" según la polaridad configurada — NUNCA asumir que LOW
    // siempre significa apagado.
    digitalWrite(r.gpio, r.activeLow ? HIGH : LOW);
    state_[r.component] = false;
  }
}

bool RelayController::setRelay(const std::string& component, bool on) {
  int gpio = relays_.gpioFor(component);
  if (gpio < 0) return false;
  bool activeLow = relays_.activeLowFor(component) == 1;
  int level = on ? (activeLow ? LOW : HIGH) : (activeLow ? HIGH : LOW);
  digitalWrite(gpio, level);
  state_[component] = on;
  return true;
}

bool RelayController::isOn(const std::string& component) const {
  auto it = state_.find(component);
  return it != state_.end() && it->second;
}

// ============================================================================
// WifiManager — conecta a la red configurada (DHCP o IP estática), reporta
// estado/RSSI/IP, y usa WifiRetryPolicy para decidir cuándo reintentar y
// cuándo rendirse y pedir volver a modo provisioning.
// ============================================================================

class WifiManager {
 public:
  void begin(const WifiCredentials& wifi, const NetworkConfig& network);

  // Se llama en cada loop(). Devuelve true si hace falta volver a modo
  // provisioning.
  bool tick();

  bool isConnected() const;
  int rssi() const;
  String localIp() const;

 private:
  WifiRetryPolicy retryPolicy_;
  bool provisioningRequested_ = false;
};

void WifiManager::begin(const WifiCredentials& wifi, const NetworkConfig& network) {
  WiFi.mode(WIFI_STA);

  if (network.mode == NetworkMode::Static) {
    IPAddress ip, gw, mask;
    ip.fromString(network.staticIp.c_str());
    gw.fromString(network.gateway.c_str());
    mask.fromString(network.subnet.c_str());
    WiFi.config(ip, gw, mask);
  }

  WiFi.begin(wifi.ssid.c_str(), wifi.password.c_str());
  provisioningRequested_ = false;
}

bool WifiManager::tick() {
  uint32_t now = millis();

  if (WiFi.status() == WL_CONNECTED) {
    retryPolicy_.onConnected();
    return false;
  }

  retryPolicy_.onDisconnected(now);

  WifiConnState state = retryPolicy_.evaluate(now);
  if (state == WifiConnState::ProvisioningRequired) {
    provisioningRequested_ = true;
    return true;
  }

  if (retryPolicy_.shouldRetryNow(now)) {
    WiFi.reconnect();
    retryPolicy_.markRetryAttempted(now);
  }

  return false;
}

bool WifiManager::isConnected() const {
  return WiFi.status() == WL_CONNECTED;
}

int WifiManager::rssi() const {
  return isConnected() ? WiFi.RSSI() : 0;
}

String WifiManager::localIp() const {
  return isConnected() ? WiFi.localIP().toString() : String("0.0.0.0");
}

// ============================================================================
// ProvisioningPortal — modo Access Point + página web local para configurar
// SSID/contraseña/machineId/red/contraseña de admin cuando el ESP32 no
// tiene una configuración de Wi-Fi válida. No requiere reflashear nada.
// ============================================================================

class ProvisioningPortal {
 public:
  // Arranca WiFi.softAP(...), el DNSServer (redirige todo al portal —
  // "captive portal" real) y las rutas del WebServer.
  void begin(NvsConfigStore& store);

  // Llamar en cada loop() mientras se está en modo provisioning.
  void handleClient();

  // true una vez que el formulario se envió y se guardó correctamente —
  // main debe reiniciar (ESP.restart()) al ver esto.
  bool configSubmitted() const { return configSubmitted_; }

 private:
  WebServer server_{80};
  DNSServer dns_;
  NvsConfigStore* store_ = nullptr;
  bool configSubmitted_ = false;

  void handleRoot();
  void handleSave();
  void handleCaptivePortalRedirect();
  String buildFormHtml(const std::string& errorMessage);
};

namespace {
constexpr byte kDnsPort = 53;
const IPAddress kApIp(192, 168, 4, 1);
}  // namespace

// Genera un nombre de AP único por dispositivo — "FreshTouch-Setup-XXXX"
// donde XXXX son los últimos 2 bytes de la MAC.
String buildApSsid() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char suffix[5];
  snprintf(suffix, sizeof(suffix), "%02X%02X", mac[4], mac[5]);
  return "FreshTouch-Setup-" + String(suffix);
}

void ProvisioningPortal::begin(NvsConfigStore& store) {
  store_ = &store;
  configSubmitted_ = false;

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(kApIp, kApIp, IPAddress(255, 255, 255, 0));
  WiFi.softAP(buildApSsid().c_str());

  dns_.start(kDnsPort, "*", kApIp);

  server_.on("/", HTTP_GET, [this]() { handleRoot(); });
  server_.on("/save", HTTP_POST, [this]() { handleSave(); });
  // Cualquier otra ruta (lo que un teléfono pide para detectar el portal
  // cautivo — generate_204, hotspot-detect.html, etc.) se manda al
  // formulario, igual que cualquier portal cautivo estándar.
  server_.onNotFound([this]() { handleCaptivePortalRedirect(); });
  server_.begin();
}

void ProvisioningPortal::handleClient() {
  dns_.processNextRequest();
  server_.handleClient();
}

void ProvisioningPortal::handleCaptivePortalRedirect() {
  server_.sendHeader("Location", "/", true);
  server_.send(302, "text/plain", "");
}

String ProvisioningPortal::buildFormHtml(const std::string& errorMessage) {
  MachineConfig current = store_->load();

  String html;
  html += "<!DOCTYPE html><html><head><meta charset='utf-8'>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>FreshTouch — Configuración</title>";
  html += "<style>body{font-family:sans-serif;max-width:420px;margin:20px auto;padding:0 16px}"
          "label{display:block;margin-top:12px;font-size:13px;color:#555}"
          "input,select{width:100%;box-sizing:border-box;padding:8px;margin-top:4px;font-size:15px}"
          "button{margin-top:20px;width:100%;padding:12px;font-size:15px;background:#1B2A4A;color:#fff;border:none;border-radius:6px}"
          ".err{color:#c0392b;font-size:13px;margin-top:8px}</style></head><body>";
  html += "<h2>FreshTouch — Configuración inicial</h2>";
  if (!errorMessage.empty()) {
    html += "<div class='err'>" + String(errorMessage.c_str()) + "</div>";
  }
  html += "<form method='POST' action='/save'>";
  html += "<label>Machine ID</label><input name='machineId' value='" + String(current.machineId.c_str()) + "' required>";
  html += "<label>Wi-Fi SSID</label><input name='ssid' value='" + String(current.wifi.ssid.c_str()) + "' required>";
  html += "<label>Wi-Fi contraseña</label><input name='pass' type='password'>";
  html += "<label>Modo de red</label><select name='netMode'>";
  html += String("<option value='dhcp'") + (current.network.mode == NetworkMode::Dhcp ? " selected" : "") + ">DHCP (automático)</option>";
  html += String("<option value='static'") + (current.network.mode == NetworkMode::Static ? " selected" : "") + ">IP estática</option>";
  html += "</select>";
  html += "<label>IP estática (si aplica)</label><input name='staticIp' value='" + String(current.network.staticIp.c_str()) + "'>";
  html += "<label>Gateway (si aplica)</label><input name='gateway' value='" + String(current.network.gateway.c_str()) + "'>";
  html += "<label>Subnet (si aplica)</label><input name='subnet' value='" + String(current.network.subnet.c_str()) + "'>";
  html += "<label>Contraseña de administrador (/admin)</label><input name='adminPass' type='password' placeholder='dejar vacío para no cambiarla'>";
  html += "<button type='submit'>Guardar y reiniciar</button>";
  html += "</form>";
  html += "<p style='font-size:11px;color:#888;margin-top:24px'>FreshTouch ESP32 firmware " FRESHTOUCH_FIRMWARE_VERSION "</p>";
  html += "</body></html>";
  return html;
}

void ProvisioningPortal::handleRoot() {
  server_.send(200, "text/html", buildFormHtml(""));
}

void ProvisioningPortal::handleSave() {
  MachineConfig cfg = store_->load();

  cfg.machineId = server_.arg("machineId").c_str();
  cfg.wifi.ssid = server_.arg("ssid").c_str();
  if (server_.arg("pass").length() > 0) {
    cfg.wifi.password = server_.arg("pass").c_str();
  }

  cfg.network.mode = (server_.arg("netMode") == "static") ? NetworkMode::Static : NetworkMode::Dhcp;
  cfg.network.staticIp = server_.arg("staticIp").c_str();
  cfg.network.gateway = server_.arg("gateway").c_str();
  cfg.network.subnet = server_.arg("subnet").c_str();

  if (server_.arg("adminPass").length() > 0) {
    std::string salt = generateRandomHex(8);
    cfg.admin = AdminAuth::hashPassword(server_.arg("adminPass").c_str(), salt);
  }

  ConfigValidationResult check = validateForNormalOperation(cfg);
  if (!check.valid) {
    server_.send(200, "text/html", buildFormHtml("No se pudo guardar: " + check.error));
    return;
  }

  store_->save(cfg);
  configSubmitted_ = true;

  server_.send(200, "text/html",
               "<html><body><h3>Guardado. El dispositivo se está reiniciando...</h3>"
               "<p>Conéctate de nuevo a tu red Wi-Fi normal en unos segundos.</p></body></html>");
}

// ============================================================================
// ApiServer — todas las rutas HTTP: las de compatibilidad (/relay, /status,
// /cycle-done — NO cambiar su forma sin autorización) y la nueva /admin.
//
// Autenticación de /admin: sesión simple por cookie (un solo token activo a
// la vez). NO es HTTP Basic Auth (se evitó el decodificador base64
// adicional): hay una pantalla de login que verifica la contraseña contra
// el hash guardado y entrega una cookie de sesión con expiración.
// ============================================================================

class ApiServer {
 public:
  void begin(MachineConfig& cfg, RelayController& relays, NvsConfigStore& store,
             WifiManager& wifi, uint32_t bootMillis);
  void handleClient();

 private:
  WebServer server_{80};
  MachineConfig* cfg_ = nullptr;
  RelayController* relays_ = nullptr;
  NvsConfigStore* store_ = nullptr;
  WifiManager* wifi_ = nullptr;
  uint32_t bootMillis_ = 0;

  std::string sessionToken_;
  uint32_t sessionExpiresAtMs_ = 0;

  // --- Compatibilidad ---
  void handleRelay();
  void handleStatusRoute();
  void handleCycleDone();

  // --- /admin ---
  void handleAdminGet();
  void handleAdminLogin();
  void handleAdminLogout();
  void handleAdminRelayTest();
  void handleAdminSaveConfig();
  void handleAdminFactoryReset();

  bool isAdminAuthenticated();
  String currentSessionCookie();
  String renderLoginPage(const std::string& error);
  String renderAdminPage(const std::string& message);
};

namespace {
constexpr uint32_t kSessionDurationMs = 30UL * 60UL * 1000UL;  // 30 minutos
constexpr uint32_t kRelayTestDurationMs = 1000;  // prueba técnica: 1s encendido

std::map<std::string, std::string> queryFromWebServer(WebServer& server) {
  std::map<std::string, std::string> out;
  for (int i = 0; i < server.args(); ++i) {
    out[server.argName(i).c_str()] = server.arg(i).c_str();
  }
  return out;
}
}  // namespace

void ApiServer::begin(MachineConfig& cfg, RelayController& relays, NvsConfigStore& store,
                       WifiManager& wifi, uint32_t bootMillis) {
  cfg_ = &cfg;
  relays_ = &relays;
  store_ = &store;
  wifi_ = &wifi;
  bootMillis_ = bootMillis;

  static const char* kCollectedHeaders[] = {"Cookie"};
  server_.collectHeaders(kCollectedHeaders, 1);

  // --- Compatibilidad — no cambiar sin autorización ---
  server_.on("/relay", HTTP_GET, [this]() { handleRelay(); });
  server_.on("/status", HTTP_GET, [this]() { handleStatusRoute(); });
  server_.on("/cycle-done", HTTP_POST, [this]() { handleCycleDone(); });

  // --- /admin ---
  server_.on("/admin", HTTP_GET, [this]() { handleAdminGet(); });
  server_.on("/admin/login", HTTP_POST, [this]() { handleAdminLogin(); });
  server_.on("/admin/logout", HTTP_POST, [this]() { handleAdminLogout(); });
  server_.on("/admin/relay-test", HTTP_POST, [this]() { handleAdminRelayTest(); });
  server_.on("/admin/save-config", HTTP_POST, [this]() { handleAdminSaveConfig(); });
  server_.on("/admin/factory-reset", HTTP_POST, [this]() { handleAdminFactoryReset(); });

  server_.begin();
}

void ApiServer::handleClient() {
  server_.handleClient();
}

// --- Compatibilidad ---

void ApiServer::handleRelay() {
  auto query = queryFromWebServer(server_);
  RelayCommandResult result = handleRelayCommand(query, cfg_->relays);
  if (result.applied) {
    relays_->setRelay(result.component, result.state);
  }
  server_.send(result.httpStatus, "text/plain", result.body.c_str());
}

void ApiServer::handleStatusRoute() {
  StatusSnapshot snap;
  snap.machineId = cfg_->machineId;
  snap.ip = wifi_->localIp().c_str();
  snap.rssi = wifi_->rssi();
  snap.uptimeSeconds = (millis() - bootMillis_) / 1000;
  snap.firmwareVersion = FRESHTOUCH_FIRMWARE_VERSION;
  snap.totalCycles = cfg_->totalCycles;
  snap.wifiConnected = wifi_->isConnected();
  for (std::size_t i = 0; i < cfg_->relays.size(); ++i) {
    const RelayAssignment& r = cfg_->relays.at(i);
    snap.relays.push_back({r.component, r.gpio, relays_->isOn(r.component)});
  }
  server_.send(200, "application/json", buildStatusJson(snap).c_str());
}

void ApiServer::handleCycleDone() {
  // Compatibilidad: se acepta el mismo query param "tipo" que HX01 ya usa,
  // aunque este firmware no distingue lógica distinta por tipo — solo se
  // registra y se cuenta.
  uint32_t newTotal = 0;
  store_->incrementAndSaveTotalCycles(newTotal);
  cfg_->totalCycles = newTotal;
  server_.send(200, "text/plain", "ok");
}

// --- /admin ---

bool ApiServer::isAdminAuthenticated() {
  if (sessionToken_.empty()) return false;
  if (millis() > sessionExpiresAtMs_) return false;
  if (!server_.hasHeader("Cookie")) return false;
  std::string cookie = server_.header("Cookie").c_str();
  std::string needle = "ftsession=" + sessionToken_;
  return cookie.find(needle) != std::string::npos;
}

String ApiServer::currentSessionCookie() {
  return String("ftsession=") + String(sessionToken_.c_str()) + "; Path=/; HttpOnly";
}

void ApiServer::handleAdminGet() {
  if (!isAdminAuthenticated()) {
    server_.send(200, "text/html", renderLoginPage(""));
    return;
  }
  server_.send(200, "text/html", renderAdminPage(""));
}

void ApiServer::handleAdminLogin() {
  if (cfg_->admin.hash.empty()) {
    // Nunca se configuró una contraseña de admin (ej. se saltó ese campo
    // en el portal de provisioning) — no hay forma segura de entrar; se lo
    // dice explícitamente en vez de aceptar cualquier cosa.
    server_.send(200, "text/html",
                 renderLoginPage("No hay contraseña de administrador configurada todavía. "
                                 "Vuelve a entrar al modo de provisioning para configurarla."));
    return;
  }

  std::string password = server_.arg("password").c_str();
  if (!AdminAuth::verifyPassword(password, cfg_->admin)) {
    server_.send(200, "text/html", renderLoginPage("Contraseña incorrecta."));
    return;
  }

  sessionToken_ = generateRandomHex(16);
  sessionExpiresAtMs_ = millis() + kSessionDurationMs;

  server_.sendHeader("Set-Cookie", currentSessionCookie());
  server_.sendHeader("Location", "/admin", true);
  server_.send(302, "text/plain", "");
}

void ApiServer::handleAdminLogout() {
  sessionToken_.clear();
  sessionExpiresAtMs_ = 0;
  server_.sendHeader("Location", "/admin", true);
  server_.send(302, "text/plain", "");
}

void ApiServer::handleAdminRelayTest() {
  if (!isAdminAuthenticated()) {
    server_.send(401, "text/plain", "unauthorized");
    return;
  }
  std::string comp = server_.arg("comp").c_str();
  if (!cfg_->relays.has(comp)) {
    server_.send(404, "text/plain", "unknown component");
    return;
  }
  // PRUEBA TÉCNICA: enciende el relé kRelayTestDurationMs y lo apaga —
  // bloqueante a propósito (es una acción manual de un admin).
  relays_->setRelay(comp, true);
  delay(kRelayTestDurationMs);
  relays_->setRelay(comp, false);

  server_.sendHeader("Location", "/admin", true);
  server_.send(302, "text/plain", "");
}

void ApiServer::handleAdminSaveConfig() {
  if (!isAdminAuthenticated()) {
    server_.send(401, "text/plain", "unauthorized");
    return;
  }

  MachineConfig updated = *cfg_;
  if (server_.arg("machineId").length() > 0) {
    updated.machineId = server_.arg("machineId").c_str();
  }
  if (server_.arg("ssid").length() > 0) {
    updated.wifi.ssid = server_.arg("ssid").c_str();
  }
  if (server_.arg("pass").length() > 0) {
    updated.wifi.password = server_.arg("pass").c_str();
  }
  if (server_.arg("newAdminPass").length() > 0) {
    std::string salt = generateRandomHex(8);
    updated.admin = AdminAuth::hashPassword(server_.arg("newAdminPass").c_str(), salt);
  }

  ConfigValidationResult check = validateForNormalOperation(updated);
  if (!check.valid) {
    server_.send(200, "text/html", renderAdminPage("No se pudo guardar: " + check.error));
    return;
  }

  *cfg_ = updated;
  store_->save(*cfg_);
  server_.send(200, "text/html", renderAdminPage("Configuración guardada."));
}

void ApiServer::handleAdminFactoryReset() {
  if (!isAdminAuthenticated()) {
    server_.send(401, "text/plain", "unauthorized");
    return;
  }
  store_->factoryReset();
  server_.send(200, "text/html",
               "<html><body><h3>Reset de fábrica hecho. Reiniciando...</h3></body></html>");
  delay(500);
  ESP.restart();
}

// --- HTML ---

String ApiServer::renderLoginPage(const std::string& error) {
  String html;
  html += "<!DOCTYPE html><html><head><meta charset='utf-8'>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>FreshTouch — Admin</title>";
  html += "<style>body{font-family:sans-serif;max-width:360px;margin:60px auto;padding:0 16px}"
          "input{width:100%;box-sizing:border-box;padding:10px;font-size:15px;margin-top:8px}"
          "button{margin-top:16px;width:100%;padding:12px;background:#1B2A4A;color:#fff;border:none;border-radius:6px}"
          ".err{color:#c0392b;font-size:13px}</style></head><body>";
  html += "<h2>FreshTouch — Acceso admin</h2>";
  if (!error.empty()) html += "<p class='err'>" + String(error.c_str()) + "</p>";
  html += "<form method='POST' action='/admin/login'>";
  html += "<input name='password' type='password' placeholder='Contraseña de administrador' required>";
  html += "<button type='submit'>Entrar</button></form></body></html>";
  return html;
}

String ApiServer::renderAdminPage(const std::string& message) {
  String html;
  html += "<!DOCTYPE html><html><head><meta charset='utf-8'>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>FreshTouch — Admin</title>";
  html += "<style>body{font-family:sans-serif;max-width:480px;margin:20px auto;padding:0 16px}"
          "input,select{width:100%;box-sizing:border-box;padding:8px;margin-top:4px;font-size:14px}"
          "label{display:block;margin-top:10px;font-size:12px;color:#555}"
          "button{margin-top:10px;padding:8px 14px;border:none;border-radius:6px;background:#1B2A4A;color:#fff}"
          ".danger{background:#c0392b}.msg{color:#27AE60;font-size:13px}"
          ".relay-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee}"
          "</style></head><body>";
  html += "<h2>FreshTouch — Panel de administración</h2>";
  if (!message.empty()) html += "<p class='msg'>" + String(message.c_str()) + "</p>";

  html += "<p><b>Machine ID:</b> " + String(cfg_->machineId.c_str()) + "<br>";
  html += "<b>IP:</b> " + wifi_->localIp() + " &middot; <b>RSSI:</b> " + String(wifi_->rssi()) + " dBm<br>";
  html += "<b>Firmware:</b> " FRESHTOUCH_FIRMWARE_VERSION " &middot; <b>Ciclos totales:</b> " + String(cfg_->totalCycles);
  html += "</p>";

  html += "<h3>Prueba de relés <span style='font-weight:normal;font-size:12px;color:#888'>(PRUEBA TÉCNICA — enciende " +
          String(kRelayTestDurationMs) + "ms y apaga)</span></h3>";
  for (std::size_t i = 0; i < cfg_->relays.size(); ++i) {
    const RelayAssignment& r = cfg_->relays.at(i);
    html += "<div class='relay-row'><span>" + String(r.component.c_str()) + " (GPIO" + String(r.gpio) + ")</span>";
    html += "<form method='POST' action='/admin/relay-test' style='margin:0'>";
    html += "<input type='hidden' name='comp' value='" + String(r.component.c_str()) + "'>";
    html += "<button type='submit'>Probar</button></form></div>";
  }

  html += "<h3>Configuración</h3>";
  html += "<form method='POST' action='/admin/save-config'>";
  html += "<label>Machine ID</label><input name='machineId' value='" + String(cfg_->machineId.c_str()) + "'>";
  html += "<label>Wi-Fi SSID</label><input name='ssid' value='" + String(cfg_->wifi.ssid.c_str()) + "'>";
  html += "<label>Wi-Fi contraseña (dejar vacío para no cambiar)</label><input name='pass' type='password'>";
  html += "<label>Nueva contraseña de admin (dejar vacío para no cambiar)</label><input name='newAdminPass' type='password'>";
  html += "<button type='submit'>Guardar</button>";
  html += "</form>";

  html += "<form method='POST' action='/admin/logout' style='display:inline'><button type='submit'>Salir</button></form> ";
  html += "<form method='POST' action='/admin/factory-reset' style='display:inline' "
          "onsubmit=\"return confirm('Esto borra toda la configuración guardada. ¿Continuar?');\">"
          "<button type='submit' class='danger'>Reset de fábrica</button></form>";

  html += "</body></html>";
  return html;
}

// ============================================================================
// OtaManager — punto de enganche preparado, deliberadamente SIN
// implementar (autorización explícita: preparar la arquitectura y
// documentarla, no implementarla — ver docs/OTA-ARCHITECTURE.md). begin()/
// tick() no hacen nada. Intencional.
// ============================================================================

class OtaManager {
 public:
  void begin() {
    // Intencionalmente vacío — ver docs/OTA-ARCHITECTURE.md.
  }

  void tick() {
    // Intencionalmente vacío.
  }
};

}  // namespace freshtouch

// ============================================================================
// setup()/loop() — orquestación (equivalente a src/main.cpp del proyecto
// modular).
// ============================================================================

using namespace freshtouch;

namespace {

enum class Mode { Normal, Provisioning };

NvsConfigStore g_store;
MachineConfig g_cfg;
RelayController g_relays;
WifiManager g_wifi;
ApiServer g_api;
ProvisioningPortal g_portal;
OtaManager g_ota;

Mode g_mode = Mode::Normal;
uint32_t g_bootMillis = 0;

void enterProvisioningMode() {
  Serial.println("[main] Entrando a modo provisioning (AP + portal cautivo).");
  g_mode = Mode::Provisioning;
  g_portal.begin(g_store);
}

void enterNormalMode() {
  Serial.println("[main] Modo normal — conectando Wi-Fi.");
  g_mode = Mode::Normal;
  g_relays.begin(g_cfg.relays);
  g_wifi.begin(g_cfg.wifi, g_cfg.network);
  g_api.begin(g_cfg, g_relays, g_store, g_wifi, g_bootMillis);
  g_ota.begin();
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n[main] FreshTouch ESP32 firmware " FRESHTOUCH_FIRMWARE_VERSION);

  g_bootMillis = millis();

  g_store.begin();
  g_cfg = g_store.load();

  if (!hasWifiCredentials(g_cfg.wifi)) {
    enterProvisioningMode();
  } else {
    enterNormalMode();
  }
}

void loop() {
  if (g_mode == Mode::Provisioning) {
    g_portal.handleClient();
    if (g_portal.configSubmitted()) {
      Serial.println("[main] Configuración guardada desde el portal — reiniciando.");
      delay(500);
      ESP.restart();
    }
    return;
  }

  // Mode::Normal
  bool needsProvisioning = g_wifi.tick();
  if (needsProvisioning) {
    Serial.println("[main] Se agotó la ventana de reintento de Wi-Fi — volviendo a provisioning.");
    enterProvisioningMode();
    return;
  }

  g_api.handleClient();
  g_ota.tick();
}
