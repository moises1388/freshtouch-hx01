#pragma once
// SHA-256 portable (FIPS 180-4), sin dependencias externas.
//
// Se implementa aquí, en vez de usar mbedtls (que sí trae el core ESP32
// Arduino), a propósito: así el MISMO archivo fuente corre en el
// firmware real y en los tests nativos (test/native/) — no hay dos
// implementaciones que puedan divergir. Se probó contra los vectores de
// prueba oficiales del NIST (ver test/native/test_sha256.cpp).

#include <cstdint>
#include <string>

namespace freshtouch {

// Hex en minúsculas, 64 caracteres.
std::string sha256Hex(const std::string& input);

}  // namespace freshtouch
