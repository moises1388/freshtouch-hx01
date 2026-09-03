// ⚠️ MOCK / NOT PRODUCTION ⚠️
//
// Adaptador simulado del QPOS Cute. Portado literalmente desde
// freshtouch-hx02-cubo-lab/src/cubo/mockCuboAdapter.js — mismo contrato que
// webSdkCuboAdapter.js (real), para poder probar toda la capa de arriba
// (CuboCardProvider, paymentStateMachine) sin hardware.
//
// Los nombres de evento y la forma de transactionResult son los
// CONFIRMADOS contra el repo oficial de demo de Cubo, no adivinados — ver
// freshtouch-hx02-cubo-lab/CUBO-INTEGRATION.md para la procedencia
// completa. transactionResult.data en un pago exitoso real sigue sin
// confirmarse (ver docs), así que el `data` de abajo es un placeholder
// solo para la UI de prueba, no una afirmación sobre los nombres de campo
// reales.

import { log } from './logger.js';
import { CUBO_ERROR_TYPES } from './cuboEvents.js';

export function createMockCuboAdapter({ machineConfig, simulatedLatencyMs = 900 }) {
  const listeners = new Map();
  let connected = false;
  // Un token de cancelación por invocación, no una bandera compartida. Sin
  // esto, un segundo startPayment() superpuesto (ej. cancelar -> reintentar
  // -> pagar de nuevo, todo dentro de la ventana de espera simulada)
  // reiniciaría una bandera compartida "cancelRequested" y dejaría que una
  // llamada que debía haberse detenido siguiera corriendo hasta el final,
  // emitiendo un segundo transactionResult encima del de la llamada nueva —
  // corrompiendo la máquina de estados. Cada llamada es dueña de su propio
  // token, así que una llamada obsoleta nunca puede afectar a una más nueva.
  let activeCancelToken = null;

  function emit(event, payload) {
    for (const handler of listeners.get(event) || []) handler(payload);
  }

  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(handler);
    return () => {
      listeners.set(event, (listeners.get(event) || []).filter((h) => h !== handler));
    };
  }

  async function connect() {
    log(machineConfig.machineId, 'POS connecting (simulated)');
    await delay(simulatedLatencyMs);
    connected = true;
    log(machineConfig.machineId, 'POS connected (simulated)');
    // Forma real confirmada: { deviceName }
    emit('connected', { deviceName: `Simulated QPOS Cute (${machineConfig.cuboPosId || 'mock'})` });
  }

  async function disconnect() {
    connected = false;
    log(machineConfig.machineId, 'POS disconnected (simulated)');
    emit('disconnected', undefined); // el 'disconnected' real no lleva payload
  }

  // Método real (confirmado): aborta la llamada HTTP en curso. Aquí eso
  // significa que el startPayment() simulado de abajo se detiene antes de
  // emitir cualquier transactionResult — coincide con el comportamiento
  // real plausible de una petición abortada que nunca recibe respuesta. El
  // llamador (CuboCardProvider) no espera esto para resolver el estado
  // local; transiciona de inmediato vía su propio cancelPayment().
  function cancelCurrentTransaction() {
    if (!activeCancelToken) return false;
    activeCancelToken.cancelled = true;
    return true;
  }

  /**
   * @param {{amount:string, currencyCode:string, currencySymbol:string, outcome?:'SUCCESS'|'DECLINED'|'PENDING'|'ERROR'}} params
   *   `outcome` es un override exclusivo del laboratorio/mock para poder
   *   ejercitar cada camino de resultado; el SDK real obviamente no tiene
   *   ese parámetro.
   */
  async function startPayment({ amount, currencyCode, currencySymbol, outcome = 'SUCCESS' }) {
    if (!connected) {
      throw new Error('startPayment called while POS is not connected (simulated)');
    }

    const myToken = { cancelled: false };
    activeCancelToken = myToken;

    log(machineConfig.machineId, 'Payment started (simulated)', {
      amount,
      currency: currencySymbol,
    });

    await delay(simulatedLatencyMs);
    if (myToken.cancelled) return endCancelled();
    log(machineConfig.machineId, 'Waiting for card (simulated)');

    await delay(simulatedLatencyMs);
    if (myToken.cancelled) return endCancelled();
    log(machineConfig.machineId, 'Processing payment (simulated)');

    await delay(simulatedLatencyMs);
    if (myToken.cancelled) return endCancelled();

    if (activeCancelToken === myToken) activeCancelToken = null;

    if (outcome === 'PENDING') {
      // Forma confirmada: sin `data`, sin `error` — success es falso,
      // pending es true, message es el texto a mostrar al cliente.
      log(machineConfig.machineId, 'Payment PENDING (simulated) — ambiguous, do not retry');
      emit('transactionResult', {
        success: false,
        pending: true,
        message: 'Simulated: no se pudo confirmar el pago con el banco (mock).',
      });
      return;
    }

    if (outcome === 'DECLINED') {
      const errorPayload = {
        type: CUBO_ERROR_TYPES.TRANSACTION_DECLINED,
        message: 'Simulated: transacción rechazada por el banco (mock).',
      };
      log(machineConfig.machineId, 'Payment DECLINED (simulated)');
      emit('error', errorPayload);
      emit('transactionResult', { success: false, error: errorPayload });
      return;
    }

    if (outcome === 'ERROR') {
      const errorPayload = { type: CUBO_ERROR_TYPES.SDK_ERROR, message: 'Simulated SDK error (mock).' };
      log(machineConfig.machineId, 'Payment ERROR (simulated)');
      emit('error', errorPayload);
      emit('transactionResult', { success: false, error: errorPayload });
      return;
    }

    log(machineConfig.machineId, 'Payment SUCCESS (simulated)');
    emit('transactionResult', {
      success: true,
      // Solo placeholder — los nombres de campo reales dentro de `data`
      // siguen sin verificarse.
      data: {
        transactionId: `MOCK-TXN-${Date.now()}`,
        amount,
        currencySymbol,
        timestamp: nowIso(),
      },
    });

    function endCancelled() {
      if (activeCancelToken === myToken) activeCancelToken = null;
      log(machineConfig.machineId, 'Payment request cancelled via cancelCurrentTransaction (simulated)');
      // No se emite transactionResult — una llamada HTTP abortada no
      // recibe respuesta. cuboCardProvider.cancelPayment() ya movió el
      // estado local por su cuenta; esto solo detiene los timers simulados.
    }
  }

  return {
    connect,
    disconnect,
    startPayment,
    on,
    isConnected: () => connected,
    cancelCurrentTransaction,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}
