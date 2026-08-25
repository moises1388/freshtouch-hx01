#pragma once
// RelayController — la ÚNICA capa que llama pinMode()/digitalWrite().
// Ningún otro archivo debe tocar un GPIO directamente. Se apoya en
// RelayMap (lib/core/, ya probado nativamente) para saber qué pin
// corresponde a cada componente — nunca tiene un número de pin literal
// escrito aquí.
//
// ⚠️ NO COMPILADO EN ESTE ENTORNO ⚠️ — depende de Arduino.h (pinMode,
// digitalWrite). Ver NvsConfigStore.h para la nota completa sobre por
// qué, y qué hacer antes de flashear.

#include <map>
#include <string>

#include "RelayMap.h"

namespace freshtouch {

class RelayController {
 public:
  // Configura pinMode(OUTPUT) para cada componente del mapa y los deja
  // todos apagados (fail-safe: arrancar con todo apagado, nunca con un
  // relé prendido por defecto).
  void begin(const RelayMap& relays);

  // false si el componente no está en el mapa — el llamador (ApiServer)
  // ya debería haber validado esto con handleRelayCommand() antes de
  // llegar aquí, pero se revalida por defensa en profundidad.
  bool setRelay(const std::string& component, bool on);

  bool isOn(const std::string& component) const;

  const RelayMap& relayMap() const { return relays_; }

 private:
  RelayMap relays_;
  std::map<std::string, bool> state_;
};

}  // namespace freshtouch
