// Adaptador ESP32 REAL — Fase 3, HX02.
//
// A diferencia del mock, este archivo pretende ser el transporte de
// verdad. Hoy no lo es: el protocolo real de HX02 (transporte, formato de
// comando, mapa de componentes) todavía no está confirmado — ver el
// informe de Fase 3 para el detalle exacto de qué falta y qué preguntas
// quedaron pendientes. HX01 usa HTTP local a una IP fija (visto en su
// app.js solo como referencia, nunca copiado ni modificado), pero la
// autorización de esta fase prohíbe explícitamente asumir que HX02 hace
// lo mismo, y el propio laboratorio de HX02 marca su interfaz de ESP32
// como no implementada por la misma razón.
//
// Por eso este adaptador cumple ESP32Contract (para que main.js pueda
// intercambiarlo por el mock sin cambiar una línea el día que el
// protocolo se confirme) pero cada método lanza inmediatamente — nunca
// inventa una llamada a un endpoint adivinado. Mejor fallar fuerte y
// explícito que fallar en silencio o, peor, mandarle un comando
// incorrecto a una máquina real.
//
// La UI nunca ve esto: recibe machineConfig (que ya trae esp32Id/
// esp32Address desde Provisioning, Fase 2) y se lo pasa completo al
// adaptador — nunca lee ni pasa una IP o endpoint por su cuenta.

import { assertImplementsEsp32Contract } from './esp32Contract.js';
import { Esp32ProtocolUndefinedError } from './esp32Errors.js';

const PROTOCOL_UNDEFINED_MESSAGE =
  'Protocolo ESP32 de HX02 no confirmado todavía. Falta confirmar transporte ' +
  '(HTTP/WebSocket/MQTT/BLE/otro), forma de los comandos/endpoints, y el mapa ' +
  'real de componentes/relés de esta máquina, antes de completar este adaptador. ' +
  'Ver el informe de Fase 3.';

function createRealEsp32Adapter({ machineConfig } = {}) {
  // Se exige esto YA, aunque el transporte no exista todavía, para dejar
  // establecido desde ahora que este adaptador SIEMPRE recibe sus
  // parámetros de conexión vía machineConfig — nunca hardcodeados aquí,
  // nunca leídos ni pasados por la UI.
  if (!machineConfig?.esp32Id || !machineConfig?.esp32Address) {
    throw new Error('[RealEsp32Adapter] Falta machineConfig.esp32Id y/o machineConfig.esp32Address.');
  }

  function notImplemented(action) {
    return async () => {
      throw new Esp32ProtocolUndefinedError(`[RealEsp32Adapter] ${action}(): ${PROTOCOL_UNDEFINED_MESSAGE}`);
    };
  }

  const adapter = {
    connect: notImplemented('connect'),
    disconnect() {
      // No-op deliberado: nunca llegó a conectar nada real, no hay nada
      // que cerrar.
    },
    setRelay: notImplemented('setRelay'),
    notifyCycleDone: notImplemented('notifyCycleDone'),
    testConnection: notImplemented('testConnection'),
    getStatus() {
      return {
        connection: 'PROTOCOL_UNDEFINED',
        machineId: machineConfig.machineId,
        esp32Id: machineConfig.esp32Id,
        mock: false,
        note: PROTOCOL_UNDEFINED_MESSAGE,
      };
    },
  };

  assertImplementsEsp32Contract(adapter);
  return adapter;
}

export { createRealEsp32Adapter, PROTOCOL_UNDEFINED_MESSAGE };
