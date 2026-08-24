// Sesión de administrador — implementa AdminContract. Deliberadamente NO
// contiene ninguna lógica de verificación de PIN aquí: delega siempre a
// `nativeBridge.authenticateAdmin()`, para que el día que nativeBridge
// deje de ser el mock y pase a ser Keystore real (Fase 6), este archivo
// no cambie ni una línea.

function createAdminSession({ nativeBridge }) {
  // Se guarda el rol ('sa'|'ow'|'tc'|'tn'), no solo un booleano — el
  // nivel de acceso real de HX01 depende de cuál de los 4 PINes entró
  // (ver admin/mockAdminAuth.js), no solo de si entró alguno válido.
  let role = null;

  async function authenticate(pin) {
    role = await nativeBridge.authenticateAdmin(pin);
    return isAuthenticated();
  }

  function isAuthenticated() {
    return role !== null && role !== undefined;
  }

  function getRole() {
    return role;
  }

  function logout() {
    role = null;
  }

  return { authenticate, isAuthenticated, getRole, logout };
}

export { createAdminSession };
