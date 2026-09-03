#pragma once
// MachineConfig — el esquema completo de configuración persistida en
// NVS. Separación estricta pedida en la autorización:
//   firmware (este repo)  |  configuración (esto)  |  secretos (Wi-Fi
//   password, admin password hash — nunca en el repo, solo en NVS del
//   dispositivo).
//
// Esta cabecera no sabe nada de Preferences.h/NVS — es una struct pura
// más funciones de validación. El adaptador que la lee/escribe de NVS
// (src/NvsConfigStore.*, con dependencia real de Arduino) vive aparte,
// para que este archivo se pueda compilar y probar nativamente.

#include <string>

#include "AdminAuth.h"
#include "RelayMap.h"

namespace freshtouch {

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
  AdminCredentialHash admin;  // vacío = todavía no se configuró un admin — ver ProvisioningPortal
  uint32_t totalCycles = 0;
};

struct ConfigValidationResult {
  bool valid;
  std::string error;  // vacío si valid == true
};

// "¿esta config alcanza para operar normalmente?" — NO es lo mismo que
// "¿es válida para guardarse?": el modo provisioning existe justo para
// cuando esto da false (sin Wi-Fi todavía, por ejemplo).
ConfigValidationResult validateForNormalOperation(const MachineConfig& cfg);

bool hasWifiCredentials(const WifiCredentials& wifi);

// Válida específicamente cuando se elige IP estática: los tres campos
// deben tener forma de IPv4 (validación de formato simple, no de
// alcanzabilidad de red — eso no se puede saber sin conectar).
bool isValidStaticNetworkConfig(const NetworkConfig& net);

bool isValidIPv4(const std::string& value);

}  // namespace freshtouch
