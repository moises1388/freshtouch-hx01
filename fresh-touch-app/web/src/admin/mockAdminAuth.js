// ⚠️ MOCK / NOT PRODUCTION — PIN TEMPORAL, NO ES SEGURIDAD REAL ⚠️
//
// Este PIN existe solo para poder recorrer la pantalla de Admin durante
// Fase 1-5. NO protege nada de verdad: vive en texto plano en un archivo
// JavaScript que cualquiera puede leer con las herramientas de
// desarrollador del navegador. Fase 6 lo reemplaza por verificación real
// vía nativeBridge.authenticateAdmin() (Android Keystore); más adelante,
// por un código emitido por Hydrox CORE.
//
// No usar este PIN, ni este patrón, para proteger nada en producción.

const MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION = '000000';

function verifyMockAdminPin(candidate) {
  return candidate === MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION;
}

export { MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION, verifyMockAdminPin };
