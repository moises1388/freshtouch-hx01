// Sesión de administrador — implementa AdminContract. Deliberadamente NO
// contiene ninguna lógica de verificación de PIN aquí: delega siempre a
// `nativeBridge.authenticateAdmin()`, para que el día que nativeBridge
// deje de ser el mock y pase a ser Keystore real (Fase 6), este archivo
// no cambie ni una línea.

function createAdminSession({ nativeBridge }) {
  let authenticated = false;

  async function authenticate(pin) {
    const ok = await nativeBridge.authenticateAdmin(pin);
    authenticated = Boolean(ok);
    return authenticated;
  }

  function isAuthenticated() {
    return authenticated;
  }

  function logout() {
    authenticated = false;
  }

  return { authenticate, isAuthenticated, logout };
}

export { createAdminSession };
