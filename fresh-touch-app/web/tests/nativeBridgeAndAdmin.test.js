import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockNativeBridge } from '../src/nativeBridge/mockNativeBridge.js';
import { assertImplementsNativeBridgeContract } from '../src/nativeBridge/nativeBridgeContract.js';
import { createAdminSession } from '../src/admin/adminSession.js';
import { assertImplementsAdminContract } from '../src/admin/adminContract.js';
import {
  MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION,
  MOCK_PINS_NOT_FOR_PRODUCTION,
  resolveMockAdminRole,
} from '../src/admin/mockAdminAuth.js';

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

test('clearSecret: borra la presencia de una clave guardada, sin haber retenido nunca el valor', async () => {
  const bridge = createMockNativeBridge();
  await bridge.saveSecret('cuboApiKey', 'valor-secreto-de-prueba');
  assert.equal(await bridge.hasSecret('cuboApiKey'), true);
  const result = await bridge.clearSecret('cuboApiKey');
  assert.equal(result.cleared, true);
  assert.equal(result.mock, true);
  assert.equal(await bridge.hasSecret('cuboApiKey'), false);
});

test('clearSecret sobre una clave que nunca existió no lanza, y reporta cleared:false', async () => {
  const bridge = createMockNativeBridge();
  const result = await bridge.clearSecret('nunca-guardada');
  assert.equal(result.cleared, false);
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

test('adminSession cumple AdminContract (incluye getRole)', () => {
  const session = createAdminSession({ nativeBridge: createMockNativeBridge() });
  assert.doesNotThrow(() => assertImplementsAdminContract(session));
});

test('resolveMockAdminRole: distingue los 4 roles por longitud Y valor exacto, igual que checkPIN() en HX01 real', () => {
  assert.equal(resolveMockAdminRole(MOCK_PINS_NOT_FOR_PRODUCTION.sa), 'sa');
  assert.equal(resolveMockAdminRole(MOCK_PINS_NOT_FOR_PRODUCTION.ow), 'ow');
  assert.equal(resolveMockAdminRole(MOCK_PINS_NOT_FOR_PRODUCTION.tc), 'tc');
  assert.equal(resolveMockAdminRole(MOCK_PINS_NOT_FOR_PRODUCTION.tn), 'tn');
  assert.equal(resolveMockAdminRole('999999'), null);
  assert.equal(resolveMockAdminRole(''), null);
  assert.equal(resolveMockAdminRole(undefined), null);
});

test('resolveMockAdminRole: un valor correcto con la longitud de otro rol no autentica (desambiguación por longitud)', () => {
  // El valor de owner con un dígito extra no debe "colarse" como sa, ni
  // el de owner sin su último dígito colarse como tech/tenant.
  assert.equal(resolveMockAdminRole(`${MOCK_PINS_NOT_FOR_PRODUCTION.ow}9`), null);
  assert.equal(resolveMockAdminRole(MOCK_PINS_NOT_FOR_PRODUCTION.ow.slice(0, 4)), null);
});

test('adminSession: el PIN de Super Admin (Hydrox) autentica con rol "sa"', async () => {
  const session = createAdminSession({ nativeBridge: createMockNativeBridge() });
  const ok = await session.authenticate(MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION);
  assert.equal(ok, true);
  assert.equal(session.isAuthenticated(), true);
  assert.equal(session.getRole(), 'sa');
});

test('adminSession: cada uno de los 4 PINes autentica con su propio rol', async () => {
  for (const [role, pin] of Object.entries(MOCK_PINS_NOT_FOR_PRODUCTION)) {
    const session = createAdminSession({ nativeBridge: createMockNativeBridge() });
    const ok = await session.authenticate(pin);
    assert.equal(ok, true, `el PIN de ${role} debería autenticar`);
    assert.equal(session.getRole(), role);
  }
});

test('adminSession: PIN incorrecto no autentica y deja el rol en null', async () => {
  const session = createAdminSession({ nativeBridge: createMockNativeBridge() });
  const ok = await session.authenticate('999999');
  assert.equal(ok, false);
  assert.equal(session.isAuthenticated(), false);
  assert.equal(session.getRole(), null);
});

test('adminSession: logout revierte la autenticación y limpia el rol', async () => {
  const session = createAdminSession({ nativeBridge: createMockNativeBridge() });
  await session.authenticate(MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION);
  session.logout();
  assert.equal(session.isAuthenticated(), false);
  assert.equal(session.getRole(), null);
});
