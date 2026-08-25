#include "RelayController.h"

#include <Arduino.h>

namespace freshtouch {

void RelayController::begin(const RelayMap& relays) {
  relays_ = relays;
  state_.clear();
  for (std::size_t i = 0; i < relays_.size(); ++i) {
    const RelayAssignment& r = relays_.at(i);
    pinMode(r.gpio, OUTPUT);
    // Fail-safe: arrancar en el nivel eléctrico que corresponde a
    // "apagado" según la polaridad configurada — NUNCA asumir que LOW
    // siempre significa apagado (ver RelayMap.h: muchos módulos de relé
    // baratos son active-LOW).
    digitalWrite(r.gpio, r.activeLow ? HIGH : LOW);
    state_[r.component] = false;
  }
}

bool RelayController::setRelay(const std::string& component, bool on) {
  int gpio = relays_.gpioFor(component);
  if (gpio < 0) return false;
  bool activeLow = relays_.activeLowFor(component) == 1;
  int level = on ? (activeLow ? LOW : HIGH) : (activeLow ? HIGH : LOW);
  digitalWrite(gpio, level);
  state_[component] = on;
  return true;
}

bool RelayController::isOn(const std::string& component) const {
  auto it = state_.find(component);
  return it != state_.end() && it->second;
}

}  // namespace freshtouch
