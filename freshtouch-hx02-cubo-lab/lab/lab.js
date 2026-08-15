// FreshTouch HX02 lab screen — wired to PaymentProvider only.
//
// This file no longer talks to src/cubo/cuboAdapter.js or
// src/payment/paymentStateMachine.js directly. It goes through
// src/payment/paymentProvider.js -> createCuboCardProvider(), the same
// abstraction documented in
// .claude/skills/hydrox-payment-architecture/SKILL.md, so this screen
// demonstrates the real architecture, not a shortcut around it.
//
// Scope of this pass, per explicit instruction: mock mode only, no Make,
// no QR, no real API key, no ESP32 transport. The "Real Cubo Web SDK"
// radio option still routes through the same provider (mode:'web-sdk'),
// unchanged from before — selecting it without the official SDK <script>
// tag in place simply fails at connectPos() with a clear error, same as
// it always has.

import { loadMachineConfig } from '../src/config/loadMachineConfig.js';
import { createPaymentProvider, STATES, canStartCycle, isTerminal } from '../src/payment/paymentProvider.js';
import { Esp32NotImplementedError } from '../src/payment/cuboCardProvider.js';
import { CUBO_EVENTS } from '../src/cubo/cuboEvents.js';
import { log } from '../src/logger.js';

const MACHINE_ID = 'HX02';

const el = (id) => document.getElementById(id);
const logOutput = el('log-output');

function appendLog(line) {
  logOutput.textContent += `${line}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

// Patch console.log so every safe log line also lands in the on-screen panel.
const nativeConsoleLog = console.log.bind(console);
console.log = (...args) => {
  nativeConsoleLog(...args);
  appendLog(args.map(String).join(' '));
};

let machineConfig = null;
let provider = null;
let selectedServiceName = null;

function setStatus(id, text) {
  el(id).textContent = text;
}

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function currentMockOutcome() {
  return el('mock-outcome').value;
}

function resetResultPanel() {
  ['r-transaction', 'r-txn-id', 'r-ref-id', 'r-auth-code', 'r-read-type', 'r-timestamp'].forEach((id) =>
    setStatus(id, '—')
  );
}

function renderButtons() {
  const state = provider ? provider.getStatus() : STATES.IDLE;
  el('pay-btn').disabled = state !== STATES.POS_CONNECTED;
}

// This is the one place that decides, on screen, whether the payment that
// just happened may authorize a cycle. It mirrors canStartCycle() exactly
// — PAYMENT_SUCCESS and nothing else — and only ever reaches the
// not-implemented ESP32 stub, never a real transport.
function updateCycleAuthorization() {
  if (!provider) return;
  const state = provider.getStatus();
  const authorized = provider.canStartCycle();
  setStatus('r-cycle-auth', authorized ? 'AUTHORIZED' : 'NOT AUTHORIZED');

  if (authorized) {
    log(MACHINE_ID, 'PAYMENT_SUCCESS — cycle authorization available');
    try {
      provider.requestCycle();
    } catch (err) {
      if (err instanceof Esp32NotImplementedError) {
        log(MACHINE_ID, 'ESP32 guard passed (state=PAYMENT_SUCCESS); transport not implemented yet');
      } else {
        log(MACHINE_ID, 'ESP32 guard refused cycle start', { reason: err.message });
      }
    }
  } else if (isTerminal(state)) {
    log(MACHINE_ID, `Payment ended in ${state} — machine cycle will NOT start`);
  }
}

function handleProviderEvent(snapshot) {
  setStatus('r-payment', snapshot.state);

  switch (snapshot.event) {
    case 'connecting':
      setStatus('pos-status', 'Connecting…');
      break;
    case CUBO_EVENTS.CONNECTED:
      setStatus('pos-status', 'Connected');
      setStatus('r-connection', 'CONNECTED');
      break;
    case 'connect_failed':
      setStatus('pos-status', 'Error');
      log(MACHINE_ID, 'POS connection failed', { reason: snapshot.reason });
      break;
    case CUBO_EVENTS.DISCONNECTED:
      setStatus('pos-status', 'Disconnected');
      setStatus('r-connection', 'DISCONNECTED');
      break;
    case CUBO_EVENTS.ERROR:
      log(MACHINE_ID, 'Adapter error event', { code: snapshot.code });
      break;
    case 'payment_started':
      resetResultPanel();
      setStatus('r-transaction', 'WAITING_FOR_CARD');
      break;
    case 'card_detected':
      setStatus('r-transaction', 'PROCESSING_PAYMENT');
      break;
    case CUBO_EVENTS.TRANSACTION_RESULT: {
      const result = snapshot.result;
      setStatus('r-transaction', result.status);
      setStatus('r-txn-id', result.transactionId || '—');
      setStatus('r-ref-id', result.referenceId || '—');
      setStatus('r-auth-code', result.authorizationCode || '—');
      setStatus('r-read-type', result.readType || '—');
      setStatus('r-timestamp', result.timestamp || '—');
      break;
    }
    default:
      break;
  }

  updateCycleAuthorization();
  renderButtons();
}

function buildProvider() {
  const mode = currentMode();
  const apiKey = el('api-key-input').value.trim();
  provider = createPaymentProvider({ type: 'card', mode, machineConfig, apiKey: apiKey || undefined });
  provider.onResult(handleProviderEvent);
}

function resetLab() {
  buildProvider();
  selectedServiceName = null;
  document.querySelectorAll('.service-btn').forEach((btn) => btn.classList.remove('selected'));
  setStatus('pos-status', 'Disconnected');
  setStatus('r-connection', '—');
  setStatus('r-payment', STATES.IDLE);
  setStatus('r-cycle-auth', 'NOT AUTHORIZED');
  resetResultPanel();
  renderButtons();
}

function selectService(name) {
  selectedServiceName = name;
  const service = machineConfig.services[name];
  document.querySelectorAll('.service-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.service === name);
  });
  // Re-callable safely: selectService() only transitions from IDLE/
  // SERVICE_SELECTED, so re-selecting (e.g. to refresh the mock outcome
  // right before paying) just updates which service/outcome is pending.
  provider.selectService({ ...service, mockOutcome: currentMockOutcome() });
  renderButtons();
}

async function connectPos() {
  if (!selectedServiceName) {
    log(MACHINE_ID, 'Select a service before connecting the POS');
    return;
  }
  try {
    await provider.connectPos();
  } catch (err) {
    log(MACHINE_ID, 'connectPos() threw', { reason: err.message });
  }
}

async function disconnectPos() {
  try {
    await provider.disconnectPos();
  } catch (err) {
    log(MACHINE_ID, 'disconnectPos() threw', { reason: err.message });
  }
}

async function testPayment() {
  if (!selectedServiceName) return;
  // Refresh the service with whatever mock outcome is currently selected
  // in the dropdown, in case it changed since selectService() last ran.
  selectService(selectedServiceName);
  try {
    await provider.createPayment();
  } catch (err) {
    log(MACHINE_ID, 'createPayment() threw', { reason: err.message });
  }
}

async function checkBluetoothAvailability() {
  try {
    if (navigator.bluetooth?.getAvailability) {
      const available = await navigator.bluetooth.getAvailability();
      setStatus('bluetooth-status', available ? 'ON' : 'OFF');
      return;
    }
    setStatus('bluetooth-status', 'Unsupported browser');
  } catch {
    setStatus('bluetooth-status', 'Unknown');
  }
}

function wireModeToggle() {
  document.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.addEventListener('change', () => {
      const isWebSdk = currentMode() === 'web-sdk';
      el('web-sdk-fields').classList.toggle('hidden', !isWebSdk);
      el('mock-outcome-row').classList.toggle('hidden', isWebSdk);
      // Mode is fixed at provider-creation time — switching modes mid-flow
      // means starting a fresh provider/session, same as RESET.
      resetLab();
    });
  });
}

async function init() {
  setStatus('machine-value', MACHINE_ID);
  checkBluetoothAvailability();
  wireModeToggle();

  try {
    machineConfig = await loadMachineConfig(MACHINE_ID);
    setStatus('environment-value', (machineConfig.cuboEnvironment || 'sandbox').toUpperCase());
    el('service-basic').textContent = `${machineConfig.services.basic.label} Q${machineConfig.services.basic.amount}`;
    el('service-premium').textContent = `${machineConfig.services.premium.label} Q${machineConfig.services.premium.amount}`;
  } catch (err) {
    log(MACHINE_ID, 'Failed to load machine config', { reason: err.message });
    return;
  }

  buildProvider();

  el('service-basic').addEventListener('click', () => selectService('basic'));
  el('service-premium').addEventListener('click', () => selectService('premium'));
  el('connect-btn').addEventListener('click', connectPos);
  el('disconnect-btn').addEventListener('click', disconnectPos);
  el('pay-btn').addEventListener('click', testPayment);
  el('reset-btn').addEventListener('click', resetLab);

  renderButtons();
  log(MACHINE_ID, 'FreshTouch HX02 Cubo lab loaded (PaymentProvider mode)');
}

init();
