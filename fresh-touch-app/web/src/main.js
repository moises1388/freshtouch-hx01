// Punto de entrada de FreshTouch App (Fase 1, corrección de fidelidad
// visual). Reproduce el comportamiento real de app.js de HX01 —mismos
// nombres de función globales invocados desde el marcado portado
// (go, selectPlan, openQR, sessAction, pinTap, etc.)— pero implementado
// sobre la arquitectura modular: cada función que en HX01 tocaba
// hardware/Cubo/Make reales aquí llama a un mock explícito
// (payment/esp32/nativeBridge), nunca a una integración real.
//
// operationState sigue siendo real y se sigue probando por separado
// (operationState/operationStateMachine.test.js) — aquí se usa como
// registro de los checkpoints de la sesión (servicio elegido, pago
// aprobado, puerta abierta, ciclo iniciado/terminado), no como el que
// decide qué pantalla mostrar (ver navigation.js para el porqué de ese
// cambio).

import { createOperationSession } from './operationState/operationStateMachine.js';
import { createMockPaymentProvider } from './payment/mockPaymentProvider.js';
import { createMockEsp32Controller } from './esp32/mockEsp32Controller.js';
import { createMockNativeBridge } from './nativeBridge/mockNativeBridge.js';
import { createAdminSession } from './admin/adminSession.js';
import { loadMockMachineConfig } from './machineConfig/mockMachineConfig.js';
import { assertValidMachineConfig } from './machineConfig/machineConfigContract.js';
import { showScreen } from './ui/navigation.js';
import { initBubbles } from './ui/bubbles.js';
import { t, getLang, setLang, applyLang } from './ui/i18n.js';

// --- Composición de la app ---
const machineConfig = loadMockMachineConfig();
assertValidMachineConfig(machineConfig);

const operation = createOperationSession();
const payment = createMockPaymentProvider({ simulatedDelayMs: 0 });
const esp32 = createMockEsp32Controller();
const nativeBridge = createMockNativeBridge();
const admin = createAdminSession({ nativeBridge });

// --- Estado local de la sesión de UI — mismas variables que STATE en app.js de HX01 ---
const STATE = {
  plan: null,
  sessStep: 1,
  codeType: null,
  codeInput: '',
  pinInput: '',
  admTaps: 0,
  admTimer: null,
  role: null,
  doorOpen: false,
};

let toastTmr = null;
let qrTimerInterval = null;
let qrTimerSecs = 180;
let qrPollTO = null;
let cycTimer = null;
let extraTimer = null;
let doneTimer = null;
let cyPhIdx = 0;
let cySecs = 0;
let cyDur = 0;
let cyCurPh = null;

function currentPrice() {
  return STATE.plan === 'basic' ? machineConfig.prices.basic : machineConfig.prices.premium;
}

// Fases del ciclo — misma estructura de 3 fases que HX01 (Vapor/Secado/
// Aroma), duraciones acortadas a propósito para Fase 1 (demostrar el
// flujo sin esperar minutos reales) — Fase 3 (ESP32 real) las hará
// depender de la confirmación real del hardware, no de un temporizador
// local fijo.
const CYCLES = {
  basic: [
    { nm: 'cyc_v', ico: '🌫️', lbl: 'p1b', dur: 3, comp: 'vapor' },
    { nm: 'cyc_d', ico: '💨', lbl: 'p2b', dur: 2, comp: 'secado' },
    { nm: 'cyc_a', ico: '🌸', lbl: 'p3b', dur: 2, comp: null },
  ],
  premium: [
    { nm: 'cyc_v', ico: '🌫️', lbl: 'p1p', dur: 4, comp: 'vapor' },
    { nm: 'cyc_d', ico: '💨', lbl: 'p2p', dur: 3, comp: 'secado' },
    { nm: 'cyc_a', ico: '🌸', lbl: 'p3p', dur: 2, comp: null },
  ],
};

// --- toast — mismo comportamiento que app.js de HX01 (línea 965) ---
function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast on ${type || 'in'}`;
  clearTimeout(toastTmr);
  toastTmr = setTimeout(() => el.classList.remove('on'), 3000);
}

// --- Navegación ---
function go(id) {
  if (id === 's-idle') {
    clearInterval(cycTimer);
    clearInterval(extraTimer);
    clearInterval(doneTimer);
    clearInterval(qrTimerInterval);
    clearTimeout(qrPollTO);
  }
  showScreen(id);
}

// --- Idioma ---
function toggleLang() {
  setLang(getLang() === 'es' ? 'en' : 'es');
  applyLang(machineConfig.prices);
  if (STATE.role) renderAdminBody();
}

// --- Admin: entrada oculta (mismo patrón que admTap() de HX01) ---
function admTap() {
  STATE.admTaps++;
  clearTimeout(STATE.admTimer);
  if (STATE.admTaps >= 3) {
    STATE.admTaps = 0;
    openPIN();
  } else {
    STATE.admTimer = setTimeout(() => { STATE.admTaps = 0; }, 1500);
  }
}

function openPIN() {
  STATE.pinInput = '';
  updatePinDots();
  document.getElementById('pin-err').textContent = '';
  document.getElementById('pin-ov').classList.add('on');
}

function closePIN() {
  document.getElementById('pin-ov').classList.remove('on');
  STATE.pinInput = '';
}

function pinTap(k) {
  if (k === 'DEL') STATE.pinInput = STATE.pinInput.slice(0, -1);
  else if (STATE.pinInput.length < 6) STATE.pinInput += k;
  updatePinDots();
}

function updatePinDots() {
  document.querySelectorAll('.pin-dot').forEach((d, i) => d.classList.toggle('on', i < STATE.pinInput.length));
}

async function checkPIN() {
  const ok = await admin.authenticate(STATE.pinInput);
  if (ok) {
    STATE.role = 'sa'; // Fase 1: un único PIN mock = super_admin. Fase 6 diferenciará roles vía nativeBridge/Keystore real.
    closePIN();
    renderAdminBody();
    go('s-admin');
  } else {
    document.getElementById('pin-err').textContent = 'PIN incorrecto';
    setTimeout(() => {
      STATE.pinInput = '';
      updatePinDots();
      document.getElementById('pin-err').textContent = '';
    }, 900);
  }
}

function exitAdmin() {
  admin.logout();
  STATE.role = null;
  go('s-idle');
}

async function renderAdminBody() {
  const diag = await nativeBridge.getDiagnostics();
  const body = document.getElementById('adm-body');
  const configRows = Object.entries(machineConfig)
    .map(([k, v]) => `<div class="admin-panel-row"><span class="k">${k}</span><span class="v">${typeof v === 'object' ? JSON.stringify(v) : v}</span></div>`)
    .join('');
  const diagRows = Object.entries(diag)
    .filter(([k]) => k !== 'mock')
    .map(([k, v]) => `<div class="admin-panel-row"><span class="k">${k}</span><span class="v diag-mock">${v}</span></div>`)
    .join('');
  body.innerHTML = `
    <div class="admin-panel-section"><h3>Identidad de máquina</h3>${configRows}</div>
    <div class="admin-panel-section"><h3>Diagnóstico</h3>${diagRows}</div>
    <div class="admin-panel-section"><h3>Exportar / Reset</h3>
      <button onclick="window.__ftaExportConfig()">Exportar configuración (sin secretos)</button>
      <button onclick="window.__ftaResetMachine()">Reset de máquina (mock)</button>
    </div>`;
}

function exportConfig() {
  const json = JSON.stringify(machineConfig, null, 2);
  console.log('[export mock — Fase 1 no descarga archivos, solo lo muestra en consola]', json);
  alert('Configuración exportada a la consola del navegador (Fase 1, sin descarga de archivo todavía).');
}

function resetMachine() {
  const confirmation = prompt(`Escribe "${machineConfig.machineId}" para confirmar el reset (mock — no borra nada real todavía):`);
  if (confirmation === machineConfig.machineId) {
    alert('Reset (mock) confirmado. En una implementación real, esto dejaría la instalación en estado UNCONFIGURED.');
  }
}

// --- Plan / selección de servicio ---
function selectPlan(plan) {
  STATE.plan = plan;
  operation.send('SELECT_SERVICE');
  const price = currentPrice();
  const label = plan === 'basic' ? t().basic_name : t().premium_name;
  document.getElementById('pay-plan-lbl').textContent = `${label} — Q${price}`;
  document.getElementById('qr-amt-lbl').textContent = `Q${price}.00`;
  document.getElementById('qr-amt-big').textContent = `Q${price}.00`;
  go('s-payment');
}

// --- QR (mock — sin Cubo real) ---
function openQR() {
  const price = currentPrice();
  document.getElementById('qr-amt-lbl').textContent = `Q${price}.00`;
  document.getElementById('qr-amt-big').textContent = `Q${price}.00`;
  document.getElementById('qr-img').src =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><rect width="220" height="220" fill="%23f0f0f0" rx="12"/><text x="110" y="115" text-anchor="middle" font-size="14" fill="%23888">MOCK — sin Cubo real</text></svg>';
  go('s-qr');
  startQRTimer();
  operation.send('REQUEST_PAYMENT');
  payment.selectService({ label: STATE.plan, amount: price });
}

function startQRTimer() {
  clearInterval(qrTimerInterval);
  qrTimerSecs = 180;
  updateQRTimer();
  qrTimerInterval = setInterval(() => {
    qrTimerSecs--;
    updateQRTimer();
    if (qrTimerSecs <= 0) {
      stopQR();
      toast(t().tk.qr_exp, 'er');
      go('s-payment');
    }
  }, 1000);
}

function updateQRTimer() {
  const m = Math.floor(qrTimerSecs / 60), s = qrTimerSecs % 60;
  document.getElementById('qr-timer').textContent = `⏱ ${m}:${s < 10 ? '0' : ''}${s}`;
}

function stopQR() {
  clearInterval(qrTimerInterval);
  clearTimeout(qrPollTO);
}

function cancelQR() {
  stopQR();
  operation.send('CANCEL');
  go('s-payment');
}

async function qrManualConfirm() {
  stopQR();
  await payment.connectPos();
  await payment.createPayment({ outcome: 'SUCCESS' });
  toast(t().tk.qr_ok, 'ok');
  if (payment.canStartCycle()) operation.send('PAYMENT_APPROVED');
  setTimeout(activateSess, 400);
}

// --- Código de caja / promoción (mock) ---
function openCode(type) {
  STATE.codeType = type;
  STATE.codeInput = '';
  document.getElementById('code-disp').textContent = '_';
  const l = t();
  const cash = type === 'cash';
  document.getElementById('code-hdr-t').textContent = cash ? l.code_cash_t : l.code_pro_t;
  document.getElementById('code-hdr-s').textContent = cash ? l.code_cash_s : l.code_pro_s;
  document.getElementById('code-ico').textContent = cash ? '💵' : '🎁';
  document.getElementById('code-ttl').textContent = cash ? l.code_cash_t : l.code_pro_t;
  document.getElementById('code-sub').innerHTML = (cash ? l.code_cash_s : l.code_pro_s) + ' <span class="mock-badge">MOCK</span>';
  go('s-code');
}

function kp(key) {
  if (key === 'DEL') STATE.codeInput = STATE.codeInput.slice(0, -1);
  else if (key === 'OK') { validateCodeMock(); return; }
  else if (STATE.codeInput.length < 12) STATE.codeInput += key;
  document.getElementById('code-disp').textContent = STATE.codeInput || '_';
}

async function validateCodeMock() {
  // MOCK: cualquier código no vacío se acepta — Fase 1 no tiene un
  // Data Store real de códigos que validar (eso es Fase 2+).
  if (STATE.codeInput.length === 0) {
    toast(t().tk.code_bad, 'er');
    return;
  }
  toast(t().tk.code_ok, 'ok');
  operation.send('REQUEST_PAYMENT');
  await payment.selectService({ label: STATE.plan, amount: currentPrice() });
  await payment.connectPos();
  await payment.createPayment({ outcome: 'SUCCESS' });
  if (payment.canStartCycle()) operation.send('PAYMENT_APPROVED');
  setTimeout(activateSess, 400);
}

// --- Sesión (abrir puerta / iniciar) ---
function activateSess() {
  STATE.sessStep = 1;
  STATE.doorOpen = false;
  const plan = STATE.plan === 'basic' ? t().basic_name : t().premium_name;
  document.getElementById('sess-plan-hdr').textContent = `${plan} Q${currentPrice()}`;
  updateSessUI();
  go('s-session');
}

function updateSessUI() {
  const l = t();
  ['ss1', 'ss2', 'ss3'].forEach((id, i) => document.getElementById(id).classList.toggle('on', i < STATE.sessStep));
  const btn = document.getElementById('sess-btn');
  if (STATE.sessStep === 1) {
    document.getElementById('sess-anim').textContent = '🚪';
    document.getElementById('sess-inst').textContent = l.sess_open_i;
    document.getElementById('sess-sub').textContent = l.sess_open_s;
    btn.textContent = l.btn_open;
    btn.className = 'btn-act blue';
  } else {
    document.getElementById('sess-anim').innerHTML = '<img src="assets/img/img02.png" style="height:64px;object-fit:contain;">';
    document.getElementById('sess-inst').textContent = l.sess_start_i;
    document.getElementById('sess-sub').textContent = l.sess_start_s;
    btn.textContent = l.btn_start;
    btn.className = 'btn-act green';
  }
}

function setDoor(open) {
  STATE.doorOpen = open;
  esp32.setRelay('puerta', open);
  toast(open ? t().tk.door_opened : t().tk.door_closed, open ? 'in' : 'ok');
}

function sessAction() {
  if (STATE.sessStep === 1) {
    setDoor(true);
    operation.send('OPEN_DOOR');
    STATE.sessStep = 2;
    updateSessUI();
  } else {
    startCycle();
  }
}

// --- Ciclo ---
function startCycle() {
  operation.send('START_CYCLE');
  cyPhIdx = 0;
  document.getElementById('cyc-mid').textContent = machineConfig.machineId;
  go('s-cycle');
  runPhase();
}

function runPhase() {
  const phases = CYCLES[STATE.plan];
  if (cyPhIdx >= phases.length) { cycleDone(); return; }
  cyCurPh = phases[cyPhIdx];
  cyDur = cyCurPh.dur;
  cySecs = cyCurPh.dur;
  const l = t();
  document.getElementById('cyc-ico').textContent = cyCurPh.ico;
  document.getElementById('cyc-ph-nm').textContent = l[cyCurPh.nm];
  document.getElementById('cyc-ph-lbl').textContent = l[cyCurPh.lbl];
  ['cp0', 'cp1', 'cp2'].forEach((id, i) => {
    document.getElementById(id).className = `cph${i < cyPhIdx ? ' done' : i === cyCurPh.ph ? ' cur' : i === cyPhIdx ? ' cur' : ''}`;
  });
  if (cyCurPh.comp) esp32.setRelay(cyCurPh.comp, true);
  updateCycTimer();
  clearInterval(cycTimer);
  cycTimer = setInterval(() => {
    cySecs--;
    updateCycTimer();
    if (cySecs <= 0) {
      clearInterval(cycTimer);
      if (cyCurPh.comp) esp32.setRelay(cyCurPh.comp, false);
      cyPhIdx++;
      setTimeout(runPhase, 200);
    }
  }, 1000);
}

function updateCycTimer() {
  const m = Math.floor(cySecs / 60), s = cySecs % 60;
  document.getElementById('cyc-timer').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
  document.getElementById('cyc-prog').style.width = `${((cyDur - cySecs) / cyDur) * 100}%`;
}

function cycleDone() {
  esp32.notifyCycleDone(STATE.plan);
  operation.send('CYCLE_DONE');
  go('s-done');
  document.getElementById('btn-extra').style.display = 'block';
  document.getElementById('extra-run').style.display = 'none';
  startDoneTimer();
}

function startExtraDry() {
  document.getElementById('btn-extra').style.display = 'none';
  document.getElementById('extra-run').style.display = 'block';
  esp32.setRelay('secado', true);
  let s = 5; // acortado para Fase 1 — HX01 real usa 60s
  clearInterval(extraTimer);
  extraTimer = setInterval(() => {
    s--;
    document.getElementById('extra-timer').textContent = `0:0${Math.max(s, 0)}`;
    if (s <= 0) {
      clearInterval(extraTimer);
      esp32.setRelay('secado', false);
      document.getElementById('extra-run').textContent = '✅ Listo';
    }
  }, 1000);
}

function startDoneTimer() {
  clearInterval(doneTimer);
  let s = 30;
  doneTimer = setInterval(() => {
    s--;
    const el = document.getElementById('done-auto-n');
    if (el) el.textContent = s;
    if (s <= 0) {
      clearInterval(doneTimer);
      finishSess();
    }
  }, 1000);
}

function finishSess() {
  clearInterval(doneTimer);
  clearInterval(extraTimer);
  clearInterval(cycTimer);
  operation.send('RETURN_TO_IDLE');
  go('s-idle');
}

// --- Factura (mock) ---
function submitInvoice() {
  const name = document.getElementById('inv-name').value.trim();
  const email = document.getElementById('inv-email').value.trim();
  if (!name || !email) { toast(t().tk.inv_f, 'er'); return; }
  toast('🧾 Factura enviada (mock, sin INFILE real)', 'ok');
  setTimeout(() => go('s-done'), 1200);
}

function closeEmg() {
  document.getElementById('emg-modal').classList.remove('on');
}

// --- Arranque ---
initBubbles();
applyLang(machineConfig.prices);

window.go = go;
window.toggleLang = toggleLang;
window.admTap = admTap;
window.closePIN = closePIN;
window.pinTap = pinTap;
window.checkPIN = checkPIN;
window.exitAdmin = exitAdmin;
window.selectPlan = selectPlan;
window.openQR = openQR;
window.cancelQR = cancelQR;
window.qrManualConfirm = qrManualConfirm;
window.openCode = openCode;
window.kp = kp;
window.sessAction = sessAction;
window.startExtraDry = startExtraDry;
window.finishSess = finishSess;
window.submitInvoice = submitInvoice;
window.closeEmg = closeEmg;
window.__ftaExportConfig = exportConfig;
window.__ftaResetMachine = resetMachine;
