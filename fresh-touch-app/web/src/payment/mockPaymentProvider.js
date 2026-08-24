// ⚠️ MOCK / NOT PRODUCTION ⚠️
//
// Implementación de prueba de PaymentContract — simula un intento de pago
// sin ningún hardware, ningún SDK de Cubo, ninguna llamada de red. Existe
// exclusivamente para poder recorrer el flujo completo de FreshTouch App
// en un navegador durante Fase 1-3, antes de que Fase 5 conecte el
// CuboCardProvider real del lab de HX02.
//
// No usar en producción bajo ninguna circunstancia — no verifica nada
// real, cualquier `outcome` que se le pida lo obedece sin cuestionarlo.

const STATUS = Object.freeze({
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  WAITING_FOR_CARD: 'WAITING_FOR_CARD',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
});

/**
 * @param {{ simulatedDelayMs?: number }} options — solo para pruebas: cuánto tarda "conectar"/"pagar" antes de resolver.
 */
function createMockPaymentProvider({ simulatedDelayMs = 0 } = {}) {
  let status = STATUS.IDLE;
  let currentService = null;
  const resultHandlers = new Set();

  function notify(extra) {
    for (const handler of resultHandlers) handler({ providerType: 'mock', status, ...extra });
  }

  function selectService(service) {
    currentService = service;
    notify({ event: 'service_selected', service: service?.label });
  }

  async function connectPos() {
    status = STATUS.CONNECTING;
    notify({ event: 'connecting' });
    await wait(simulatedDelayMs);
    status = STATUS.CONNECTED;
    notify({ event: 'connected' });
  }

  /**
   * @param {{ outcome?: 'SUCCESS'|'DECLINED'|'ERROR' }} params — SOLO existe en el mock;
   *   un proveedor real jamás recibe un parámetro que le diga qué resultado dar.
   */
  async function createPayment({ outcome = 'SUCCESS' } = {}) {
    status = STATUS.WAITING_FOR_CARD;
    notify({ event: 'payment_started', service: currentService?.label, mockOutcome: outcome });
    await wait(simulatedDelayMs);

    if (outcome === 'DECLINED') {
      status = STATUS.PAYMENT_DECLINED;
      notify({ event: 'payment_declined' });
      return;
    }
    if (outcome === 'ERROR') {
      status = STATUS.PAYMENT_ERROR;
      notify({ event: 'payment_error', message: 'Simulated error (mock, no real Cubo).' });
      return;
    }
    status = STATUS.PAYMENT_APPROVED;
    notify({ event: 'payment_approved' });
  }

  function cancelPayment() {
    status = STATUS.IDLE;
    notify({ event: 'cancelled' });
  }

  async function retryPayment() {
    status = STATUS.CONNECTED;
    notify({ event: 'retry_ready' });
  }

  function getStatus() {
    return status;
  }

  function canStartCycle() {
    return status === STATUS.PAYMENT_APPROVED;
  }

  function requestCycle() {
    if (!canStartCycle()) {
      throw new Error(`[MockPaymentProvider] requestCycle() rechazado desde status="${status}" — MOCK, pero la regla es real: nunca autorizar sin pago aprobado.`);
    }
    return { authorized: true, service: currentService };
  }

  function onResult(handler) {
    resultHandlers.add(handler);
    return () => resultHandlers.delete(handler);
  }

  return {
    providerType: 'mock',
    selectService,
    connectPos,
    createPayment,
    cancelPayment,
    retryPayment,
    getStatus,
    canStartCycle,
    requestCycle,
    onResult,
  };
}

function wait(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

export { createMockPaymentProvider, STATUS };
