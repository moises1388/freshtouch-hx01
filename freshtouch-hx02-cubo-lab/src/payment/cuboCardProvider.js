// CuboCardProvider — the PaymentProvider implementation for card payments
// via Cubo QPOS Cute (Web SDK). See paymentProvider.js for the shared
// contract this implements.
//
// This wraps three modules that already exist and are already tested on
// their own, WITHOUT modifying any of them:
//   - src/cubo/cuboAdapter.js             (mock or real Cubo Web SDK)
//   - src/payment/paymentStateMachine.js  (the safety-critical state machine)
//   - src/esp32/esp32Interface.js         (the PAYMENT_SUCCESS-only guard)
//
// What this file adds is purely the *wiring* between them — translating
// Cubo adapter events into state-machine transitions — which previously
// lived inline in lab/lab.js. Moving it here means the same wiring can be
// unit-tested directly (tests/cuboCardProvider.test.js) instead of only
// through the browser UI, and reused if another screen or machine needs
// the same card flow. lab/lab.js is untouched for now — wiring it to this
// provider is a follow-up, not done speculatively in this pass.

import { createCuboAdapter, CUBO_CURRENCY_ISO4217, CUBO_EVENTS } from '../cubo/cuboAdapter.js';
import { createPaymentSession, STATES, canStartCycle } from './paymentStateMachine.js';
import { requestCycleStart, Esp32NotImplementedError } from '../esp32/esp32Interface.js';
import { log } from '../logger.js';

// transactionResult.status -> state machine event. Deliberately partial:
// a status with no entry here does NOT transition the session at all, so
// it can never be mistaken for success. This is the same fail-closed
// choice already used in lab/lab.js, now shared in one place. The exact
// set of statuses the real transactionResult can carry is still
// UNVERIFIED (see CUBO-INTEGRATION.md) — hitting an unmapped value here is
// expected with the real SDK, not just a test artifact.
const RESULT_STATUS_TO_EVENT = Object.freeze({
  SUCCESS: 'SUCCESS',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCEL',
  ERROR: 'ERROR',
  TIMEOUT: 'TIMEOUT',
});

/**
 * @param {{mode: 'mock'|'web-sdk', machineConfig: object, apiKey?: string}} params
 */
export function createCuboCardProvider({ mode, machineConfig, apiKey }) {
  const adapter = createCuboAdapter({ mode, machineConfig, apiKey });
  const session = createPaymentSession();
  const resultHandlers = new Set();
  let currentService = null;

  function notify(extra) {
    const snapshot = { providerType: 'card', state: session.getState(), ...extra };
    for (const handler of resultHandlers) handler(snapshot);
  }

  adapter.on(CUBO_EVENTS.CONNECTED, () => {
    if (session.getState() === STATES.CONNECTING_POS) session.send('POS_CONNECTED');
    notify({ event: CUBO_EVENTS.CONNECTED });
  });

  adapter.on(CUBO_EVENTS.DISCONNECTED, () => {
    const state = session.getState();
    if (state === STATES.POS_CONNECTED) session.send('POS_DISCONNECTED');
    else if (state === STATES.WAITING_FOR_CARD || state === STATES.PROCESSING_PAYMENT) session.send('ERROR');
    // IDLE / CONNECTING_POS / already-terminal: nothing valid to transition
    // to from here — just notify, don't force a transition.
    notify({ event: CUBO_EVENTS.DISCONNECTED });
  });

  adapter.on(CUBO_EVENTS.ERROR, (payload) => {
    log(machineConfig.machineId, 'CuboCardProvider: adapter error event', { code: payload?.code });
    notify({ event: CUBO_EVENTS.ERROR, code: payload?.code });
  });

  adapter.on(CUBO_EVENTS.TRANSACTION_RESULT, (result) => {
    const stateEvent = RESULT_STATUS_TO_EVENT[result.status];
    if (!stateEvent) {
      log(machineConfig.machineId, 'CuboCardProvider: unmapped transactionResult.status, not transitioning', {
        status: result.status,
      });
      notify({ event: CUBO_EVENTS.TRANSACTION_RESULT, result, transitioned: false });
      return;
    }
    // The state machine requires CARD_DETECTED (WAITING_FOR_CARD ->
    // PROCESSING_PAYMENT) before any terminal event is valid. Whether the
    // real SDK signals "card read" as a separate moment before
    // transactionResult is UNVERIFIED (see CUBO-INTEGRATION.md) — but
    // receiving ANY transactionResult is itself proof a card was read, so
    // treat that as the CARD_DETECTED moment rather than skip straight to
    // the outcome.
    if (session.getState() === STATES.WAITING_FOR_CARD) {
      session.send('CARD_DETECTED');
      notify({ event: 'card_detected' });
    }
    session.send(stateEvent);
    notify({ event: CUBO_EVENTS.TRANSACTION_RESULT, result, transitioned: true });
  });

  // The state machine requires SELECT_SERVICE -> SELECT_CARD_PAYMENT before
  // CONNECT_POS is valid (see paymentStateMachine.js) — the same order
  // lab.js already drives through its UI. A card payment can't skip
  // straight from "provider created" to "connect POS" without this step.
  function selectService(service) {
    currentService = service;
    if (session.getState() === STATES.IDLE) session.send('SELECT_SERVICE');
    if (session.getState() === STATES.SERVICE_SELECTED) session.send('SELECT_CARD_PAYMENT');
    notify({ event: 'service_selected', service: service?.label });
  }

  async function connectPos() {
    if (session.getState() !== STATES.PAYMENT_METHOD_SELECTED) {
      throw new Error(
        `connectPos() called from state "${session.getState()}"; selectService() must succeed first.`
      );
    }
    session.send('CONNECT_POS');
    notify({ event: 'connecting' });
    try {
      await adapter.connect();
    } catch (err) {
      session.send('POS_CONNECTION_FAILED');
      notify({ event: 'connect_failed', reason: err.message });
      throw err;
    }
  }

  function disconnectPos() {
    return adapter.disconnect();
  }

  // Service was already fixed by selectService() — startPayment() only
  // needs the mock-only outcome override at test time, everything else
  // comes from the config/service chosen earlier.
  async function createPayment() {
    if (session.getState() !== STATES.POS_CONNECTED) {
      throw new Error(
        `createPayment() called from state "${session.getState()}"; connectPos() must succeed first.`
      );
    }
    if (!currentService) {
      throw new Error('createPayment() called without selectService() first.');
    }
    session.send('START_PAYMENT');
    notify({ event: 'payment_started', service: currentService.label });
    return adapter.startPayment({
      amount: Math.round(currentService.amount * 100),
      currencyCode: CUBO_CURRENCY_ISO4217[machineConfig.currency],
      currencySymbol: 'Q',
      ...(mode === 'mock' && currentService.mockOutcome ? { outcome: currentService.mockOutcome } : {}),
    });
  }

  // Best-effort, local-only: no cancel() method is confirmed on the real
  // SDK (see CUBO-INTEGRATION.md), so this cannot actually tell the POS to
  // stop. It only reflects operator/customer intent in our own state
  // machine, and only from states where CANCEL is a valid transition.
  function cancelPayment() {
    const state = session.getState();
    if (state !== STATES.WAITING_FOR_CARD && state !== STATES.PROCESSING_PAYMENT) {
      throw new Error(`cancelPayment() has nothing to cancel from state "${state}".`);
    }
    session.send('CANCEL');
    notify({ event: 'cancelled_locally' });
  }

  // Explicit and separate from the transactionResult handler on purpose:
  // reaching PAYMENT_SUCCESS never auto-starts anything by itself. Whoever
  // holds the provider must call requestCycle() themselves after checking
  // canStartCycle() — see the Skill's security rules.
  function requestCycle() {
    return requestCycleStart({
      machineId: machineConfig.machineId,
      state: session.getState(),
      service: currentService,
    });
  }

  return {
    providerType: 'card',
    selectService,
    connectPos,
    disconnectPos,
    createPayment,
    cancelPayment,
    getStatus: () => session.getState(),
    canStartCycle: () => canStartCycle(session.getState()),
    requestCycle,
    onResult(handler) {
      resultHandlers.add(handler);
      return () => resultHandlers.delete(handler);
    },
  };
}

export { Esp32NotImplementedError };
