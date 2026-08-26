// CuboCardProvider — implementación de PaymentContract para pagos con
// tarjeta vía Cubo QPOS Cute (SDK Web). Portado desde
// freshtouch-hx02-cubo-lab/src/payment/cuboCardProvider.js, validado con
// hardware real (cobro real de Q20, confirmado en Cubo Admin).
//
// ÚNICA adaptación deliberada respecto al original del lab: el lab llama
// directamente a requestCycleStart()/Esp32NotImplementedError desde
// esp32Interface.js dentro de su propio requestCycle(), porque el lab no
// tiene una capa operationState separada — es su única defensa. Esta app
// SÍ tiene esp32/cycleSafety.js (assertCanStartCycle(), ya probado en la
// integración de Fase 3), y la arquitectura exigida en esta autorización
// pone a PaymentProvider y a ESP32 como ramas separadas, ambas colgando de
// operationState — no una llamando a la otra:
//
//   UI -> operationState -> PaymentProvider -> CuboCardProvider -> Cubo
//   UI -> operationState -> esp32Contract -> adaptador -> ESP32
//
// Por eso requestCycle() aquí SOLO hace la transición de estado local
// (consume la autorización, exactamente igual que mockPaymentProvider.js
// ya hace) — nunca importa nada de esp32/. El enlace real
// PAYMENT_SUCCESS -> ESP32 sigue viviendo en operationState/main.js
// (deliberadamente NO conectado todavía, por instrucción explícita de
// esta fase).
//
// Todo lo demás — la máquina de estados, el manejo de pending/cancel/
// retry/disconnect, la reutilización de la conexión Bluetooth entre
// clientes — es el mismo código ya validado, sin reimplementar nada.

import { createCuboAdapter, CUBO_CURRENCY_ISO4217, CUBO_EVENTS, CUBO_ERROR_TYPES } from './cubo/cuboAdapter.js';
import { createPaymentSession, STATES, canStartCycle } from './paymentStateMachine.js';
import { log } from './cubo/logger.js';

// Interpreta un payload real de transactionResult, forma CONFIRMADA (ver
// webSdkCuboAdapter.js / freshtouch-hx02-cubo-lab/CUBO-INTEGRATION.md):
//   { success: boolean, data?: object, pending?: boolean, message?: string,
//     error?: { type: string, message: string } }
//
// Devuelve el evento de la máquina de estados a enviar, o null para no
// enviar nada (fail-closed: la sesión se queda exactamente donde estaba,
// que nunca es PAYMENT_SUCCESS, así que canStartCycle() se queda en false).
//
// `pending: true` es el caso importante que esta función existe para
// manejar bien: el SDK no pudo confirmar si el cobro pasó, y su propia
// documentación es explícita en que reintentar automáticamente arriesga un
// doble cobro (el SDK ya tiene su propio mecanismo interno de recuperación
// basado en idempotency key — este código no debe poner una segunda capa
// de reintento encima). Por eso pending devuelve null a propósito: sin
// transición, sin reintento automático, canStartCycle() se queda en false.
// Al llamador solo se le avisa vía la notificación 'payment_pending' (ver
// abajo) para que la UI muestre result.message y exija una decisión humana
// explícita.
function interpretTransactionResult(result) {
  if (result.pending) return null;
  if (result.success) return 'SUCCESS';
  if (result.error?.type === CUBO_ERROR_TYPES.TRANSACTION_DECLINED) return 'DECLINED';
  if (result.error) return 'ERROR';
  // Ni success, ni pending, tampoco un objeto error — la forma no coincide
  // con nada documentado. Fail-closed en vez de adivinar.
  return null;
}

/**
 * @param {{mode: 'mock'|'web-sdk', machineConfig: object, apiKey?: string}} params
 */
export function createCuboCardProvider({ mode, machineConfig, apiKey }) {
  const adapter = createCuboAdapter({ mode, machineConfig, apiKey });
  const session = createPaymentSession();
  const resultHandlers = new Set();
  let currentService = null;

  function notify(extra) {
    const snapshot = { providerType: 'card', state: session.getState(), ...extra };
    for (const handler of resultHandlers) handler(snapshot);
  }

  adapter.on(CUBO_EVENTS.CONNECTED, () => {
    if (session.getState() === STATES.CONNECTING_POS) session.send('POS_CONNECTED');
    notify({ event: CUBO_EVENTS.CONNECTED });
  });

  // Compartida por el propio evento 'disconnected' del adaptador Y por un
  // disconnectPos() iniciado por la app más abajo — seguro llamarla desde
  // cualquiera de los dos lados, cualquier número de veces: solo transiciona
  // desde los estados específicos donde una desconexión tiene sentido, y no
  // hace nada (solo notifica) desde cualquier otro lado, así que llamarla
  // dos veces para la misma desconexión real nunca lanza un error de
  // transición inválida.
  function handleDisconnected() {
    const state = session.getState();
    if (state === STATES.POS_CONNECTED) session.send('POS_DISCONNECTED');
    else if (state === STATES.WAITING_FOR_CARD || state === STATES.PROCESSING_PAYMENT) session.send('ERROR');
    // IDLE / CONNECTING_POS / ya terminal: no hay nada válido a donde
    // transicionar desde aquí — solo notificar, no forzar una transición.
    notify({ event: CUBO_EVENTS.DISCONNECTED });
  }

  adapter.on(CUBO_EVENTS.DISCONNECTED, handleDisconnected);

  adapter.on(CUBO_EVENTS.ERROR, (payload) => {
    // Forma real confirmada (ver webSdkCuboAdapter.js /
    // CUBO-INTEGRATION.md): { type: string, message: string } — no existe
    // un campo `code`. Leer `.code` aquí descartaba en silencio el texto
    // real del error de Cubo (ej. un mensaje de rechazo de auth) tanto del
    // log como de la UI — bug real encontrado y corregido en el lab.
    log(machineConfig.machineId, 'CuboCardProvider: adapter error event', {
      type: payload?.type,
      message: payload?.message,
    });
    notify({ event: CUBO_EVENTS.ERROR, type: payload?.type, message: payload?.message });
  });

  adapter.on(CUBO_EVENTS.TRANSACTION_RESULT, (result) => {
    // La máquina de estados exige CARD_DETECTED (WAITING_FOR_CARD ->
    // PROCESSING_PAYMENT) antes de que cualquier evento terminal sea
    // válido. El SDK real no expone un momento separado de "tarjeta leída"
    // antes de transactionResult — pero recibir CUALQUIER transactionResult
    // (incluyendo uno pending) ya es prueba de que se intentó algo, así que
    // se trata como el momento CARD_DETECTED en vez de saltar directo al
    // resultado.
    if (session.getState() === STATES.WAITING_FOR_CARD) {
      session.send('CARD_DETECTED');
      notify({ event: 'card_detected' });
    }

    if (result.pending) {
      log(machineConfig.machineId, 'transactionResult pending — not authorizing, not retrying automatically', {
        message: result.message,
      });
      notify({ event: 'payment_pending', message: result.message });
      return;
    }

    const stateEvent = interpretTransactionResult(result);
    if (!stateEvent) {
      log(machineConfig.machineId, 'CuboCardProvider: unrecognized transactionResult shape, not transitioning', {
        success: result.success,
        errorType: result.error?.type,
      });
      notify({ event: CUBO_EVENTS.TRANSACTION_RESULT, result, transitioned: false });
      return;
    }
    session.send(stateEvent);
    notify({ event: CUBO_EVENTS.TRANSACTION_RESULT, result, transitioned: true });
  });

  // La máquina de estados exige SELECT_SERVICE -> SELECT_CARD_PAYMENT antes
  // de que CONNECT_POS sea válido.
  function selectService(service) {
    currentService = service;
    if (session.getState() === STATES.IDLE) session.send('SELECT_SERVICE');
    if (session.getState() === STATES.SERVICE_SELECTED) session.send('SELECT_CARD_PAYMENT');
    notify({ event: 'service_selected', service: service?.label });
  }

  // Se salta una llamada redundante a adapter.connect() (y, en el SDK
  // real, un nuevo selector nativo de dispositivos Bluetooth) cuando el
  // adaptador todavía reporta una conexión viva — ej. reutilizada del
  // ciclo ya completado de un cliente anterior.
  async function connectPos() {
    if (session.getState() !== STATES.PAYMENT_METHOD_SELECTED) {
      throw new Error(
        `connectPos() called from state "${session.getState()}"; selectService() must succeed first.`
      );
    }
    if (adapter.isConnected?.()) {
      session.send('CONNECT_POS');
      session.send('POS_CONNECTED');
      notify({ event: CUBO_EVENTS.CONNECTED, reused: true });
      return;
    }
    session.send('CONNECT_POS');
    notify({ event: 'connecting' });
    try {
      await adapter.connect();
    } catch (err) {
      session.send('POS_CONNECTION_FAILED');
      notify({ event: 'connect_failed', reason: err.message });
      throw err;
    }
  }

  // Hallazgo de hardware real: presionar DESCONECTAR POS visiblemente no
  // hacía nada — transiciona localmente justo después de la llamada, en
  // vez de esperar el eco del propio evento 'disconnected' del adaptador
  // (que puede no repetirse para una desconexión iniciada por la app).
  async function disconnectPos() {
    await adapter.disconnect();
    handleDisconnected();
  }

  async function createPayment() {
    if (session.getState() !== STATES.POS_CONNECTED) {
      throw new Error(
        `createPayment() called from state "${session.getState()}"; connectPos() must succeed first.`
      );
    }
    if (!currentService) {
      throw new Error('createPayment() called without selectService() first.');
    }
    session.send('START_PAYMENT');
    notify({ event: 'payment_started', service: currentService.label });
    return adapter.startPayment({
      // amount es un STRING de centavos (confirmado) — ej. "2000" para
      // Q20.00, no el número 2000.
      amount: String(Math.round(currentService.amount * 100)),
      currencyCode: CUBO_CURRENCY_ISO4217[machineConfig.currency],
      currencySymbol: 'Q',
      ...(mode === 'mock' && currentService.mockOutcome ? { outcome: currentService.mockOutcome } : {}),
    });
  }

  // Llama al cancelCurrentTransaction() real y confirmado (aborta la
  // llamada HTTP en curso) cuando el adaptador lo expone, y transiciona la
  // propia máquina de estados de inmediato sin importar qué devuelva esa
  // llamada.
  function cancelPayment() {
    const state = session.getState();
    if (state !== STATES.WAITING_FOR_CARD && state !== STATES.PROCESSING_PAYMENT) {
      throw new Error(`cancelPayment() has nothing to cancel from state "${state}".`);
    }
    const realCancelAccepted = adapter.cancelCurrentTransaction?.() ?? false;
    session.send('CANCEL');
    notify({ event: 'cancelled_locally', realCancelAccepted });
  }

  // Deja intentar de nuevo tras una falla (rechazado/cancelado/error/
  // timeout) sin forzar un nuevo emparejamiento Bluetooth cuando el POS
  // sigue físicamente conectado — la reutilización de conexión en sí es
  // trabajo de connectPos() (ver arriba).
  async function retryPayment() {
    const state = session.getState();
    const retryableStates = new Set([
      STATES.PAYMENT_DECLINED,
      STATES.PAYMENT_CANCELLED,
      STATES.PAYMENT_ERROR,
      STATES.PAYMENT_TIMEOUT,
    ]);
    if (!retryableStates.has(state)) {
      throw new Error(`retryPayment() has nothing to retry from state "${state}".`);
    }
    session.send('RETRY');
    notify({ event: 'retry_ready' });
    await connectPos();
  }

  // requestCycle(): consume la autorización localmente — NUNCA llama a
  // ESP32 (ver nota de cabecera del archivo). Mismo patrón que
  // mockPaymentProvider.requestCycle(): si el estado autoriza, consume y
  // devuelve { authorized: true, service }; si no, lanza con un mensaje
  // explícito. Una vez consumida, canStartCycle() vuelve a false
  // inmediatamente, así que una segunda llamada para el mismo pago se
  // rechaza por el mismo camino — sin necesitar una bandera aparte de "ya
  // usado".
  function requestCycle() {
    const state = session.getState();
    if (!canStartCycle(state)) {
      throw new Error(
        `[CuboCardProvider] requestCycle() rechazado — estado "${state}", se requiere PAYMENT_SUCCESS.`
      );
    }
    session.send('START_CYCLE');
    notify({ event: 'cycle_started' });
    return { authorized: true, service: currentService };
  }

  // Se llama una vez que el ciclo físico se confirma terminado, volviendo
  // a un IDLE nuevo listo para el siguiente cliente SIN tocar la conexión
  // del POS — seleccionar un nuevo servicio y llamar a connectPos() de
  // nuevo la reutilizará automáticamente (ver connectPos() arriba) en vez
  // de forzar un nuevo emparejamiento Bluetooth. Nada en esta fase de
  // fresh-touch-app llama a esto todavía (el enlace a ESP32 sigue
  // desconectado) — queda lista para cuando esa fase se autorice.
  function reportCycleComplete() {
    const state = session.getState();
    if (state !== STATES.CYCLE_IN_PROGRESS) {
      throw new Error(`reportCycleComplete() called from state "${state}"; no cycle is in progress.`);
    }
    session.send('CYCLE_COMPLETE');
    notify({ event: 'cycle_complete' });
  }

  return {
    providerType: 'card',
    selectService,
    connectPos,
    disconnectPos,
    createPayment,
    cancelPayment,
    retryPayment,
    getStatus: () => session.getState(),
    canStartCycle: () => canStartCycle(session.getState()),
    requestCycle,
    reportCycleComplete,
    onResult(handler) {
      resultHandlers.add(handler);
      return () => resultHandlers.delete(handler);
    },
  };
}
