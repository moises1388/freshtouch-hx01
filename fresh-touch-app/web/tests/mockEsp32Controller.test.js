import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockEsp32Controller, CONNECTION } from '../src/esp32/mockEsp32Controller.js';
import { ESP32_COMPONENTS, assertImplementsEsp32Contract } from '../src/esp32/esp32Contract.js';
import { Esp32TimeoutError, Esp32UnavailableError, Esp32CommandRejectedError } from '../src/esp32/esp32Errors.js';

test('el mock cumple ESP32Contract (incluye connect/disconnect)', () => {
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

test('testConnection: MOCK siempre reporta conectado, marcado como tal (sin fallas inyectadas)', async () => {
  const esp32 = createMockEsp32Controller();
  const result = await esp32.testConnection();
  assert.equal(result.connected, true);
  assert.equal(result.mock, true);
});

// --- Escenarios pedidos explícitamente en la autorización de Fase 3 ---

test('conexión: connect() deja CONNECTED y getStatus lo refleja', async () => {
  const esp32 = createMockEsp32Controller();
  esp32.disconnect();
  assert.equal(esp32.getStatus().connection, CONNECTION.DISCONNECTED);
  await esp32.connect();
  assert.equal(esp32.getStatus().connection, CONNECTION.CONNECTED);
});

test('desconexión: disconnect() deja DISCONNECTED y bloquea comandos hasta reconectar', async () => {
  const esp32 = createMockEsp32Controller();
  esp32.disconnect();
  assert.equal(esp32.getStatus().connection, CONNECTION.DISCONNECTED);
  await assert.rejects(() => esp32.setRelay(ESP32_COMPONENTS.VAPOR, true), Esp32UnavailableError);
});

test('timeout: un comando con timeout inyectado lanza Esp32TimeoutError y no cambia el relay', async () => {
  const esp32 = createMockEsp32Controller();
  esp32.__setInjectedFailure('timeout');
  await assert.rejects(() => esp32.setRelay(ESP32_COMPONENTS.VAPOR, true), Esp32TimeoutError);
  assert.equal(esp32.getStatus().relays.vapor, false, 'el relay no debe quedar activado si el comando falló');
});

test('ESP32 no disponible: testConnection() reporta connected:false en vez de lanzar (para que la UI lo pueda mostrar)', async () => {
  const esp32 = createMockEsp32Controller();
  esp32.__setInjectedFailure('unavailable');
  const result = await esp32.testConnection();
  assert.equal(result.connected, false);
  assert.match(result.error, /no disponible/);
});

test('ESP32 no disponible: setRelay() lanza Esp32UnavailableError y deja getStatus().connection en UNAVAILABLE', async () => {
  const esp32 = createMockEsp32Controller();
  esp32.__setInjectedFailure('unavailable');
  await assert.rejects(() => esp32.setRelay(ESP32_COMPONENTS.SECADO, true), Esp32UnavailableError);
  assert.equal(esp32.getStatus().connection, CONNECTION.UNAVAILABLE);
});

test('comando exitoso: setRelay() sin fallas inyectadas confirma el nuevo estado del relay', async () => {
  const esp32 = createMockEsp32Controller();
  const result = await esp32.setRelay(ESP32_COMPONENTS.VAPOR, true);
  assert.equal(result.component, ESP32_COMPONENTS.VAPOR);
  assert.equal(result.on, true);
  assert.equal(esp32.getStatus().relays.vapor, true);
});

test('comando rechazado: setRelay() con rechazo inyectado lanza Esp32CommandRejectedError y no cambia el relay', async () => {
  const esp32 = createMockEsp32Controller();
  esp32.__setInjectedFailure('reject');
  await assert.rejects(() => esp32.setRelay(ESP32_COMPONENTS.VAPOR, true), Esp32CommandRejectedError);
  assert.equal(esp32.getStatus().relays.vapor, false);
});

test('recuperación de conexión: tras una falla de "no disponible", limpiar la falla inyectada y reconectar restaura el flujo normal', async () => {
  const esp32 = createMockEsp32Controller();
  esp32.__setInjectedFailure('unavailable');
  await assert.rejects(() => esp32.setRelay(ESP32_COMPONENTS.VAPOR, true));
  assert.equal(esp32.getStatus().connection, CONNECTION.UNAVAILABLE);

  // Recuperación: se limpia la falla simulada y se reconecta, como haría
  // main.js tras un reintento fallido (ver esp32/withEsp32Retries.js).
  esp32.__setInjectedFailure(null);
  await esp32.connect();
  assert.equal(esp32.getStatus().connection, CONNECTION.CONNECTED);

  const result = await esp32.setRelay(ESP32_COMPONENTS.VAPOR, true);
  assert.equal(result.on, true);
  assert.equal(esp32.getStatus().relays.vapor, true);
});
