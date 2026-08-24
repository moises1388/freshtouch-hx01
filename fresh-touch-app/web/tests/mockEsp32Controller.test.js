import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockEsp32Controller } from '../src/esp32/mockEsp32Controller.js';
import { ESP32_COMPONENTS, assertImplementsEsp32Contract } from '../src/esp32/esp32Contract.js';

test('el mock cumple ESP32Contract', () => {
  assert.doesNotThrow(() => assertImplementsEsp32Contract(createMockEsp32Controller()));
});

test('setRelay registra el estado por componente', async () => {
  const esp32 = createMockEsp32Controller();
  await esp32.setRelay(ESP32_COMPONENTS.VAPOR, true);
  const status = esp32.getStatus();
  assert.equal(status.relays.vapor, true);
  assert.equal(status.relays.secado, false);
});

test('setRelay rechaza un componente desconocido', async () => {
  await assert.rejects(() => createMockEsp32Controller().setRelay('inexistente', true));
});

test('notifyCycleDone se registra en el estado', async () => {
  const esp32 = createMockEsp32Controller();
  await esp32.notifyCycleDone('basic');
  assert.equal(esp32.getStatus().lastCycleNotified, 'basic');
});

test('testConnection: MOCK siempre reporta conectado, marcado como tal', async () => {
  const esp32 = createMockEsp32Controller();
  const result = await esp32.testConnection();
  assert.equal(result.connected, true);
  assert.equal(result.mock, true);
});
