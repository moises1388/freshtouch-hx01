import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft } from '../src/machineConfig/provisioningValidation.js';
import { loadMockMachineConfig } from '../src/machineConfig/mockMachineConfig.js';

function validDraft(overrides = {}) {
  const base = loadMockMachineConfig();
  return { ...base, ...overrides };
}

test('una configuración válida (mock de HX02) pasa la validación sin errores', () => {
  const { valid, errors } = validateDraft(validDraft());
  assert.equal(valid, true);
  assert.deepEqual(errors, {});
});

test('machineId vacío es inválido', () => {
  const { valid, errors } = validateDraft(validDraft({ machineId: '' }));
  assert.equal(valid, false);
  assert.ok(errors.machineId);
});

test('machineId con espacios o símbolos no permitidos es inválido', () => {
  const { valid, errors } = validateDraft(validDraft({ machineId: 'HX 02 !!' }));
  assert.equal(valid, false);
  assert.ok(errors.machineId);
});

test('precios en cero o negativos son inválidos', () => {
  assert.equal(validateDraft(validDraft({ prices: { basic: 0, premium: 35 } })).valid, false);
  assert.equal(validateDraft(validDraft({ prices: { basic: 20, premium: -5 } })).valid, false);
});

test('precios no numéricos son inválidos', () => {
  const { valid, errors } = validateDraft(validDraft({ prices: { basic: 'veinte', premium: 35 } }));
  assert.equal(valid, false);
  assert.ok(errors['prices.basic']);
});

test('paymentProvider desconocido es inválido', () => {
  const { valid, errors } = validateDraft(validDraft({ paymentProvider: 'stripe' }));
  assert.equal(valid, false);
  assert.ok(errors.paymentProvider);
});

test('cuboEnvironment desconocido es inválido', () => {
  const { valid, errors } = validateDraft(validDraft({ cuboEnvironment: 'staging' }));
  assert.equal(valid, false);
  assert.ok(errors.cuboEnvironment);
});

test('esp32Address vacío es inválido', () => {
  const { valid, errors } = validateDraft(validDraft({ esp32Address: '' }));
  assert.equal(valid, false);
  assert.ok(errors.esp32Address);
});

test('cuboPosId/cuboPosSerial vacíos son inválidos SOLO cuando paymentProvider es "cubo"', () => {
  const conMock = validateDraft(validDraft({ paymentProvider: 'mock', cuboPosId: '', cuboPosSerial: '' }));
  assert.equal(conMock.valid, true, 'con paymentProvider mock, POS ID/Serial vacíos no deben bloquear el guardado');

  const conCubo = validateDraft(validDraft({ paymentProvider: 'cubo', cuboPosId: '', cuboPosSerial: '' }));
  assert.equal(conCubo.valid, false);
  assert.ok(conCubo.errors.cuboPosId);
  assert.ok(conCubo.errors.cuboPosSerial);
});

test('cuboPosId/cuboPosSerial no vacíos con paymentProvider "cubo" son válidos, sin inventar un formato específico de Cubo', () => {
  const { valid } = validateDraft(validDraft({ paymentProvider: 'cubo', cuboPosId: 'x', cuboPosSerial: 'y' }));
  assert.equal(valid, true);
});

test('una configuración con múltiples campos inválidos reporta todos los errores, no solo el primero', () => {
  const { valid, errors } = validateDraft({ machineId: '', prices: { basic: -1, premium: 'x' } });
  assert.equal(valid, false);
  assert.ok(errors.machineId);
  assert.ok(errors['prices.basic']);
  assert.ok(errors['prices.premium']);
  assert.ok(errors.machineName);
});
