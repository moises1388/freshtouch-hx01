#include "ApiServer.h"

#include <Arduino.h>

#include "AdminAuth.h"
#include "QueryParser.h"
#include "RandomUtil.h"
#include "RelayCommand.h"
#include "StatusSnapshot.h"
#include "firmware_version.h"

namespace freshtouch {

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

  // --- Compatibilidad — ver docs/PROTOCOL.md, no cambiar sin autorización ---
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
  // Compatibilidad: se acepta el mismo query param "tipo" que HX01 ya
  // usa, aunque este firmware no distingue lógica distinta por tipo —
  // solo se registra y se cuenta.
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
    // Nunca se configuró una contraseña de admin (ej. se saltó ese
    // campo en el portal de provisioning) — no hay forma segura de
    // entrar; se lo dice explícitamente en vez de aceptar cualquier
    // cosa.
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
  // bloqueante a propósito (es una acción manual de un admin, no algo
  // que deba correr en paralelo con nada más).
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

}  // namespace freshtouch
