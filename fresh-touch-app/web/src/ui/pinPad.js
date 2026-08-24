// Teclado numérico para el PIN de administrador — mismo patrón visual
// que el teclado de PIN de HX01 (dígitos + DEL + OK), reescrito como
// módulo aislado.

function renderPinPad(containerId, { onSubmit }) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  let input = '';
  const displayEl = document.getElementById('pin-display');

  function updateDisplay() {
    if (displayEl) displayEl.textContent = input.padEnd(6, '_');
  }

  function press(key) {
    if (key === 'DEL') {
      input = input.slice(0, -1);
    } else if (key === 'OK') {
      onSubmit(input);
      input = '';
    } else if (input.length < 6) {
      input += key;
    }
    updateDisplay();
  }

  // Mismas clases ya definidas en theme.css (.pin-btn, .del, .can) — no
  // se inventa una clase nueva para el teclado.
  const keys = [
    ['1', ''], ['2', ''], ['3', ''],
    ['4', ''], ['5', ''], ['6', ''],
    ['7', ''], ['8', ''], ['9', ''],
    ['DEL', 'del'], ['0', ''], ['OK', ''],
  ];
  for (const [key, extraClass] of keys) {
    const btn = document.createElement('button');
    btn.textContent = key === 'DEL' ? '⌫' : key;
    btn.className = `pin-btn ${extraClass}`.trim();
    btn.onclick = () => press(key);
    container.appendChild(btn);
  }
  updateDisplay();
}

export { renderPinPad };
