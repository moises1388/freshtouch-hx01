import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRealEsp32Adapter } from '../src/esp32/realEsp32Adapter.js';
import { assertImplementsEsp32Contract } from '../src/esp32/esp32Contract.js';
import { Esp32ProtocolUndefinedError, Esp32UnavailableError, Esp32CommandRejectedError } from '../src/esp32/esp32Errors.js';
import { loadMockMachineConfig } from '../src/machineConfig/mockMachineConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const originalFetch = globalThis.fetch;

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function statusResponse(overrides = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      machineId: 'HX02', ip: '192.168.1.20', rssi: -50, uptimeSeconds: 10,
      firmwareVersion: '3.0.0', totalCycles: 1, wifiConnected: true, relays: [], ...overrides,
    }),
  };
}

test('createRealEsp32Adapter exige machineConfig con esp32Id y esp32Address', () => {
  assert.throws(() => createRealEsp32Adapter({}), /esp32Id/);
  assert.throws(() => createRealEsp32Adapter({ machineConfig: { esp32Id: 'X' } }), /esp32Address/);
});

test('el adaptador real cumple ESP32Contract', () => {
  const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
  assert.doesNotThrow(() => assertImplementsEsp32Contract(adapter));
});

test('notifyCycleDone() sigue sin implementar en esta etapa — lanza Esp32ProtocolUndefinedError explícitamente', async () => {
  const adapter = createRealEsp32Adapter({ machineConfig: loadMockMachineConfig() });
  await assert.rejects(() => adapter.notifyCycleDone('basic'), Esp32ProtocolUndefinedError);
});

test('disconnect() no hace ninguna llamada de red — no hay sesión que cerrar', () => {
  let fetchCalled = false;
  globalThis.fetch = async () => { fetchCalled = true; return statusResponse(); };
  try {
    const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
    adapter.disconnect();
    assert.equal(fetchCalled, false);
  } finally {
    restoreFetch();
  }
});

test('el código fuente documenta explícitamente que connect() no crea una sesión (requisito exigido)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/esp32/realEsp32Adapter.js'), 'utf8');
  assert.match(src, /connect\(\) NO conecta físicamente ni crea una sesión en el ESP32/);
});

test('connect(): GET /status exitoso resuelve connected:true con el status crudo', async () => {
  globalThis.fetch = async () => statusResponse();
  try {
    const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
    const result = await adapter.connect();
    assert.equal(result.connected, true);
    assert.equal(result.mock, false);
    assert.equal(result.status.machineId, 'HX02');
  } finally {
    restoreFetch();
  }
});

test('connect(): reintenta fallos transitorios y termina rechazando si nunca se recupera (no lo oculta)', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError('fetch failed'); };
  try {
    const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
    await assert.rejects(() => adapter.connect(), Esp32UnavailableError);
    assert.ok(calls > 1, 'debe haber reintentado al menos una vez');
  } finally {
    restoreFetch();
  }
});

test('setRelay(): éxito devuelve component/on y no reintenta si no hace falta', async () => {
  let calls = 0;
  globalThis.fetch = async (url) => { calls++; return { ok: true, status: 200, text: async () => 'ok' }; };
  try {
    const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
    const result = await adapter.setRelay('vapor', true);
    assert.equal(result.component, 'vapor');
    assert.equal(result.on, true);
    assert.equal(result.mock, false);
    assert.equal(calls, 1);
  } finally {
    restoreFetch();
  }
});

test('setRelay(): rechazo del ESP32 (404) nunca se reintenta — un solo intento', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: false, status: 404, text: async () => 'unknown component: x' }; };
  try {
    const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
    await assert.rejects(() => adapter.setRelay('x', true), Esp32CommandRejectedError);
    assert.equal(calls, 1, 'un comando rechazado no debe reintentarse');
  } finally {
    restoreFetch();
  }
});

test('setRelay(): timeout/no-disponible se reintenta y puede recuperarse', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls < 2) throw new TypeError('fetch failed');
    return { ok: true, status: 200, text: async () => 'ok' };
  };
  try {
    const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
    const result = await adapter.setRelay('secado', false);
    assert.equal(result.on, false);
    assert.equal(calls, 2, 'debe haber reintentado tras el primer fallo transitorio');
  } finally {
    restoreFetch();
  }
});

test('testConnection(): nunca lanza — éxito reporta connected:true', async () => {
  globalThis.fetch = async () => statusResponse();
  try {
    const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
    const result = await adapter.testConnection();
    assert.equal(result.connected, true);
    assert.equal(result.mock, false);
  } finally {
    restoreFetch();
  }
});

test('testConnection(): nunca lanza — fallo reporta connected:false con el error, no lo esconde', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  try {
    const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
    const result = await adapter.testConnection();
    assert.equal(result.connected, false);
    assert.ok(result.error);
  } finally {
    restoreFetch();
  }
});

test('getStatus(): devuelve el JSON real de /status, ya no el placeholder PROTOCOL_UNDEFINED', async () => {
  globalThis.fetch = async () => statusResponse({ totalCycles: 42 });
  try {
    const adapter = createRealEsp32Adapter({ machineConfig: { esp32Id: 'X', esp32Address: '192.168.1.20' } });
    const status = await adapter.getStatus();
    assert.equal(status.totalCycles, 42);
    assert.equal(status.mock, false);
    assert.notEqual(status.connection, 'PROTOCOL_UNDEFINED');
  } finally {
    restoreFetch();
  }
});
