// Equivalente modular de go(id) en app.js de HX01 — mismo patrón visual
// (.scr / .scr.on), mismo comportamiento.
//
// Decisión revisada (corrección de fidelidad visual): la primera versión
// de Fase 1 hacía que operationStateMachine.js decidiera qué pantalla
// mostrar (un estado abstracto -> una pantalla). Eso obligó a simplificar
// las pantallas reales de HX01 (que son más granulares: s-plan, s-payment,
// s-qr, s-code son 4 pantallas donde el diseño abstracto solo preveía
// SERVICE_SELECTED y WAITING_PAYMENT). Ahora go() vuelve a ser, como en
// HX01, el mecanismo primario de navegación — operationState sigue
// existiendo y sigue siendo real (ver operationState/operationStateMachine.js
// y sus tests), pero como registro de los checkpoints de la sesión
// (servicio elegido, pago aprobado, puerta abierta, ciclo iniciado/
// terminado), no como el que decide qué pantalla pintar.

function showScreen(screenId) {
  document.querySelectorAll('.scr').forEach((el) => el.classList.remove('on'));
  const target = document.getElementById(screenId);
  if (!target) {
    throw new Error(`[navigation] No existe la pantalla "${screenId}"`);
  }
  target.classList.add('on');
}

export { showScreen };
