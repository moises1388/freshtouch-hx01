// Punto de entrada de FreshTouch App (Fase 1). Conecta operationState con
// los mocks de payment/esp32/machineConfig/nativeBridge/admin — el ÚNICO
// archivo que conoce a todos los módulos a la vez. Ninguno de los módulos
// que conecta se conoce entre sí directamente (payment/ no importa
// esp32/, ui/ no importa nativeBridge/, etc.) — así se cumple la regla de
// separación real pedida en la autorización de esta fase.

import { STATES, createOperationSession } from './operationState/operationStateMachine.js';
import { createMockPaymentProvider } from './payment/mockPaymentProvider.js';
import { createMockEsp32Controller } from './esp32/mockEsp32Controller.js';
import { createMockNativeBridge } from './nativeBridge/mockNativeBridge.js';
import { createAdminSession } from './admin/adminSession.js';
import { loadMockMachineConfig } from './machineConfig/mockMachineConfig.js';
import { assertValidMachineConfig } from './machineConfig/machineConfigContract.js';
import { showScreen, showScreenForState } from './ui/navigation.js';
import { initBubbles } from './ui/bubbles.js';
import { renderPinPad } from './ui/pinPad.js';
import { attachAdminTapGate } from './ui/adminTapGate.js';

// --- Composición de la app: aquí, y solo aquí, se decide qué implementación usa cada contrato ---
const machineConfig = loadMockMachineConfig();
assertValidMachineConfig(machineConfig);

const operation = createOperationSession();
const payment = createMockPaymentProvider({ simulatedDelayMs: 400 });
const esp32 = createMockEsp32Controller();
const nativeBridge = createMockNativeBridge();
const admin = createAdminSession({ nativeBridge });

let selectedServiceKey = null;
let cycleInterval = null;

function serviceFor(key) {
  return key === 'premium'
    ? { key: 'premium', label: 'Premium', amount: machineConfig.prices.premium }
    : { key: 'basic', label: 'Básico', amount: machineConfig.prices.basic };
}

// --- Reacciona a cada cambio de operationState mostrando la pantalla correspondiente ---
operation.onTransition(({ to }) => {
  showScreenForState(to);
  if (to === STATES.PAYMENT_APPROVED) {
    // Paso automático, sin acción del cliente — ver navigation.js para
    // por qué PAYMENT_APPROVED y READY_TO_START comparten pantalla.
    operation.send('CONFIRM_READY');
  }
  if (to === STATES.CYCLE_RUNNING) {
    runMockCycle();
  }
});

// --- Refleja los eventos del proveedor de pago mock en la pantalla de pago ---
payment.onResult((snapshot) => {
  const el = document.getElementById('payment-status');
  if (!el) return;
  const labels = {
    connecting: 'Conectando (mock)...',
    connected: 'Conectado (mock). Esperando confirmación...',
    payment_started: 'Procesando pago (mock)...',
    payment_approved: 'Pago aprobado (mock).',
    payment_declined: 'Pago rechazado (mock).',
    payment_error: 'Error de pago (mock).',
  };
  el.textContent = labels[snapshot.event] || snapshot.event;
});

function renderServicePrices() {
  document.getElementById('plan-basic-price').textContent = `Q${machineConfig.prices.basic}`;
  document.getElementById('plan-premium-price').textContent = `Q${machineConfig.prices.premium}`;
}

function runMockCycle() {
  const phases = [
    { label: 'Vapor', seconds: 3 },
    { label: 'Secado', seconds: 2 },
  ];
  let phaseIdx = 0;
  let secondsLeft = phases[0].seconds;
  const phaseEl = document.getElementById('cyc-phase');
  const timerEl = document.getElementById('cyc-timer');

  clearInterval(cycleInterval);
  esp32.setRelay('vapor', true);

  cycleInterval = setInterval(() => {
    secondsLeft--;
    if (timerEl) timerEl.textContent = `0:0${Math.max(secondsLeft, 0)}`;
    if (secondsLeft <= 0) {
      phaseIdx++;
      if (phaseIdx >= phases.length) {
        clearInterval(cycleInterval);
        esp32.setRelay('vapor', false);
        esp32.setRelay('secado', false);
        esp32.notifyCycleDone(selectedServiceKey);
        operation.send('CYCLE_DONE');
        return;
      }
      secondsLeft = phases[phaseIdx].seconds;
      if (phaseIdx === 1) {
        esp32.setRelay('vapor', false);
        esp32.setRelay('secado', true);
      }
    }
    if (phaseEl) {
      phaseEl.innerHTML = `${phases[phaseIdx].label} <span class="mock-badge">MOCK — sin ESP32 real</span>`;
    }
  }, 1000);
}

// --- API pública que index.html invoca desde los botones (mismo patrón que HX01: funciones globales referenciadas desde onclick) ---
const FreshTouchApp = {
  selectService(key) {
    selectedServiceKey = key;
    operation.send('SELECT_SERVICE');
  },
  chooseService(key) {
    selectedServiceKey = key;
    payment.selectService(serviceFor(key));
  },
  async requestPayment() {
    operation.send('REQUEST_PAYMENT');
    await payment.connectPos();
    await payment.createPayment({ outcome: 'SUCCESS' }).then(() => {
      if (payment.canStartCycle()) operation.send('PAYMENT_APPROVED');
    });
  },
  async simulatePayment(outcome) {
    await payment.createPayment({ outcome });
    if (outcome === 'SUCCESS' && payment.canStartCycle()) {
      operation.send('PAYMENT_APPROVED');
    } else if (outcome === 'DECLINED') {
      operation.send('PAYMENT_DECLINED');
    } else {
      operation.send('PAYMENT_ERROR');
    }
  },
  cancel() {
    payment.cancelPayment();
    operation.send('CANCEL');
  },
  openDoor() {
    esp32.setRelay('puerta', true);
    operation.send('OPEN_DOOR');
  },
  startCycle() {
    esp32.setRelay('puerta', false);
    const cycleAuth = payment.requestCycle(); // lanza si no hay pago aprobado — es la barrera real, no decorativa
    if (!cycleAuth.authorized) return;
    operation.send('START_CYCLE');
  },
  returnToIdle() {
    operation.send('RETURN_TO_IDLE');
  },

  // --- Admin ---
  openAdminEntry() {
    showScreen('s-admin-pin');
    renderPinPad('pin-pad', {
      onSubmit: async (pin) => {
        const ok = await admin.authenticate(pin);
        if (ok) {
          renderAdminPanel();
          showScreen('s-admin-panel');
        } else {
          showScreen('s-idle');
        }
      },
    });
  },
  closeAdminEntry() {
    showScreen('s-idle');
  },
  logoutAdmin() {
    admin.logout();
    showScreen('s-idle');
  },
  async runDiagnostics() {
    const diag = await nativeBridge.getDiagnostics();
    const rows = document.getElementById('admin-diag-rows');
    rows.innerHTML = Object.entries(diag)
      .filter(([k]) => k !== 'mock')
      .map(([k, v]) => `<div class="admin-panel-row"><span class="k">${k}</span><span class="v diag-mock">${v}</span></div>`)
      .join('');
  },
  exportConfig() {
    // Exporta EXACTAMENTE el objeto de machineConfig, que por contrato
    // (machineConfigContract.js) nunca puede contener un secreto — no hay
    // un paso de "quitar secretos" porque nunca entran aquí en primer
    // lugar.
    const json = JSON.stringify(machineConfig, null, 2);
    console.log('[export mock — Fase 1 no descarga archivos, solo lo muestra en consola]', json);
    alert('Configuración exportada a la consola del navegador (Fase 1, sin descarga de archivo todavía).');
  },
  resetMachine() {
    const confirmation = prompt(`Escribe "${machineConfig.machineId}" para confirmar el reset (mock — no borra nada real todavía):`);
    if (confirmation === machineConfig.machineId) {
      alert('Reset (mock) confirmado. En una implementación real, esto dejaría la instalación en estado UNCONFIGURED.');
    }
  },
};

function renderAdminPanel() {
  const rows = document.getElementById('admin-config-rows');
  rows.innerHTML = Object.entries(machineConfig)
    .map(([k, v]) => `<div class="admin-panel-row"><span class="k">${k}</span><span class="v">${typeof v === 'object' ? JSON.stringify(v) : v}</span></div>`)
    .join('');
}

// --- Arranque ---
initBubbles();
renderServicePrices();
attachAdminTapGate('logo-tap-target', { onTriggered: () => FreshTouchApp.openAdminEntry() });
showScreenForState(operation.getState());

window.FreshTouchApp = FreshTouchApp;
