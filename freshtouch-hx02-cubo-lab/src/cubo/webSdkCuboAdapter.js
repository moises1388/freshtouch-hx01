// Thin wrapper around the real Cubo Web SDK.
//
// CONFIRMED against https://developers.cubopago.com/sdks/web-sdk (checked
// 2026-08-15 via search-engine cache — direct WebFetch to that domain is
// blocked by this environment's network egress policy; see
// CUBO-INTEGRATION.md for the full account of what could and couldn't be
// verified):
//   - Works only with the Cubo QPOS Cute terminal model.
//   - Requires an API Key generated in Cubo Admin.
//   - The app must be served over HTTPS; http://localhost is allowed for
//     development only.
//   - The device needs Bluetooth available and enabled.
//   - NOT compatible with Safari (macOS/iOS) or Firefox.
//   - connect() / disconnect() manage the Bluetooth link to the reader
//     directly from the browser.
//   - startPayment({ amount, currencyCode, currencySymbol }) starts a
//     charge: amount in cents, currencyCode is the 4-digit ISO 4217
//     numeric code (e.g. "0320" for GTQ, "0840" for USD), currencySymbol
//     e.g. "Q" or "$".
//   - on(eventName, handler) subscribes to SDK events; a 'status' event
//     reports connection/payment state changes.
//
// UNVERIFIED — could not be confirmed from what was reachable:
//   - Whether 'connected' / 'disconnected' / 'transactionResult' / 'error'
//     exist as separate named events (as the lab brief assumes) or whether
//     everything is delivered through the single 'status' event with a
//     state/status field instead.
//   - The exact payload field names for transaction id, reference id,
//     authorization code and read type.
//   - The SDK's script/module name and how it attaches to `window`, and
//     the exact initialization signature — this file assumes
//     `new window.CuboSDK({ apiKey, environment })`, WHICH IS A GUESS.
//
// DO NOT point this adapter at real hardware or a real API key until a
// developer with ordinary browser access has opened the docs above and
// reconciled these assumptions. Until then, use mockCuboAdapter.js.

import { log, maskSecret } from '../logger.js';

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
