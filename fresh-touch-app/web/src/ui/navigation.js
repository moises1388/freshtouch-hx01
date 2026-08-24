// Equivalente modular de go(id) en app.js de HX01 — mismo patrón visual
// (.scr / .scr.on), reimplementado aquí, no importado de HX01.

function showScreen(screenId) {
  document.querySelectorAll('.scr').forEach((el) => el.classList.remove('on'));
  const target = document.getElementById(screenId);
  if (!target) {
    throw new Error(`[navigation] No existe la pantalla "${screenId}"`);
  }
  target.classList.add('on');
}

// Mapa OperationState -> id de pantalla. Un único lugar que traduce el
// estado abstracto de operationStateMachine.js a qué ve el cliente —
// si el día de mañana se agrega un estado nuevo y falta aquí, esto debe
// fallar fuerte (ver assertScreenForEveryState en tests), no mostrar una
// pantalla en blanco.
const SCREEN_BY_STATE = Object.freeze({
  IDLE: 's-idle',
  SERVICE_SELECTED: 's-service',
  WAITING_PAYMENT: 's-payment',
  PAYMENT_APPROVED: 's-ready',
  READY_TO_START: 's-ready',
  DOOR_OPEN: 's-door',
  CYCLE_RUNNING: 's-cycle',
  CYCLE_FINISHED: 's-done',
});

function showScreenForState(state) {
  const screenId = SCREEN_BY_STATE[state];
  if (!screenId) {
    throw new Error(`[navigation] Estado "${state}" no tiene pantalla asignada en SCREEN_BY_STATE`);
  }
  showScreen(screenId);
}

export { showScreen, showScreenForState, SCREEN_BY_STATE };
