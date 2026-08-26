// Adaptador ESP32 REAL — Etapa 1 (HX02, firmware v3 real).
//
// Hasta esta etapa, cada método lanzaba Esp32ProtocolUndefinedError: el
// protocolo real de HX02 no estaba confirmado. Ya se confirmó (firmware
// v3, FreshTouchESP32v3.ino): HTTP simple, sin sesión, con las rutas
// GET /status y GET /relay?comp=X&state=0|1. Este archivo traduce el
// contrato ESP32Contract a esas rutas usando esp32HttpClient.js (el único
// que sabe construir URLs y hacer fetch) — este archivo no hace fetch
// directamente, solo decide QUÉ llamar y cómo mapear el resultado/error
// al contrato.
//
// notifyCycleDone() se queda deliberadamente SIN implementar en esta
// etapa: /cycle-done es la conexión al ciclo físico completo, y esa
// conexión (requestCycle()/reportCycleComplete() -> ESP32) es Etapa 2,
// todavía no autorizada. Implementarlo ahora sería adelantarse a una
// autorización que no existe todavía.
//
// La UI nunca ve esto: recibe machineConfig (esp32Id/esp32Address desde
// Provisioning, Fase 2) y se lo pasa completo al adaptador — nunca lee ni
// pasa una IP o endpoint por su cuenta.

import { assertImplementsEsp32Contract } from './esp32Contract.js';
import { Esp32ProtocolUndefinedError } from './esp32Errors.js';
import { getEsp32Status, setEsp32Relay } from './esp32HttpClient.js';
import { withEsp32Retries } from './withEsp32Retries.js';

const PROTOCOL_UNDEFINED_MESSAGE =
  'notifyCycleDone() todavía no está conectado al ciclo físico — eso es Etapa 2 ' +
  '(integración Cubo -> ciclo completo), no autorizada todavía. GET /status y ' +
  'GET /relay ya están implementados (Etapa 1).';

function createRealEsp32Adapter({ machineConfig } = {}) {
  // Se exige esto siempre — este adaptador SIEMPRE recibe sus parámetros
  // de conexión vía machineConfig, nunca hardcodeados aquí ni leídos por
  // la UI.
  if (!machineConfig?.esp32Id || !machineConfig?.esp32Address) {
    throw new Error('[RealEsp32Adapter] Falta machineConfig.esp32Id y/o machineConfig.esp32Address.');
  }
  const { esp32Address } = machineConfig;

  // connect() NO conecta físicamente ni crea una sesión en el ESP32.
  // Solo verifica disponibilidad: el firmware es HTTP puro y sin estado
  // (no hay handshake, no hay sesión que abrir) — GET /status responder
  // 200 es la única señal de "el ESP32 está ahí y responde" que existe.
  // Sí lanza si falla (a diferencia de testConnection): main.js ya
  // trata su fallo como no bloqueante en el arranque, así que no hace
  // falta que este método absorba el error él mismo.
  async function connect() {
    const status = await withEsp32Retries(() => getEsp32Status(esp32Address));
    return { connected: true, mock: false, status };
  }

  function disconnect() {
    // No-op deliberado: connect() nunca abrió una sesión (ver arriba),
    // así que no hay nada que cerrar del lado del ESP32. No se envía
    // ninguna petición de red.
  }

  async function setRelay(component, state) {
    const result = await withEsp32Retries(() => setEsp32Relay(esp32Address, component, state));
    return { component, on: state, mock: false, httpBody: result.body };
  }

  async function notifyCycleDone() {
    throw new Esp32ProtocolUndefinedError(`[RealEsp32Adapter] notifyCycleDone(): ${PROTOCOL_UNDEFINED_MESSAGE}`);
  }

  // A diferencia de connect(), testConnection() nunca lanza — está
  // pensado para paneles/diagnóstico que necesitan poder preguntar "¿hay
  // conexión?" sin tener que envolver la llamada en try/catch cada vez
  // (mismo comportamiento que ya tiene el mock).
  async function testConnection() {
    try {
      const status = await withEsp32Retries(() => getEsp32Status(esp32Address));
      return { connected: true, mock: false, status, note: 'GET /status respondió correctamente' };
    } catch (err) {
      return { connected: false, mock: false, error: err.message };
    }
  }

  async function getStatus() {
    const status = await withEsp32Retries(() => getEsp32Status(esp32Address));
    return { ...status, mock: false };
  }

  const adapter = { connect, disconnect, setRelay, notifyCycleDone, testConnection, getStatus };
  assertImplementsEsp32Contract(adapter);
  return adapter;
}

export { createRealEsp32Adapter, PROTOCOL_UNDEFINED_MESSAGE };
