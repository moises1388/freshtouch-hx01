#pragma once
// RelayCommand — la validación de `GET /relay?comp=X&state=0|1`, el
// endpoint de compatibilidad más sensible de todos (no se puede cambiar
// su forma sin autorización). Separado de ApiServer.cpp (que depende de
// WebServer.h) para poder probar exactamente esta regla sin un servidor
// HTTP real: comp debe existir en el RelayMap vigente, state debe ser
// literalmente "0" o "1".
//
// Esta función NO toca ningún pin — solo decide si el comando es válido
// y, si lo es, qué componente/estado debe aplicar el llamador (ver
// src/ApiServer.cpp, que sí depende de Arduino).

#include <map>
#include <string>

#include "RelayMap.h"

namespace freshtouch {

struct RelayCommandResult {
  int httpStatus = 400;
  std::string body;
  bool applied = false;      // true si el llamador debe escribir el GPIO
  std::string component;     // válido solo si applied
  bool state = false;        // válido solo si applied
};

RelayCommandResult handleRelayCommand(const std::map<std::string, std::string>& queryParams,
                                       const RelayMap& relays);

}  // namespace freshtouch
