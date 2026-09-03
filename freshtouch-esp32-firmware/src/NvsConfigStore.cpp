#include "NvsConfigStore.h"

#include <cstdio>

namespace freshtouch {

namespace {
constexpr const char* kNamespace = "ftcfg";
}

void NvsConfigStore::begin() {
  prefs_.begin(kNamespace, /*readOnly=*/false);
}

void NvsConfigStore::end() {
  prefs_.end();
}

MachineConfig NvsConfigStore::load() {
  MachineConfig cfg;  // ya arranca con RelayMap::withHx01Defaults() por el inicializador de la struct

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

  // Mapa de relés: si nunca se guardó nada (relay_count==0, primer
  // arranque real), se deja el default de HX01 que ya trae la struct.
  // Si SÍ hay algo guardado (aunque sea el mismo default, ya persistido
  // explícitamente por un guardado anterior), se reemplaza por lo
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

}  // namespace freshtouch
