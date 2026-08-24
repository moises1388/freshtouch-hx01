// Puerta de entrada oculta al modo Admin — mismo patrón ya usado y
// funcionando en HX01 (app.js::admTap()): 3 toques sobre el logo, dentro
// de una ventana de tiempo, abren la pantalla de PIN. No es una medida de
// seguridad fuerte (ver mockAdminAuth.js) — es la barrera contra acceso
// ACCIDENTAL del cliente, que es todo lo que esta capa debe resolver.

function attachAdminTapGate(targetElementId, { onTriggered, requiredTaps = 3, windowMs = 2000 }) {
  const target = document.getElementById(targetElementId);
  if (!target) return;
  let taps = 0;
  let timer = null;

  target.addEventListener('click', () => {
    taps++;
    clearTimeout(timer);
    if (taps >= requiredTaps) {
      taps = 0;
      onTriggered();
      return;
    }
    timer = setTimeout(() => { taps = 0; }, windowMs);
  });
}

export { attachAdminTapGate };
