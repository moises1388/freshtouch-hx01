import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockNativeBridge } from '../src/nativeBridge/mockNativeBridge.js';
import { assertImplementsNativeBridgeContract } from '../src/nativeBridge/nativeBridgeContract.js';
import { createAdminSession } from '../src/admin/adminSession.js';
import { assertImplementsAdminContract } from '../src/admin/adminContract.js';
import { MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION } from '../src/admin/mockAdminAuth.js';

test('el mock cumple NativeBridgeContract', () => {
  assert.doesNotThrow(() => assertImplementsNativeBridgeContract(createMockNativeBridge()));
});

test('saveSecret nunca devuelve ni conserva el valor en texto plano', async () => {
  const bridge = createMockNativeBridge();
  const result = await bridge.saveSecret('cuboApiKey', 'valor-secreto-de-prueba');
  // La única promesa del mock es "se guardó algo" — nunca debe aparecer
  // el valor real en la respuesta.
  assert.equal(JSON.stringify(result).includes('valor-secreto-de-prueba'), false);
  assert.equal(await bridge.hasSecret('cuboApiKey'), true);
});

test('hasSecret es false para una clave nunca guardada', async () => {
  const bridge = createMockNativeBridge();
  assert.equal(await bridge.hasSecret('nunca-guardada'), false);
});

test('testConnection del mock nunca contacta nada real, y lo declara explícitamente', async () => {
  const bridge = createMockNativeBridge();
  const result = await bridge.testConnection('esp32');
  assert.equal(result.mock, true);
  assert.match(result.note, /MOCK/);
});

test('getDiagnostics: todos los campos declarados como MOCK, ninguno inventa un estado real', async () => {
  const bridge = createMockNativeBridge();
  const diag = await bridge.getDiagnostics();
  for (const key of ['internet', 'esp32', 'cubo', 'qpos', 'core']) {
    assert.match(diag[key], /MOCK/, `${key} debe estar marcado como MOCK`);
  }
});

test('adminSession cumple AdminContract', () => {
  const session = createAdminSession({ nativeBridge: createMockNativeBridge() });
  assert.doesNotThrow(() => assertImplementsAdminContract(session));
});

test('adminSession: PIN correcto autentica', async () => {
  const session = createAdminSession({ nativeBridge: createMockNativeBridge() });
  const ok = await session.authenticate(MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION);
  assert.equal(ok, true);
  assert.equal(session.isAuthenticated(), true);
});

test('adminSession: PIN incorrecto no autentica', async () => {
  const session = createAdminSession({ nativeBridge: createMockNativeBridge() });
  const ok = await session.authenticate('999999');
  assert.equal(ok, false);
  assert.equal(session.isAuthenticated(), false);
});

test('adminSession: logout revierte la autenticación', async () => {
  const session = createAdminSession({ nativeBridge: createMockNativeBridge() });
  await session.authenticate(MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION);
  session.logout();
  assert.equal(session.isAuthenticated(), false);
});
