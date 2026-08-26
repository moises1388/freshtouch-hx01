// Nombres de evento, status y tipo de error CONFIRMADOS contra el repo
// oficial de demo de Cubo (github.com/Cubo-App/cubo-pos-sdk-web-demo),
// clonado y leído directamente durante el trabajo del laboratorio HX02 —
// no son resúmenes de buscador ni suposiciones. Portado literalmente desde
// freshtouch-hx02-cubo-lab/src/cubo/cuboEvents.js. Ver
// freshtouch-hx02-cubo-lab/CUBO-INTEGRATION.md para la procedencia completa.
//
// Dos de las fuentes propias del repo de demo (llms.txt y los comentarios
// en línea de su skill cubo-sdk-help) abrevian la lista de estados de pago
// como 'processing' y omiten 'transaction_terminated'; el README.md del
// repo de demo (la fuente más detallada y estructurada) usa
// 'processing_payment' e incluye 'transaction_terminated'. Este archivo
// sigue README.md como la fuente más autoritativa.

export const CUBO_EVENTS = Object.freeze({
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  LOADING: 'loading',
  TRANSACTION_RESULT: 'transactionResult',
  ERROR: 'error',
  STATUS: 'status',
  // Solo dispara si el SDK se configura con enableMsi:true y
  // msiModal:false — HX02 no usa MSI (precios fijos Básico/Premium),
  // listado aquí solo por completitud/referencia.
  INSTALLMENTS_LOADED: 'installmentsLoaded',
});

// Valores que trae el payload del evento 'status' (el payload del evento
// ES el string mismo, confirmado — no viene envuelto en un objeto). Status
// NO es un enum cerrado: durante la recuperación automática de pago el SDK
// también emite mensajes de progreso en español libre (ej. "Estamos
// confirmando tu pago con el banco...") que no están en esta lista — el
// código que lee `status` debe tolerar valores fuera de este conjunto en
// vez de tratarlo como exhaustivo.
export const CUBO_STATUS_VALUES = Object.freeze({
  // Conexión
  SEARCHING: 'searching',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  // Verificación del dispositivo / configuración EMV
  VERIFYING_POS: 'verifying_pos',
  PREPARING_POS_CONFIGURATION: 'preparing_pos_configuration',
  CONFIGURING_POS: 'configuring_pos',
  VERIFICATION_FAILED: 'verification_failed',
  CONFIGURING_FAILED: 'configuring_failed',
  // Pago
  WAITING_FOR_CARD: 'waiting_for_card',
  PROCESSING_PAYMENT: 'processing_payment',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_PENDING: 'payment_pending',
  TRANSACTION_TERMINATED: 'transaction_terminated',
});

// El payload del evento 'error' es { type, message } — estos son los
// valores de `type` confirmados.
export const CUBO_ERROR_TYPES = Object.freeze({
  NOT_CONNECTED: 'not_connected',
  CONNECTION_FAILED: 'connection_failed',
  INVALID_AMOUNT: 'invalid_amount',
  INVALID_CURRENCY_CODE: 'invalid_currency_code',
  INVALID_CURRENCY_SYMBOL: 'invalid_currency_symbol',
  TRANSACTION_DECLINED: 'transaction_declined',
  TRANSACTION_NOT_FOUND: 'transaction_not_found',
  RECOVERY_IN_PROGRESS: 'recovery_in_progress',
  SDK_ERROR: 'sdk_error',
});
