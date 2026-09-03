// ⚠️ MOCK / NOT PRODUCTION ⚠️
//
// No hay Android Keystore, no hay watchdog, no hay Device Owner. Fase 6
// reemplaza esto por el puente real hacia el componente nativo (vía HTTP
// local a 127.0.0.1, según el diseño ya acordado).
//
// Decisión deliberada de este mock, no un descuido: saveSecret() NUNCA
// guarda el valor recibido, ni siquiera en memoria — solo recuerda que
// "algo se guardó" para esa clave (un booleano). Así, aunque este mock se
// use por error, es estructuralmente imposible que filtre un secreto,
// porque nunca lo retiene. authenticateAdmin() valida contra un PIN fijo
// marcado explícitamente como no apto para producción — ver admin/ para
// dónde vive ese valor y por qué.

function createMockNativeBridge() {
  const secretPresence = new Set(); // solo claves, nunca valores

  async function saveSecret(key /*, value: intencionalmente ignorado y descartado */) {
    secretPresence.add(key);
    return { saved: true, mock: true };
    // El valor real nunca se asigna a ninguna variable de este módulo.
  }

  async function hasSecret(key) {
    return secretPresence.has(key);
  }

  async function clearSecret(key) {
    const existed = secretPresence.has(key);
    secretPresence.delete(key);
    return { cleared: existed, mock: true };
  }

  async function testConnection(target) {
    // MOCK: nunca contacta nada real (ni ESP32, ni Cubo, ni CORE).
    return { target, connected: true, mock: true, note: 'MOCK — ninguna conexión real fue intentada' };
  }

  async function authenticateAdmin(pin) {
    // Ver admin/mockAdminAuth.js — la lógica real de comparación vive ahí
    // para que quede en un solo lugar y quede clarísimamente marcada.
    // Devuelve el rol resuelto ('sa'|'ow'|'tc'|'tn') o null — no un
    // booleano — porque el nivel de acceso real de HX01 depende de CUÁL
    // PIN entró, no solo de si entró alguno válido.
    const { resolveMockAdminRole } = await import('../admin/mockAdminAuth.js');
    return resolveMockAdminRole(pin);
  }

  async function getDiagnostics() {
    return {
      internet: 'MOCK — no verificado',
      esp32: 'MOCK — no verificado',
      cubo: 'MOCK — no verificado',
      qpos: 'MOCK — no verificado',
      core: 'MOCK — no verificado',
      appVersion: '0.1.0-fase1',
      lastSync: null,
      mock: true,
    };
  }

  return { saveSecret, hasSecret, clearSecret, testConnection, authenticateAdmin, getDiagnostics };
}

export { createMockNativeBridge };
