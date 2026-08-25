#include "MachineConfig.h"

#include <cstdlib>
#include <sstream>

namespace freshtouch {

bool hasWifiCredentials(const WifiCredentials& wifi) {
  return !wifi.ssid.empty();
  // La contraseña vacía es válida a propósito (redes abiertas existen);
  // el SSID vacío es lo único que estructuralmente no se puede conectar.
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

}  // namespace freshtouch
