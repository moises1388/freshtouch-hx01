#pragma once
// RandomUtil — el único lugar que llama a esp_random() (RNG por
// hardware del ESP32). Usado para generar la sal de AdminAuth — nunca
// para nada que necesite mezclarse con la lógica pura de lib/core/, que
// se mantiene determinista y probable nativamente a propósito.
//
// ⚠️ NO COMPILADO EN ESTE ENTORNO ⚠️ — depende de esp_system.h del
// núcleo Arduino-ESP32. Ver NvsConfigStore.h para la nota completa.

#include <string>

namespace freshtouch {

// bytesLen*2 caracteres hex en minúsculas.
std::string generateRandomHex(std::size_t bytesLen);

}  // namespace freshtouch
