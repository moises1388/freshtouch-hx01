#include "Sha256.h"
#include "mini_test.h"

using freshtouch::sha256Hex;

// Vectores de prueba oficiales (NIST / FIPS 180-4 ejemplos publicados)
// — si estos no dan exacto, no se debe usar este hash para nada.
void runSha256Tests() {
  FT_CHECK_EQ(sha256Hex(""), std::string("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"));
  FT_CHECK_EQ(sha256Hex("abc"), std::string("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
  FT_CHECK_EQ(
      sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
      std::string("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"));
  // Determinismo: mismo input -> mismo hash siempre.
  FT_CHECK_EQ(sha256Hex("freshtouch"), sha256Hex("freshtouch"));
  // Cambia un carácter -> hash completamente distinto (no una prueba
  // criptográfica formal, solo una red de seguridad contra una
  // implementación rota que ignore parte del input).
  FT_CHECK(sha256Hex("freshtouch1") != sha256Hex("freshtouch2"));
}
