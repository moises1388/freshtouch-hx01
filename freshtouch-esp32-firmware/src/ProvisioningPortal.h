#pragma once
// ProvisioningPortal — modo Access Point + página web local para
// configurar SSID/contraseña/machineId/red/contraseña de admin cuando
// el ESP32 no tiene una configuración de Wi-Fi válida (primer arranque,
// o tras agotarse la ventana de reintento de WifiManager).
//
// No requiere reflashear nada: es exactamente el mecanismo pedido en la
// autorización para "permitir entrar nuevamente al modo de provisioning
// sin requerir reflashear el firmware".
//
// ⚠️ NO COMPILADO EN ESTE ENTORNO ⚠️ — depende de WiFi.h/WebServer.h/
// DNSServer.h del núcleo Arduino-ESP32. Ver NvsConfigStore.h para la
// nota completa.

#include <DNSServer.h>
#include <WebServer.h>

#include "MachineConfig.h"
#include "NvsConfigStore.h"

namespace freshtouch {

class ProvisioningPortal {
 public:
  // Arranca WiFi.softAP(...), el DNSServer (redirige todo al portal —
  // "captive portal" real, no solo una página que hay que buscar a
  // mano) y las rutas del WebServer. store se usa para leer el
  // machineId actual (para prellenar el formulario) y para guardar al
  // enviar.
  void begin(NvsConfigStore& store);

  // Llamar en cada loop() mientras se está en modo provisioning.
  void handleClient();

  // true una vez que el formulario se envió y se guardó correctamente
  // — main.cpp debe reiniciar (ESP.restart()) al ver esto, para volver
  // a arrancar con la configuración nueva desde cero.
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

// Genera un nombre de AP único por dispositivo — "FreshTouch-Setup-XXXX"
// donde XXXX son los últimos 2 bytes de la MAC. Expuesto aparte para
// poder documentarlo/probarlo por separado si hace falta.
String buildApSsid();

}  // namespace freshtouch
