#pragma once
// Parser de query string mínimo, portable — se usa para /relay?comp=X&state=Y
// y para el formulario de provisioning. Se extrae como función pura
// (en vez de confiar únicamente en WebServer::arg() de Arduino) para que
// la lógica de "cómo se interpreta comp/state" quede realmente probada,
// no solo asumida.

#include <map>
#include <string>

namespace freshtouch {

// Decodifica application/x-www-form-urlencoded (%XX y '+' -> espacio).
std::string urlDecode(const std::string& encoded);

// "comp=vapor&state=1" -> {"comp": "vapor", "state": "1"}. Tolera un
// query vacío (devuelve un mapa vacío) y claves sin valor ("foo" ->
// {"foo": ""}).
std::map<std::string, std::string> parseQueryString(const std::string& query);

}  // namespace freshtouch
