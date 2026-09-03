#pragma once
// StatusSnapshot — la forma exacta de lo que /status devuelve, y la
// función pura que la serializa a JSON. Separado de ApiServer (que
// depende de WebServer.h) para poder probar el JSON exacto sin levantar
// un servidor HTTP real.
//
// Campos pedidos explícitamente en la autorización: machineId, IP,
// RSSI, uptime, firmware version, totalCycles, estado Wi-Fi, estado de
// los relés.

#include <cstdint>
#include <string>
#include <vector>

namespace freshtouch {

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

// JSON compacto, sin dependencias externas (no se agrega ArduinoJson u
// otra librería solo para esto — el formato es simple y fijo).
std::string buildStatusJson(const StatusSnapshot& snapshot);

}  // namespace freshtouch
