// AdminContract — la interfaz que la UI usa para entrar/salir del modo
// administrador, sin importar si la autenticación real termina viviendo
// en el propio mock (hoy), en nativeBridge (Fase 6), o eventualmente
// verificada contra Hydrox CORE (más adelante, fuera de alcance de esta
// fase).

function assertImplementsAdminContract(admin) {
  const requiredMethods = ['authenticate', 'isAuthenticated', 'getRole', 'logout'];
  const missing = requiredMethods.filter((m) => typeof admin?.[m] !== 'function');
  if (missing.length > 0) {
    throw new Error(`[AdminContract] Implementación incompleta — faltan métodos: ${missing.join(', ')}`);
  }
  return true;
}

export { assertImplementsAdminContract };
