import { loadMachineConfig } from '../src/config/loadMachineConfig.js';
import { createCuboAdapter, CUBO_CURRENCY_ISO4217 } from '../src/cubo/cuboAdapter.js';
import { createPaymentSession, STATES } from '../src/payment/paymentStateMachine.js';
import { requestCycleStart, Esp32NotImplementedError } from '../src/esp32/esp32Interface.js';
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
let session = createPaymentSession();
let adapter = null;
let selectedService = null;

function setStatus(id, text) {
  el(id).textContent = text;
}

function renderPaymentState() {
  setStatus('r-payment', session.getState());
  el('pay-btn').disabled = !(
    session.getState() === STATES.POS_CONNECTED && selectedService
  );
}

function resetResultPanel() {
  ['r-connection', 'r-transaction', 'r-txn-id', 'r-ref-id', 'r-auth-code', 'r-read-type', 'r-timestamp'].forEach(
    (id) => setStatus(id, '—')
  );
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

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function buildAdapter() {
  const mode = currentMode();
  const apiKey = el('api-key-input').value.trim();
  adapter = createCuboAdapter({ mode, machineConfig, apiKey: apiKey || undefined });

  adapter.on('connected', () => {
    setStatus('pos-status', 'Connected');
    setStatus('r-connection', 'CONNECTED');
    session.send('POS_CONNECTED');
    renderPaymentState();
  });

  adapter.on('disconnected', () => {
    setStatus('pos-status', 'Disconnected');
    setStatus('r-connection', 'DISCONNECTED');
  });

  adapter.on('error', (payload) => {
    log(MACHINE_ID, 'Adapter error event', { code: payload?.code });
  });

  adapter.on('transactionResult', (result) => {
    setStatus('r-transaction', result.status);
    setStatus('r-txn-id', result.transactionId || '—');
    setStatus('r-ref-id', result.referenceId || '—');
    setStatus('r-auth-code', result.authorizationCode || '—');
    setStatus('r-read-type', result.readType || '—');
    setStatus('r-timestamp', result.timestamp || '—');

    const eventForResult = {
      SUCCESS: 'SUCCESS',
      DECLINED: 'DECLINED',
      CANCELLED: 'CANCEL',
      ERROR: 'ERROR',
      TIMEOUT: 'TIMEOUT',
    }[result.status];

    if (!eventForResult) {
      log(MACHINE_ID, 'Unrecognized transaction status, refusing to transition', {
        status: result.status,
      });
      return;
    }

    // CARD_DETECTED (WAITING_FOR_CARD -> PROCESSING_PAYMENT) must happen
    // before any terminal event is valid — see cuboCardProvider.js for why.
    if (session.getState() === STATES.WAITING_FOR_CARD) {
      session.send('CARD_DETECTED');
    }
    session.send(eventForResult);
    renderPaymentState();
    handlePaymentOutcome();
  });
}

function handlePaymentOutcome() {
  const state = session.getState();
  if (state !== STATES.PAYMENT_SUCCESS) {
    log(MACHINE_ID, `Payment ended in ${state} — machine cycle will NOT start`);
    return;
  }

  log(MACHINE_ID, 'Payment SUCCESS — transaction reference available');
  try {
    requestCycleStart({ machineId: MACHINE_ID, state, service: selectedService });
  } catch (err) {
    if (err instanceof Esp32NotImplementedError) {
      log(MACHINE_ID, 'ESP32 guard passed (state=PAYMENT_SUCCESS); transport not implemented yet');
    } else {
      log(MACHINE_ID, 'ESP32 guard refused cycle start', { reason: err.message });
    }
  }
}

function selectService(name) {
  selectedService = machineConfig.services[name];
  document.querySelectorAll('.service-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.service === name);
  });
  if (session.getState() === STATES.IDLE) session.send('SELECT_SERVICE');
  if (session.getState() === STATES.SERVICE_SELECTED) session.send('SELECT_CARD_PAYMENT');
  renderPaymentState();
}

async function connectPos() {
  buildAdapter();
  setStatus('pos-status', 'Connecting…');
  session.send('CONNECT_POS');
  renderPaymentState();
  try {
    await adapter.connect();
  } catch (err) {
    log(MACHINE_ID, 'POS connection failed', { reason: err.message });
    session.send('POS_CONNECTION_FAILED');
    setStatus('pos-status', 'Error');
    renderPaymentState();
  }
}

async function testPayment() {
  if (!selectedService) return;
  resetResultPanel();
  session.send('START_PAYMENT');
  renderPaymentState();

  const outcome = el('mock-outcome').value;
  try {
    await adapter.startPayment({
      amount: selectedService.amount * 100,
      currencyCode: CUBO_CURRENCY_ISO4217[machineConfig.currency],
      currencySymbol: 'Q',
      outcome,
    });
  } catch (err) {
    log(MACHINE_ID, 'startPayment threw', { reason: err.message });
  }
}

function resetLab() {
  session = createPaymentSession();
  selectedService = null;
  document.querySelectorAll('.service-btn').forEach((btn) => btn.classList.remove('selected'));
  setStatus('pos-status', 'Disconnected');
  resetResultPanel();
  renderPaymentState();
}

function wireModeToggle() {
  document.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.addEventListener('change', () => {
      const isWebSdk = currentMode() === 'web-sdk';
      el('web-sdk-fields').classList.toggle('hidden', !isWebSdk);
      el('mock-outcome-row').classList.toggle('hidden', isWebSdk);
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

  el('service-basic').addEventListener('click', () => selectService('basic'));
  el('service-premium').addEventListener('click', () => selectService('premium'));
  el('connect-btn').addEventListener('click', connectPos);
  el('pay-btn').addEventListener('click', testPayment);
  el('reset-btn').addEventListener('click', resetLab);

  renderPaymentState();
  log(MACHINE_ID, 'FreshTouch HX02 Cubo lab loaded');
}

init();
