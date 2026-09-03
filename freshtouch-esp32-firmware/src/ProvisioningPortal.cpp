#include "ProvisioningPortal.h"

#include <WiFi.h>

#include <cstdio>

#include "AdminAuth.h"
#include "RandomUtil.h"
#include "firmware_version.h"

namespace freshtouch {

namespace {
constexpr byte kDnsPort = 53;
const IPAddress kApIp(192, 168, 4, 1);
}  // namespace

String buildApSsid() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char suffix[5];
  snprintf(suffix, sizeof(suffix), "%02X%02X", mac[4], mac[5]);
  return "FreshTouch-Setup-" + String(suffix);
}

void ProvisioningPortal::begin(NvsConfigStore& store) {
  store_ = &store;
  configSubmitted_ = false;

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(kApIp, kApIp, IPAddress(255, 255, 255, 0));
  WiFi.softAP(buildApSsid().c_str());

  dns_.start(kDnsPort, "*", kApIp);

  server_.on("/", HTTP_GET, [this]() { handleRoot(); });
  server_.on("/save", HTTP_POST, [this]() { handleSave(); });
  // Cualquier otra ruta (lo que un teléfono pide para detectar el
  // portal cautivo — generate_204, hotspot-detect.html, etc.) se manda
  // al formulario, igual que cualquier portal cautivo estándar.
  server_.onNotFound([this]() { handleCaptivePortalRedirect(); });
  server_.begin();
}

void ProvisioningPortal::handleClient() {
  dns_.processNextRequest();
  server_.handleClient();
}

void ProvisioningPortal::handleCaptivePortalRedirect() {
  server_.sendHeader("Location", "/", true);
  server_.send(302, "text/plain", "");
}

String ProvisioningPortal::buildFormHtml(const std::string& errorMessage) {
  MachineConfig current = store_->load();

  String html;
  html += "<!DOCTYPE html><html><head><meta charset='utf-8'>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>FreshTouch — Configuración</title>";
  html += "<style>body{font-family:sans-serif;max-width:420px;margin:20px auto;padding:0 16px}"
          "label{display:block;margin-top:12px;font-size:13px;color:#555}"
          "input,select{width:100%;box-sizing:border-box;padding:8px;margin-top:4px;font-size:15px}"
          "button{margin-top:20px;width:100%;padding:12px;font-size:15px;background:#1B2A4A;color:#fff;border:none;border-radius:6px}"
          ".err{color:#c0392b;font-size:13px;margin-top:8px}</style></head><body>";
  html += "<h2>FreshTouch — Configuración inicial</h2>";
  if (!errorMessage.empty()) {
    html += "<div class='err'>" + String(errorMessage.c_str()) + "</div>";
  }
  html += "<form method='POST' action='/save'>";
  html += "<label>Machine ID</label><input name='machineId' value='" + String(current.machineId.c_str()) + "' required>";
  html += "<label>Wi-Fi SSID</label><input name='ssid' value='" + String(current.wifi.ssid.c_str()) + "' required>";
  html += "<label>Wi-Fi contraseña</label><input name='pass' type='password'>";
  html += "<label>Modo de red</label><select name='netMode'>";
  html += String("<option value='dhcp'") + (current.network.mode == NetworkMode::Dhcp ? " selected" : "") + ">DHCP (automático)</option>";
  html += String("<option value='static'") + (current.network.mode == NetworkMode::Static ? " selected" : "") + ">IP estática</option>";
  html += "</select>";
  html += "<label>IP estática (si aplica)</label><input name='staticIp' value='" + String(current.network.staticIp.c_str()) + "'>";
  html += "<label>Gateway (si aplica)</label><input name='gateway' value='" + String(current.network.gateway.c_str()) + "'>";
  html += "<label>Subnet (si aplica)</label><input name='subnet' value='" + String(current.network.subnet.c_str()) + "'>";
  html += "<label>Contraseña de administrador (/admin)</label><input name='adminPass' type='password' placeholder='dejar vacío para no cambiarla'>";
  html += "<button type='submit'>Guardar y reiniciar</button>";
  html += "</form>";
  html += "<p style='font-size:11px;color:#888;margin-top:24px'>FreshTouch ESP32 firmware " FRESHTOUCH_FIRMWARE_VERSION "</p>";
  html += "</body></html>";
  return html;
}

void ProvisioningPortal::handleRoot() {
  server_.send(200, "text/html", buildFormHtml(""));
}

void ProvisioningPortal::handleSave() {
  MachineConfig cfg = store_->load();

  cfg.machineId = server_.arg("machineId").c_str();
  cfg.wifi.ssid = server_.arg("ssid").c_str();
  if (server_.arg("pass").length() > 0) {
    cfg.wifi.password = server_.arg("pass").c_str();
  }

  cfg.network.mode = (server_.arg("netMode") == "static") ? NetworkMode::Static : NetworkMode::Dhcp;
  cfg.network.staticIp = server_.arg("staticIp").c_str();
  cfg.network.gateway = server_.arg("gateway").c_str();
  cfg.network.subnet = server_.arg("subnet").c_str();

  if (server_.arg("adminPass").length() > 0) {
    std::string salt = generateRandomHex(8);
    cfg.admin = AdminAuth::hashPassword(server_.arg("adminPass").c_str(), salt);
  }

  ConfigValidationResult check = validateForNormalOperation(cfg);
  if (!check.valid) {
    server_.send(200, "text/html", buildFormHtml("No se pudo guardar: " + check.error));
    return;
  }

  store_->save(cfg);
  configSubmitted_ = true;

  server_.send(200, "text/html",
               "<html><body><h3>Guardado. El dispositivo se está reiniciando...</h3>"
               "<p>Conéctate de nuevo a tu red Wi-Fi normal en unos segundos.</p></body></html>");
}

}  // namespace freshtouch
