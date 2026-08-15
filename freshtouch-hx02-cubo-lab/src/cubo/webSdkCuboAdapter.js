// Thin wrapper around the real Cubo Web SDK.
//
// CONFIRMED — owner-verified directly against
// https://developers.cubopago.com/sdks/web-sdk (2026-08-15; this session's
// own fetch to that domain is still blocked by network egress policy, see
// CUBO-INTEGRATION.md for the full provenance):
//   - Works only with the Cubo QPOS Cute terminal model.
//   - Requires an API Key generated in Cubo Admin (sandbox access requested
//     via Cubo's contact center first).
//   - The app must be served over HTTPS; http://localhost is allowed for
//     development only.
//   - The device needs Bluetooth available and enabled.
//   - Supported browsers: Chrome (Desktop/Android), Edge (Desktop), Opera
//     (Desktop/Android). Not Safari, not Firefox.
//   - Methods: connect(), disconnect(), startPayment(), on().
//   - startPayment({ amount, currencyCode, currencySymbol }) starts a
//     charge: amount in cents (Q20.00 -> 2000), currencyCode is the
//     4-digit ISO 4217 numeric code (GTQ -> "0320"), currencySymbol e.g.
//     "Q" or "$".
//   - Events fired via on(): 'connected', 'disconnected', 'loading',
//     'transactionResult', 'error', 'status'. The 'status' event additionally
//     carries one of these state values: 'searching', 'connecting',
//     'connected', 'disconnected', 'waiting_for_card', 'processing_payment',
//     'payment_success', 'payment_failed', 'transaction_terminated'.
//     ('connected'/'disconnected' appear both as their own discrete events
//     and as status values — how the two interleave in practice is not yet
//     known, see CUBO-INTEGRATION.md.)
//
// UNVERIFIED — event/status *names* are confirmed above; their payload
// *shapes* are not, and were deliberately not guessed:
//   - The exact payload field names inside 'transactionResult' (transaction
//     id, reference id, authorization code, read type).
//   - The exact payload fields of the 'error' event.
//   - The exact payload of the 'status' event (which field carries the
//     state value shown above).
//   - The SDK's script/module name and how it attaches to `window`, and
//     the exact initialization signature — this file assumes
//     `new window.CuboSDK({ apiKey, environment })`, WHICH IS A GUESS.
//
// DO NOT point this adapter at real hardware or a real API key until the
// payload shapes above have been confirmed (official SDK repo/demo, or one
// real sandbox transaction with the raw events logged). Until then, use
// mockCuboAdapter.js — it deliberately mirrors the same event names.

import { log, maskSecret } from '../logger.js';
import { CUBO_EVENTS, CUBO_STATUS_VALUES } from './cuboEvents.js';

// Re-exported for convenience so callers of this adapter don't need a
// separate import to know what event/status names to expect.
export { CUBO_EVENTS, CUBO_STATUS_VALUES };

export function createWebSdkCuboAdapter({ machineConfig, apiKey }) {
  if (typeof window === 'undefined' || !window.CuboSDK) {
    throw new Error(
      'window.CuboSDK is not present. Load the official Cubo Web SDK <script> tag before using this adapter (see CUBO-INTEGRATION.md).'
    );
  }
  if (!apiKey) {
    throw new Error('Missing Cubo API key. It must never be hardcoded or committed to the repo.');
  }

  log(machineConfig.machineId, 'Initializing Cubo Web SDK', {
    environment: machineConfig.cuboEnvironment,
    apiKey: maskSecret(apiKey),
  });

  const sdk = new window.CuboSDK({
    apiKey,
    environment: machineConfig.cuboEnvironment,
  });

  function on(event, handler) {
    sdk.on(event, handler);
    return () => sdk.off?.(event, handler);
  }

  async function connect() {
    log(machineConfig.machineId, 'POS connecting');
    return sdk.connect();
  }

  async function disconnect() {
    log(machineConfig.machineId, 'POS disconnecting');
    return sdk.disconnect();
  }

  async function startPayment({ amount, currencyCode, currencySymbol }) {
    log(machineConfig.machineId, 'Payment started', { amount, currencyCode, currencySymbol });
    return sdk.startPayment({ amount, currencyCode, currencySymbol });
  }

  return { connect, disconnect, startPayment, on };
}
