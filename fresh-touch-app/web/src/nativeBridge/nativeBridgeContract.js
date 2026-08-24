// NativeBridgeContract — la ÚNICA puerta entre el código web (agnóstico
// de plataforma) y "lo nativo" (Android Keystore, watchdog, Device
// Owner). Ningún otro módulo de web/src/ debe hablar con Android
// directamente — todo pasa por aquí, para que TWA, Capacitor, o incluso
// un navegador de escritorio normal (Fase 1, hoy) puedan implementar esta
// misma interfaz sin que payment/, esp32/, admin/ o ui/ se enteren de la
// diferencia.
//
// Regla de seguridad que define esta interfaz, no solo la documenta:
// ningún método devuelve un secreto en texto plano. saveSecret() escribe;
// hasSecret() y testConnection() solo informan sí/no (y, cuando aplica,
// un diagnóstico enmascarado) — nunca el valor.

function assertImplementsNativeBridgeContract(bridge) {
  const requiredMethods = [
    'saveSecret', 'hasSecret', 'testConnection',
    'authenticateAdmin', 'getDiagnostics',
  ];
  const missing = requiredMethods.filter((m) => typeof bridge?.[m] !== 'function');
  if (missing.length > 0) {
    throw new Error(`[NativeBridgeContract] Implementación incompleta — faltan métodos: ${missing.join(', ')}`);
  }
  return true;
}

export { assertImplementsNativeBridgeContract };
