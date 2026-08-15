// Event and status names confirmed against the official Cubo Web SDK docs
// (owner-verified read of https://developers.cubopago.com/sdks/web-sdk,
// 2026-08-15 — see CUBO-INTEGRATION.md for provenance). Payload shapes for
// these are NOT confirmed — see the "UNVERIFIED" section there and in
// webSdkCuboAdapter.js. These are name constants only, nothing more.

export const CUBO_EVENTS = Object.freeze({
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  LOADING: 'loading',
  TRANSACTION_RESULT: 'transactionResult',
  ERROR: 'error',
  STATUS: 'status',
});

// Values carried by the 'status' event's (unconfirmed) payload field.
export const CUBO_STATUS_VALUES = Object.freeze({
  SEARCHING: 'searching',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  WAITING_FOR_CARD: 'waiting_for_card',
  PROCESSING_PAYMENT: 'processing_payment',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  TRANSACTION_TERMINATED: 'transaction_terminated',
});
