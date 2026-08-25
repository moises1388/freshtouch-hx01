#include "AdminAuth.h"
#include "mini_test.h"

using namespace freshtouch;

void runAdminAuthTests() {
  auto stored = AdminAuth::hashPassword("mi-clave-secreta", "salt-fijo-de-prueba");
  FT_CHECK(!stored.hash.empty());
  FT_CHECK_EQ(stored.hash.size(), static_cast<std::size_t>(64));  // sha256 hex

  FT_CHECK(AdminAuth::verifyPassword("mi-clave-secreta", stored));
  FT_CHECK(!AdminAuth::verifyPassword("clave-incorrecta", stored));

  // La misma contraseña con distinta sal produce un hash distinto — así
  // dos ESP32 con la misma contraseña de admin no terminan con el mismo
  // hash guardado en NVS.
  auto storedOtherSalt = AdminAuth::hashPassword("mi-clave-secreta", "otra-sal-distinta");
  FT_CHECK(stored.hash != storedOtherSalt.hash);

  // El hash nunca contiene la contraseña en texto plano.
  FT_CHECK(stored.hash.find("mi-clave-secreta") == std::string::npos);
}
