#pragma once
// AdminAuth — verificación de la contraseña de /admin.
//
// NUNCA se guarda la contraseña en texto plano — ni en NVS, ni en
// memoria más tiempo del necesario para calcular el hash. Se guarda
// salt + sha256("salt:contraseña"), y verifyPassword() recalcula el
// mismo hash a partir de la contraseña recibida para compararlo.
//
// Advertencia honesta (ver docs/SECURITY.md): esto es un salted hash de
// una sola ronda, no un KDF con estiramiento (PBKDF2/bcrypt/scrypt) — es
// razonable para un panel de administración en la red local de una sola
// máquina, pero no es el estándar recomendado para, por ejemplo,
// contraseñas de usuarios en un sistema con muchos más usuarios/mayor
// superficie de ataque. Si se requiere más adelante, el siguiente paso
// natural es agregar iteraciones (HMAC-SHA256 repetido) sin cambiar la
// forma pública de esta clase.

#include <string>

namespace freshtouch {

struct AdminCredentialHash {
  std::string salt;  // hex, generado en el dispositivo (esp_random en el firmware real)
  std::string hash;   // sha256Hex(salt + ":" + password)
};

class AdminAuth {
 public:
  // saltHex debe venir ya generado por el llamador (en el firmware real,
  // a partir de esp_random(); en tests, un valor fijo) — esta clase no
  // genera aleatoriedad, para mantenerse pura y testable.
  static AdminCredentialHash hashPassword(const std::string& password, const std::string& saltHex);

  static bool verifyPassword(const std::string& password, const AdminCredentialHash& stored);
};

}  // namespace freshtouch
