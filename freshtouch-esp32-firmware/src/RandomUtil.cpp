#include "RandomUtil.h"

#include <esp_system.h>

namespace freshtouch {

std::string generateRandomHex(std::size_t bytesLen) {
  static const char* kHex = "0123456789abcdef";
  std::string out;
  out.reserve(bytesLen * 2);
  for (std::size_t i = 0; i < bytesLen; ++i) {
    uint8_t b = static_cast<uint8_t>(esp_random() & 0xFF);
    out += kHex[b >> 4];
    out += kHex[b & 0x0F];
  }
  return out;
}

}  // namespace freshtouch
