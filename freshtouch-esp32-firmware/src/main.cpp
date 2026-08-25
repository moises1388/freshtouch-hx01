// FreshTouch ESP32 firmware v3 — universal (HX01/HX02/HX03/...).
//
// ⚠️ NO COMPILADO EN ESTE ENTORNO ⚠️ — ver docs/FIRST-FLASH-HX02.md. El
// primer paso, antes de flashear nada, es correr `pio run` (o el IDE de
// Arduino) desde una máquina con acceso normal a internet y confirmar
// que compila limpio. Este sandbox de desarrollo tiene bloqueado por
// política de red el registro de paquetes de PlatformIO y las descargas
// de Arduino/Espressif — ver el informe de esta fase para el detalle.
//
// Filosofía: mismo firmware + configuración individual por máquina (ver
// docs/PROTOCOL.md y docs/PROVISIONING.md). Nada de esto se conecta ni
// modifica HX01, fresh-touch-app/, freshtouch-hx02-cubo-lab/ ni
// freshtouch-core/ — es un proyecto independiente.

#include <Arduino.h>

#include "ApiServer.h"
#include "MachineConfig.h"
#include "NvsConfigStore.h"
#include "OtaManager.h"
#include "ProvisioningPortal.h"
#include "RelayController.h"
#include "WifiManager.h"
#include "firmware_version.h"

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
