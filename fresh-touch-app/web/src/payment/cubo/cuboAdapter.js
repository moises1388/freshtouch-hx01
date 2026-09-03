// Fábrica de adaptador de Cubo — portado literalmente desde
// freshtouch-hx02-cubo-lab/src/cubo/cuboAdapter.js.

import { createMockCuboAdapter } from './mockCuboAdapter.js';
import { createWebSdkCuboAdapter } from './webSdkCuboAdapter.js';
import { CUBO_EVENTS, CUBO_STATUS_VALUES, CUBO_ERROR_TYPES } from './cuboEvents.js';

export { CUBO_EVENTS, CUBO_STATUS_VALUES, CUBO_ERROR_TYPES };

// Códigos numéricos ISO 4217, tal como los espera el parámetro
// `currencyCode` de startPayment() (forma confirmada, ver
// webSdkCuboAdapter.js).
export const CUBO_CURRENCY_ISO4217 = Object.freeze({
  GTQ: '0320',
  USD: '0840',
});

/**
 * @param {{mode: 'mock'|'web-sdk', machineConfig: object, apiKey?: string}} params
 */
export function createCuboAdapter({ mode, machineConfig, apiKey }) {
  if (mode === 'mock') return createMockCuboAdapter({ machineConfig });
  if (mode === 'web-sdk') return createWebSdkCuboAdapter({ machineConfig, apiKey });
  throw new Error(`Unknown Cubo adapter mode: "${mode}". Use "mock" or "web-sdk".`);
}
