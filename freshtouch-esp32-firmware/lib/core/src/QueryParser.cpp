#include "QueryParser.h"

#include <cctype>
#include <sstream>

namespace freshtouch {

namespace {
int hexVal(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}
}  // namespace

std::string urlDecode(const std::string& encoded) {
  std::string out;
  out.reserve(encoded.size());
  for (std::size_t i = 0; i < encoded.size(); ++i) {
    char c = encoded[i];
    if (c == '+') {
      out += ' ';
    } else if (c == '%' && i + 2 < encoded.size()) {
      int hi = hexVal(encoded[i + 1]);
      int lo = hexVal(encoded[i + 2]);
      if (hi >= 0 && lo >= 0) {
        out += static_cast<char>((hi << 4) | lo);
        i += 2;
      } else {
        out += c;
      }
    } else {
      out += c;
    }
  }
  return out;
}

std::map<std::string, std::string> parseQueryString(const std::string& query) {
  std::map<std::string, std::string> result;
  std::stringstream ss(query);
  std::string pair;
  while (std::getline(ss, pair, '&')) {
    if (pair.empty()) continue;
    auto eq = pair.find('=');
    if (eq == std::string::npos) {
      result[urlDecode(pair)] = "";
    } else {
      std::string key = urlDecode(pair.substr(0, eq));
      std::string value = urlDecode(pair.substr(eq + 1));
      result[key] = value;
    }
  }
  return result;
}

}  // namespace freshtouch
