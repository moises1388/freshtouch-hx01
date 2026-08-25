#include "StatusSnapshot.h"

#include <sstream>

namespace freshtouch {

namespace {
// Escapado JSON mínimo — suficiente para los valores que este firmware
// produce (machineId, IP, versión), no un serializador JSON genérico.
std::string jsonEscape(const std::string& in) {
  std::string out;
  out.reserve(in.size());
  for (char c : in) {
    switch (c) {
      case '"': out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n"; break;
      default: out += c;
    }
  }
  return out;
}
}  // namespace

std::string buildStatusJson(const StatusSnapshot& s) {
  std::ostringstream out;
  out << "{";
  out << "\"machineId\":\"" << jsonEscape(s.machineId) << "\",";
  out << "\"ip\":\"" << jsonEscape(s.ip) << "\",";
  out << "\"rssi\":" << s.rssi << ",";
  out << "\"uptimeSeconds\":" << s.uptimeSeconds << ",";
  out << "\"firmwareVersion\":\"" << jsonEscape(s.firmwareVersion) << "\",";
  out << "\"totalCycles\":" << s.totalCycles << ",";
  out << "\"wifiConnected\":" << (s.wifiConnected ? "true" : "false") << ",";
  out << "\"relays\":[";
  for (std::size_t i = 0; i < s.relays.size(); ++i) {
    if (i > 0) out << ",";
    const auto& r = s.relays[i];
    out << "{\"component\":\"" << jsonEscape(r.component) << "\","
        << "\"gpio\":" << static_cast<int>(r.gpio) << ","
        << "\"on\":" << (r.on ? "true" : "false") << "}";
  }
  out << "]";
  out << "}";
  return out.str();
}

}  // namespace freshtouch
