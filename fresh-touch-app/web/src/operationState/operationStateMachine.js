// Máquina de estados de la UI de FreshTouch App — el módulo que decide
// "en qué paso de una sesión está el cliente ahora mismo", separado a
// propósito de paymentStateMachine.js (que vive en freshtouch-hx02-cubo-lab/
// y modela el detalle interno de un intento de pago con Cubo — un
// problema distinto y ya resuelto por separado, no se toca ni se importa
// aquí en Fase 1).
//
// Diseñado siguiendo el flujo real ya pedido:
//   IDLE -> SERVICE_SELECTED -> WAITING_PAYMENT -> PAYMENT_APPROVED ->
//   READY_TO_START -> DOOR_OPEN -> CYCLE_RUNNING -> CYCLE_FINISHED -> IDLE
//
// En Fase 1, todos los eventos que disparan las transiciones de pago/
// hardware (PAYMENT_APPROVED, DOOR_OPENED, CYCLE_DONE...) los produce un
// mock (ver payment/mockPaymentProvider.js, esp32/mockEsp32Controller.js)
// — esta máquina de estados en sí no sabe ni le importa si el evento vino
// de un mock o de Cubo/ESP32 real: ese es exactamente el punto de
// diseñarla así desde ahora, para que Fase 4/5 no la tengan que rehacer.

const STATES = Object.freeze({
  IDLE: 'IDLE',
  SERVICE_SELECTED: 'SERVICE_SELECTED',
  WAITING_PAYMENT: 'WAITING_PAYMENT',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  READY_TO_START: 'READY_TO_START',
  DOOR_OPEN: 'DOOR_OPEN',
  CYCLE_RUNNING: 'CYCLE_RUNNING',
  CYCLE_FINISHED: 'CYCLE_FINISHED',
});

// Tabla de transición explícita: estado actual -> { evento: estado siguiente }.
// Cualquier evento no listado para el estado actual se ignora (no lanza) —
// mismo principio "fail closed, nunca adivinar" que ya se usó en
// paymentStateMachine.js del lab de Cubo.
const TRANSITIONS = Object.freeze({
  [STATES.IDLE]: {
    SELECT_SERVICE: STATES.SERVICE_SELECTED,
  },
  [STATES.SERVICE_SELECTED]: {
    REQUEST_PAYMENT: STATES.WAITING_PAYMENT,
    CANCEL: STATES.IDLE,
  },
  [STATES.WAITING_PAYMENT]: {
    PAYMENT_APPROVED: STATES.PAYMENT_APPROVED,
    // Un pago rechazado/con error/expirado regresa a SERVICE_SELECTED
    // (no a IDLE) — el cliente no debería tener que volver a elegir el
    // servicio, solo reintentar el pago. Mismo criterio ya validado en
    // CuboCardProvider.retryPayment() del lab de HX02.
    PAYMENT_DECLINED: STATES.SERVICE_SELECTED,
    PAYMENT_ERROR: STATES.SERVICE_SELECTED,
    PAYMENT_TIMEOUT: STATES.SERVICE_SELECTED,
    CANCEL: STATES.SERVICE_SELECTED,
  },
  [STATES.PAYMENT_APPROVED]: {
    CONFIRM_READY: STATES.READY_TO_START,
  },
  [STATES.READY_TO_START]: {
    OPEN_DOOR: STATES.DOOR_OPEN,
    // ETAPA 2: si abrir la puerta falla (ESP32 no responde/rechaza), no
    // hay forma de seguir — sin RESET aquí, un cliente nuevo nunca podría
    // ni siquiera SELECT_SERVICE (evento no listado para este estado se
    // ignora en vez de lanzar, ver send() abajo). La recuperación es
    // siempre manual, desde Admin — nunca automática.
    RESET: STATES.IDLE,
  },
  [STATES.DOOR_OPEN]: {
    START_CYCLE: STATES.CYCLE_RUNNING,
    RESET: STATES.IDLE,
  },
  [STATES.CYCLE_RUNNING]: {
    CYCLE_DONE: STATES.CYCLE_FINISHED,
    // Mismo caso que arriba, para cuando el fallo ocurre asegurando la
    // puerta antes del ciclo, o durante vapor/secado/UV, o notificando
    // /cycle-done — ver handleCycleFailure() en main.js.
    RESET: STATES.IDLE,
  },
  [STATES.CYCLE_FINISHED]: {
    RETURN_TO_IDLE: STATES.IDLE,
  },
});

/**
 * Estados desde los que NUNCA debe autorizarse un ciclo — equivalente
 * conceptual de canStartCycle() en paymentStateMachine.js, pero para la
 * pregunta de la UI, no de Cubo: "¿es seguro pedirle a ESP32 que arranque
 * un ciclo ahora mismo?" Solo CYCLE_RUNNING debería estarlo pidiendo, y
 * solo se llega ahí después de PAYMENT_APPROVED confirmado — nunca antes.
 */
function canRunCycle(state) {
  return state === STATES.CYCLE_RUNNING;
}

function createOperationSession() {
  let current = STATES.IDLE;
  const listeners = new Set();

  function getState() {
    return current;
  }

  function send(event) {
    const nextState = TRANSITIONS[current]?.[event];
    if (!nextState) {
      // Evento no válido para el estado actual: se ignora, no se lanza.
      // Coherente con el resto del proyecto (paymentStateMachine.js hace
      // lo mismo) — un evento inesperado no debe tumbar la sesión del
      // cliente.
      return false;
    }
    const previous = current;
    current = nextState;
    for (const listener of listeners) listener({ from: previous, to: current, event });
    return true;
  }

  function onTransition(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, send, onTransition };
}

export { STATES, TRANSITIONS, canRunCycle, createOperationSession };
