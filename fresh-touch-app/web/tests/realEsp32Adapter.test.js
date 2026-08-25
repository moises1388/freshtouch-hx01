import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRealEsp32Adapter } from '../src/esp32/realEsp32Adapter.js';
import { assertImplementsEsp32Contract } from '../src/esp32/esp32Contract.js';
import { Esp32ProtocolUndefinedError } from '../src/esp32/esp32Errors.js';
import { loadMockMachineConfig } from '../src/machineConfig/mockMachineConfig.js';

test('createRealEsp32Adapter exige machineConfig con esp32Id y esp32Address', () => {
  assert.throws(() => createRealEsp32Adapter({}), /esp32Id/);
  assert.throws(() => createRealEsp32Adapter({ machineConfig: { esp32Id: 'X' } }), /esp32Address/);
});

test('el adaptador real cumple ESP32Contract aunque no tenga transporte todavía', () => {
  const adapter = createRealEsp32Adapter({ machineConfig: loadMockMachineConfig() });
  assert.doesNotThrow(() => assertImplementsEsp32Contract(adapter));
});

test('cada comando del adaptador real lanza Esp32ProtocolUndefinedError explícitamente, en vez de fallar en silencio o inventar una respuesta', async () => {
  const adapter = createRealEsp32Adapter({ machineConfig: loadMockMachineConfig() });
  await assert.rejects(() => adapter.connect(), Esp32ProtocolUndefinedError);
  await assert.rejects(() => adapter.setRelay('vapor', true), Esp32ProtocolUndefinedError);
  await assert.rejects(() => adapter.notifyCycleDone('basic'), Esp32ProtocolUndefinedError);
  await assert.rejects(() => adapter.testConnection(), Esp32ProtocolUndefinedError);
});

test('disconnect() es un no-op seguro (nunca llegó a conectar nada real)', () => {
  const adapter = createRealEsp32Adapter({ machineConfig: loadMockMachineConfig() });
  assert.doesNotThrow(() => adapter.disconnect());
});

test('getStatus() es honesto: no simula una conexión que no existe', () => {
  const adapter = createRealEsp32Adapter({ machineConfig: loadMockMachineConfig() });
  const status = adapter.getStatus();
  assert.equal(status.connection, 'PROTOCOL_UNDEFINED');
  assert.equal(status.mock, false);
  assert.match(status.note, /no confirmado/);
});
