#pragma once
// WifiRetryPolicy — decide qué hacer ante una desconexión de Wi-Fi, sin
// tocar hardware. Recibe el reloj como parámetro (uint32_t ms) en vez de
// leer millis() internamente, para poder probarlo de forma determinista
// sin esperar tiempo real — el adaptador en main.cpp es el único que
// llama a millis() y le pasa el valor aquí.
//
// Reglas pedidas en la autorización: "si se pierde Wi-Fi, intentar
// reconectar; si no puede conectarse durante un período configurable,
// permitir entrar nuevamente al modo de provisioning sin requerir
// reflashear el firmware."

#include <cstdint>

namespace freshtouch {

enum class WifiConnState {
  Connected,
  RetryWait,           // desconectado, todavía dentro de la ventana de reintento
  ProvisioningRequired  // se agotó la ventana — volver al portal de configuración
};

class WifiRetryPolicy {
 public:
  explicit WifiRetryPolicy(uint32_t maxRetryWindowMs = 120000, uint32_t retryIntervalMs = 5000);

  void onDisconnected(uint32_t nowMs);
  void onConnected();

  // ¿ya toca reintentar YA (nowMs - último intento >= retryIntervalMs)?
  bool shouldRetryNow(uint32_t nowMs) const;

  void markRetryAttempted(uint32_t nowMs);

  // Estado global a partir del reloj actual.
  WifiConnState evaluate(uint32_t nowMs) const;

 private:
  uint32_t maxRetryWindowMs_;
  uint32_t retryIntervalMs_;
  bool connected_ = true;  // arranca optimista; onDisconnected() lo corrige
  uint32_t disconnectedAtMs_ = 0;
  uint32_t lastRetryAtMs_ = 0;
};

}  // namespace freshtouch
