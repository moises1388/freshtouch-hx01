// ⚠️ MOCK / NOT PRODUCTION ⚠️
//
// No hace ninguna llamada HTTP real, no conoce ninguna IP de ESP32. Fase
// 3 amplía este mock (antes: siempre respondía OK) para poder demostrar,
// sin hardware, cada uno de los escenarios pedidos en la autorización:
// conexión, desconexión, timeout, ESP32 no disponible, comando exitoso,
// comando rechazado, y recuperación de conexión. La inyección de fallas
// (__setInjectedFailure) existe solo para que los tests puedan forzar
// cada escenario a voluntad — nunca la usa el flujo real de la UI.
//
// Por defecto se comporta "conectado" desde el momento en que se crea
// (igual que la versión de Fase 1): así ningún código existente que
// llama setRelay()/notifyCycleDone() sin llamar antes a connect() se
// rompe. connect()/disconnect() existen para que se pueda demostrar el
// ciclo de vida completo de la conexión de forma explícita, no porque el
// comportamiento por defecto lo exija.

import { ESP32_COMPONENTS } from './esp32Contract.js';
import { Esp32TimeoutError, Esp32UnavailableError, Esp32CommandRejectedError } from './esp32Errors.js';

const CONNECTION = Object.freeze({
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  UNAVAILABLE: 'UNAVAILABLE',
});

function createMockEsp32Controller() {
  const relayState = new Map(Object.values(ESP32_COMPONENTS).map((c) => [c, false]));
  let lastCycleNotified = null;
  let connection = CONNECTION.CONNECTED;
  // Solo para tests: 'timeout' | 'unavailable' | 'reject' | null.
  let injectedFailure = null;

  function throwInjectedFailure(action) {
    if (injectedFailure === 'timeout') {
      throw new Esp32TimeoutError(`[MockEsp32Controller] Timeout simulado en "${action}".`);
    }
    if (injectedFailure === 'unavailable') {
      connection = CONNECTION.UNAVAILABLE;
      throw new Esp32UnavailableError(`[MockEsp32Controller] ESP32 no disponible (simulado) en "${action}".`);
    }
    if (injectedFailure === 'reject') {
      throw new Esp32CommandRejectedError(`[MockEsp32Controller] Comando rechazado (simulado) en "${action}".`);
    }
  }

  async function connect() {
    throwInjectedFailure('connect');
    connection = CONNECTION.CONNECTED;
    return { connected: true, mock: true };
  }

  function disconnect() {
    connection = CONNECTION.DISCONNECTED;
  }

  async function setRelay(component, on) {
    if (!relayState.has(component)) {
      throw new Error(`[MockEsp32Controller] Componente desconocido: "${component}"`);
    }
    if (connection !== CONNECTION.CONNECTED) {
      throw new Esp32UnavailableError(
        `[MockEsp32Controller] setRelay("${component}") rechazado — sin conexión activa (estado: ${connection}). Llama a connect() primero.`
      );
    }
    throwInjectedFailure(`setRelay(${component})`);
    relayState.set(component, on);
    return { component, on, mock: true };
  }

  async function notifyCycleDone(tipo) {
    if (connection !== CONNECTION.CONNECTED) {
      throw new Esp32UnavailableError(
        `[MockEsp32Controller] notifyCycleDone rechazado — sin conexión activa (estado: ${connection}).`
      );
    }
    throwInjectedFailure('notifyCycleDone');
    lastCycleNotified = tipo;
    return { tipo, mock: true };
  }

  async function testConnection() {
    try {
      throwInjectedFailure('testConnection');
      connection = CONNECTION.CONNECTED;
      return { connected: true, mock: true, note: 'MOCK — no se contactó ningún ESP32 real' };
    } catch (err) {
      return { connected: false, mock: true, error: err.message, note: 'MOCK — no se contactó ningún ESP32 real' };
    }
  }

  function getStatus() {
    return {
      connection,
      relays: Object.fromEntries(relayState),
      lastCycleNotified,
      mock: true,
    };
  }

  // Solo para tests — nunca se llama desde el flujo real de la UI.
  function __setInjectedFailure(kind) {
    injectedFailure = kind;
  }

  return {
    connect, disconnect, setRelay, notifyCycleDone, testConnection, getStatus,
    __setInjectedFailure,
  };
}

export { createMockEsp32Controller, CONNECTION };
