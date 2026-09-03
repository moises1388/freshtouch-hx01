#include "AdminAuth.h"

#include "Sha256.h"

namespace freshtouch {

AdminCredentialHash AdminAuth::hashPassword(const std::string& password, const std::string& saltHex) {
  AdminCredentialHash out;
  out.salt = saltHex;
  out.hash = sha256Hex(saltHex + ":" + password);
  return out;
}

bool AdminAuth::verifyPassword(const std::string& password, const AdminCredentialHash& stored) {
  AdminCredentialHash recomputed = hashPassword(password, stored.salt);
  // Comparación de tiempo no-constante: es una limitación conocida y
  // documentada en docs/SECURITY.md (ver AdminAuth.h) — para el modelo
  // de amenaza de un panel de admin en la red local, el timing attack no
  // es la prioridad; si se necesita, cambiar esto a una comparación de
  // tiempo constante es un cambio aislado a esta función.
  return recomputed.hash == stored.hash;
}

}  // namespace freshtouch
