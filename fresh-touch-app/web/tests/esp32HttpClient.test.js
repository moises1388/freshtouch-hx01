import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEsp32Status, setEsp32Relay } from '../src/esp32/esp32HttpClient.js';
import { Esp32TimeoutError, Esp32UnavailableError, Esp32CommandRejectedError } from '../src/esp32/esp32Errors.js';

const originalFetch = globalThis.fetch;

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

test('getEsp32Status: GET /status exitoso devuelve el JSON parseado', async () => {
  let calledUrl;
  globalThis.fetch = async (url) => {
    calledUrl = url;
    return { ok: true, status: 200, json: async () => ({ machineId: 'HX02', wifiConnected: true }) };
  };
  try {
    const status = await getEsp32Status('192.168.1.20');
    assert.equal(calledUrl, 'http://192.168.1.20/status');
    assert.equal(status.machineId, 'HX02');
    assert.equal(status.wifiConnected, true);
  } finally {
    restoreFetch();
  }
});

test('getEsp32Status: respuesta no-200 se trata como no disponible, no se inventa un formato de error', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  try {
    await assert.rejects(() => getEsp32Status('192.168.1.20'), Esp32UnavailableError);
  } finally {
    restoreFetch();
  }
});

test('getEsp32Status: fallo de red (fetch rechaza) se mapea a Esp32UnavailableError', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  try {
    await assert.rejects(() => getEsp32Status('192.168.1.20'), Esp32UnavailableError);
  } finally {
    restoreFetch();
  }
});

test('getEsp32Status: timeout (fetch nunca resuelve) se mapea a Esp32TimeoutError', async () => {
  globalThis.fetch = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      reject(err);
    });
  });
  try {
    await assert.rejects(() => getEsp32Status('192.168.1.20', { timeoutMs: 10 }), Esp32TimeoutError);
  } finally {
    restoreFetch();
  }
});

test('setEsp32Relay: éxito construye la URL exacta esperada por el firmware v3', async () => {
  let calledUrl;
  globalThis.fetch = async (url) => {
    calledUrl = url;
    return { ok: true, status: 200, text: async () => 'ok' };
  };
  try {
    const result = await setEsp32Relay('192.168.1.20', 'vapor', true);
    assert.equal(calledUrl, 'http://192.168.1.20/relay?comp=vapor&state=1');
    assert.equal(result.ok, true);
    assert.equal(result.body, 'ok');
  } finally {
    restoreFetch();
  }
});

test('setEsp32Relay: state=false se envía como state=0', async () => {
  let calledUrl;
  globalThis.fetch = async (url) => {
    calledUrl = url;
    return { ok: true, status: 200, text: async () => 'ok' };
  };
  try {
    await setEsp32Relay('192.168.1.20', 'puerta', false);
    assert.equal(calledUrl, 'http://192.168.1.20/relay?comp=puerta&state=0');
  } finally {
    restoreFetch();
  }
});

test('setEsp32Relay: 404 (componente desconocido) lanza Esp32CommandRejectedError, no se reintenta a este nivel', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 404, text: async () => 'unknown component: fake' });
  try {
    await assert.rejects(() => setEsp32Relay('192.168.1.20', 'fake', true), Esp32CommandRejectedError);
  } finally {
    restoreFetch();
  }
});

test('setEsp32Relay: 400 (state inválido) lanza Esp32CommandRejectedError', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 400, text: async () => 'state must be 0 or 1' });
  try {
    await assert.rejects(() => setEsp32Relay('192.168.1.20', 'vapor', true), Esp32CommandRejectedError);
  } finally {
    restoreFetch();
  }
});

test('setEsp32Relay: fallo de red se mapea a Esp32UnavailableError', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  try {
    await assert.rejects(() => setEsp32Relay('192.168.1.20', 'vapor', true), Esp32UnavailableError);
  } finally {
    restoreFetch();
  }
});
