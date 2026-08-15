// Simulated Cubo QPOS Cute adapter.
//
// This lab environment has no physical tablet, no Bluetooth, and no real
// Cubo credentials, so real-hardware testing cannot happen from here. This
// mock lets the rest of the stack (state machine, UI, ESP32 guard, logging)
// be built and tested end-to-end today. It mirrors the event contract
// documented in CUBO-INTEGRATION.md: 'connected', 'disconnected',
// 'transactionResult', 'error' — the same shape the lab brief specified,
// clearly flagged there as needing reconciliation against the live docs
// before any real-device test.

import { log } from '../logger.js';

export function createMockCuboAdapter({ machineConfig, simulatedLatencyMs = 900 }) {
  const listeners = new Map();
  let connected = false;

  function emit(event, payload) {
    for (const handler of listeners.get(event) || []) handler(payload);
  }

  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(handler);
    return () => {
      listeners.set(event, (listeners.get(event) || []).filter((h) => h !== handler));
    };
  }

  async function connect() {
    log(machineConfig.machineId, 'POS connecting (simulated)');
    await delay(simulatedLatencyMs);
    connected = true;
    log(machineConfig.machineId, 'POS connected (simulated)');
    emit('connected', { simulated: true, posId: machineConfig.cuboPosId });
  }

  async function disconnect() {
    connected = false;
    log(machineConfig.machineId, 'POS disconnected (simulated)');
    emit('disconnected', { simulated: true });
  }

  /**
   * @param {{amount:number, currencyCode:string, currencySymbol:string, outcome?:'SUCCESS'|'DECLINED'|'CANCELLED'|'ERROR'|'TIMEOUT'}} params
   *   `outcome` is a lab-only override to exercise every result path; the
   *   real SDK obviously has no such parameter.
   */
  async function startPayment({ amount, currencyCode, currencySymbol, outcome = 'SUCCESS' }) {
    if (!connected) {
      throw new Error('startPayment called while POS is not connected (simulated)');
    }

    log(machineConfig.machineId, 'Payment started (simulated)', {
      amount,
      currency: currencySymbol,
    });

    await delay(simulatedLatencyMs);
    log(machineConfig.machineId, 'Waiting for card (simulated)');

    if (outcome === 'CANCELLED') {
      emit('transactionResult', { status: 'CANCELLED', timestamp: nowIso() });
      return;
    }
    if (outcome === 'TIMEOUT') {
      emit('transactionResult', { status: 'TIMEOUT', timestamp: nowIso() });
      return;
    }

    await delay(simulatedLatencyMs);
    const readType = outcome === 'ERROR' ? undefined : 'NFC';
    if (readType) log(machineConfig.machineId, 'Card detected (simulated)', { readType });

    log(machineConfig.machineId, 'Processing (simulated)');
    await delay(simulatedLatencyMs);

    if (outcome === 'ERROR') {
      emit('error', { code: 'MOCK_READ_ERROR', message: 'Simulated read error' });
      emit('transactionResult', { status: 'ERROR', timestamp: nowIso() });
      return;
    }

    if (outcome === 'DECLINED') {
      emit('transactionResult', { status: 'DECLINED', readType, timestamp: nowIso() });
      return;
    }

    log(machineConfig.machineId, 'Payment SUCCESS (simulated)');
    emit('transactionResult', {
      status: 'SUCCESS',
      readType,
      transactionId: `MOCK-TXN-${Date.now()}`,
      referenceId: `MOCK-REF-${Date.now()}`,
      authorizationCode: `${Math.floor(100000 + Math.random() * 900000)}`,
      amount,
      currencySymbol,
      timestamp: nowIso(),
    });
  }

  return { connect, disconnect, startPayment, on, isConnected: () => connected };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}
