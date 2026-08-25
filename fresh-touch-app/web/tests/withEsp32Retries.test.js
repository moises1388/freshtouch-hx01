import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withEsp32Retries } from '../src/esp32/withEsp32Retries.js';
import { Esp32TimeoutError, Esp32UnavailableError, Esp32CommandRejectedError } from '../src/esp32/esp32Errors.js';

test('reintenta un timeout transitorio y devuelve el resultado si un intento posterior funciona', async () => {
  let attempts = 0;
  const result = await withEsp32Retries(async () => {
    attempts++;
    if (attempts < 3) throw new Esp32TimeoutError('timeout simulado');
    return 'ok';
  }, { retries: 3, delayMs: 1 });
  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
});

test('reintenta "no disponible" igual que timeout', async () => {
  let attempts = 0;
  const result = await withEsp32Retries(async () => {
    attempts++;
    if (attempts < 2) throw new Esp32UnavailableError('no disponible simulado');
    return 'ok';
  }, { retries: 2, delayMs: 1 });
  assert.equal(result, 'ok');
  assert.equal(attempts, 2);
});

test('NUNCA reintenta un comando rechazado — falla en el primer intento', async () => {
  let attempts = 0;
  await assert.rejects(
    () => withEsp32Retries(async () => {
      attempts++;
      throw new Esp32CommandRejectedError('rechazado simulado');
    }, { retries: 3, delayMs: 1 }),
    Esp32CommandRejectedError
  );
  assert.equal(attempts, 1, 'un comando rechazado no debe reintentarse');
});

test('agota los reintentos y lanza el último error si nunca se recupera', async () => {
  let attempts = 0;
  await assert.rejects(
    () => withEsp32Retries(async () => {
      attempts++;
      throw new Esp32TimeoutError('timeout simulado');
    }, { retries: 2, delayMs: 1 }),
    Esp32TimeoutError
  );
  assert.equal(attempts, 3, 'debe intentar 1 vez + 2 reintentos = 3 intentos en total');
});

test('sin fallas, llama la función una sola vez', async () => {
  let attempts = 0;
  const result = await withEsp32Retries(async () => {
    attempts++;
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(attempts, 1);
});
