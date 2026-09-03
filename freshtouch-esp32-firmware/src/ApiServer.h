#pragma once
// ApiServer — todas las rutas HTTP: las de compatibilidad
// (/relay, /status, /cycle-done — ver docs/PROTOCOL.md, NO cambiar su
// forma sin autorización) y la nueva /admin.
//
// Autenticación de /admin: sesión simple por cookie (un solo token
// activo a la vez — es un dispositivo con un solo administrador en una
// red local, no un sistema multiusuario). NO es HTTP Basic Auth: se
// evitó a propósito porque hubiera requerido un decodificador base64
// adicional; en su lugar hay una pantalla de login que verifica la
// contraseña contra el hash guardado (AdminAuth, ya probado nativamente)
// y entrega una cookie de sesión con expiración.
//
// ⚠️ NO COMPILADO EN ESTE ENTORNO ⚠️ — depende de WebServer.h del
// núcleo Arduino-ESP32. Ver NvsConfigStore.h para la nota completa.

#include <WebServer.h>

#include "MachineConfig.h"
#include "NvsConfigStore.h"
#include "RelayController.h"
#include "WifiManager.h"

namespace freshtouch {

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

  // --- Compatibilidad (ver docs/PROTOCOL.md) ---
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

}  // namespace freshtouch
