// ⚠️ MOCK / NOT PRODUCTION ⚠️
//
// No hace ninguna llamada HTTP real, no conoce ninguna IP de ESP32. Solo
// registra qué se le pidió y responde "OK" siempre, para poder probar el
// flujo completo de la UI. Fase 3 la reemplaza por un controlador real
// que sí hable HTTP local con el ESP32 (mismo patrón que ya usa HX01 en
// producción, adaptado, nunca copiado literal).

import { ESP32_COMPONENTS } from './esp32Contract.js';

function createMockEsp32Controller() {
  const relayState = new Map(Object.values(ESP32_COMPONENTS).map((c) => [c, false]));
  let lastCycleNotified = null;
  let connectionTested = false;

  async function setRelay(component, on) {
    if (!relayState.has(component)) {
      throw new Error(`[MockEsp32Controller] Componente desconocido: "${component}"`);
    }
    relayState.set(component, on);
    return { component, on, mock: true };
  }

  async function notifyCycleDone(tipo) {
    lastCycleNotified = tipo;
    return { tipo, mock: true };
  }

  async function testConnection() {
    connectionTested = true;
    // MOCK: siempre "conectado". Un controlador real haría un GET/ping
    // real a la IP configurada y podría fallar de verdad.
    return { connected: true, mock: true, note: 'MOCK — no se contactó ningún ESP32 real' };
  }

  function getStatus() {
    return {
      relays: Object.fromEntries(relayState),
      lastCycleNotified,
      connectionTested,
      mock: true,
    };
  }

  return { setRelay, notifyCycleDone, testConnection, getStatus };
}

export { createMockEsp32Controller };
