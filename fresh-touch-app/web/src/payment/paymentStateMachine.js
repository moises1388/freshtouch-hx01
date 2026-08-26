// Payment state machine — portado literalmente desde
// freshtouch-hx02-cubo-lab/src/payment/paymentStateMachine.js (validado con
// hardware real: QPOS Cute, cobro real Q20 confirmado en Cubo Admin). No se
// reimplementa: se copia tal cual, solo se le quita el comentario de
// cabecera específico del lab.
//
// El único módulo de seguridad crítico de este archivo: canStartCycle() es
// la ÚNICA función en toda esta capa que puede decir que un ciclo puede
// arrancar, y dice que sí para exactamente un estado: PAYMENT_SUCCESS.
// Ningún otro estado — incluyendo los que "suenan parecido" (tarjeta
// detectada, procesando, POS conectado) — puede devolver true.
//
// Nota de arquitectura para fresh-touch-app: este archivo es DISTINTO de
// operationState/operationStateMachine.js — ese modela la sesión completa
// del cliente en la UI (selección → pago → puerta → ciclo), este modela
// el DETALLE interno de un intento de pago con Cubo. main.js sigue usando
// operationState como antes; este archivo alimenta a operationState
// (cuboPayment.canStartCycle() dispara operation.send('PAYMENT_APPROVED'),
// igual que ya hace con el mock), no lo reemplaza.

export const STATES = Object.freeze({
  IDLE: 'IDLE',
  SERVICE_SELECTED: 'SERVICE_SELECTED',
  PAYMENT_METHOD_SELECTED: 'PAYMENT_METHOD_SELECTED',
  CONNECTING_POS: 'CONNECTING_POS',
  POS_CONNECTED: 'POS_CONNECTED',
  WAITING_FOR_CARD: 'WAITING_FOR_CARD',
  PROCESSING_PAYMENT: 'PROCESSING_PAYMENT',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',
  // Se entra apenas se autoriza y se pide un ciclo — ver requestCycle() en
  // cuboCardProvider.js. Esto cierra el hueco "un pago, un ciclo":
  // canStartCycle() es una función pura del estado ACTUAL, así que en
  // cuanto esto dispara, el estado deja de ser PAYMENT_SUCCESS y una
  // segunda petición de ciclo para el mismo pago se rechaza por el mismo
  // guard, sin necesitar una bandera aparte de "ya usado".
  CYCLE_IN_PROGRESS: 'CYCLE_IN_PROGRESS',
});

const TERMINAL_STATES = new Set([
  STATES.PAYMENT_SUCCESS,
  STATES.PAYMENT_DECLINED,
  STATES.PAYMENT_CANCELLED,
  STATES.PAYMENT_ERROR,
  STATES.PAYMENT_TIMEOUT,
]);

// Tabla de transición explícita. No hay transición comodín/por defecto —
// un evento no listado para el estado actual lanza en vez de moverse
// silenciosamente a un estado inesperado.
const TRANSITIONS = {
  [STATES.IDLE]: {
    SELECT_SERVICE: STATES.SERVICE_SELECTED,
  },
  [STATES.SERVICE_SELECTED]: {
    SELECT_CARD_PAYMENT: STATES.PAYMENT_METHOD_SELECTED,
    RESET: STATES.IDLE,
  },
  [STATES.PAYMENT_METHOD_SELECTED]: {
    CONNECT_POS: STATES.CONNECTING_POS,
    RESET: STATES.IDLE,
  },
  [STATES.CONNECTING_POS]: {
    POS_CONNECTED: STATES.POS_CONNECTED,
    POS_CONNECTION_FAILED: STATES.PAYMENT_ERROR,
    RESET: STATES.IDLE,
  },
  [STATES.POS_CONNECTED]: {
    START_PAYMENT: STATES.WAITING_FOR_CARD,
    POS_DISCONNECTED: STATES.PAYMENT_ERROR,
    RESET: STATES.IDLE,
  },
  [STATES.WAITING_FOR_CARD]: {
    CARD_DETECTED: STATES.PROCESSING_PAYMENT,
    CANCEL: STATES.PAYMENT_CANCELLED,
    TIMEOUT: STATES.PAYMENT_TIMEOUT,
    ERROR: STATES.PAYMENT_ERROR,
  },
  [STATES.PROCESSING_PAYMENT]: {
    SUCCESS: STATES.PAYMENT_SUCCESS,
    DECLINED: STATES.PAYMENT_DECLINED,
    CANCEL: STATES.PAYMENT_CANCELLED,
    TIMEOUT: STATES.PAYMENT_TIMEOUT,
    ERROR: STATES.PAYMENT_ERROR,
  },
  [STATES.PAYMENT_SUCCESS]: {
    RESET: STATES.IDLE,
    START_CYCLE: STATES.CYCLE_IN_PROGRESS,
  },
  [STATES.CYCLE_IN_PROGRESS]: {
    // CYCLE_COMPLETE se envía una vez que el ciclo físico se confirma
    // terminado. En esta fase de fresh-touch-app nada llama a esto todavía
    // (el enlace PAYMENT_SUCCESS -> ESP32 permanece deliberadamente
    // desconectado) — queda listo para cuando esa fase se autorice.
    CYCLE_COMPLETE: STATES.IDLE,
    RESET: STATES.IDLE,
  },
  [STATES.PAYMENT_DECLINED]: {
    RESET: STATES.IDLE,
    RETRY: STATES.PAYMENT_METHOD_SELECTED,
  },
  [STATES.PAYMENT_CANCELLED]: {
    RESET: STATES.IDLE,
    RETRY: STATES.PAYMENT_METHOD_SELECTED,
  },
  [STATES.PAYMENT_ERROR]: {
    RESET: STATES.IDLE,
    RETRY: STATES.PAYMENT_METHOD_SELECTED,
  },
  [STATES.PAYMENT_TIMEOUT]: {
    RESET: STATES.IDLE,
    RETRY: STATES.PAYMENT_METHOD_SELECTED,
  },
};

export function transition(currentState, event) {
  const stateTransitions = TRANSITIONS[currentState];
  if (!stateTransitions || !(event in stateTransitions)) {
    throw new Error(`Invalid transition: event "${event}" from state "${currentState}"`);
  }
  return stateTransitions[event];
}

export function isTerminal(state) {
  return TERMINAL_STATES.has(state);
}

// El único chequeo de autorización para arrancar un ciclo de máquina.
export function canStartCycle(state) {
  return state === STATES.PAYMENT_SUCCESS;
}

export function createPaymentSession() {
  let state = STATES.IDLE;
  const history = [state];
  return {
    getState: () => state,
    send(event) {
      state = transition(state, event);
      history.push(state);
      return state;
    },
    getHistory: () => [...history],
    canStartCycle: () => canStartCycle(state),
  };
}
