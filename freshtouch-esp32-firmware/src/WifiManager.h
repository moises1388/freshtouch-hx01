#pragma once
// WifiManager — conecta a la red configurada (DHCP o IP estática),
// reporta estado/RSSI/IP, y usa WifiRetryPolicy (lib/core/, ya probado
// nativamente) para decidir cuándo reintentar y cuándo rendirse y pedir
// volver a modo provisioning — nunca reimplementa esa decisión aquí.
//
// ⚠️ NO COMPILADO EN ESTE ENTORNO ⚠️ — depende de WiFi.h del núcleo
// Arduino-ESP32. Ver NvsConfigStore.h para la nota completa.

#include <WiFi.h>

#include "MachineConfig.h"
#include "WifiRetryPolicy.h"

namespace freshtouch {

class WifiManager {
 public:
  void begin(const WifiCredentials& wifi, const NetworkConfig& network);

  // Se llama en cada loop() — internamente decide si hay que hacer algo
  // (reintentar, o señalar que se agotó la ventana) según millis().
  // Devuelve true si, como resultado de esta llamada, hace falta volver
  // a modo provisioning.
  bool tick();

  bool isConnected() const;
  int rssi() const;
  String localIp() const;

 private:
  WifiRetryPolicy retryPolicy_;
  bool provisioningRequested_ = false;
};

}  // namespace freshtouch
