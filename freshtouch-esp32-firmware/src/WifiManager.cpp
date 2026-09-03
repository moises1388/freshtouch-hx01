#include "WifiManager.h"

#include <Arduino.h>

namespace freshtouch {

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

}  // namespace freshtouch
