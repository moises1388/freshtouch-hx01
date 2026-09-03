import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertValidMachineConfig } from '../src/machineConfig/machineConfigContract.js';
import { loadMockMachineConfig, MOCK_HX02_CONFIG } from '../src/machineConfig/mockMachineConfig.js';

test('la configuración mock de HX02 es válida según el contrato', () => {
  assert.doesNotThrow(() => assertValidMachineConfig(loadMockMachineConfig()));
});

test('loadMockMachineConfig devuelve una copia, no la misma referencia congelada', () => {
  const a = loadMockMachineConfig();
  const b = loadMockMachineConfig();
  assert.notEqual(a, b);
  a.machineName = 'modificado localmente';
  assert.equal(MOCK_HX02_CONFIG.machineName, 'FreshTouch HX02', 'el objeto original no debe mutar');
});

test('rechaza una configuración a la que le falten campos', () => {
  const incompleto = { machineId: 'HX03' };
  assert.throws(() => assertValidMachineConfig(incompleto), /faltan campos/);
});

test('rechaza precios que no sean números', () => {
  const config = { ...loadMockMachineConfig(), prices: { basic: '20', premium: 35 } };
  assert.throws(() => assertValidMachineConfig(config), /deben ser números/);
});

test('rechaza fuerte si algún secreto se coló en el objeto de configuración', () => {
  const config = { ...loadMockMachineConfig(), cuboApiKey: 'esto-nunca-deberia-estar-aqui' };
  assert.throws(() => assertValidMachineConfig(config), /no debe contener secretos/);
});

test('el mismo esquema sirve para una máquina distinta (HX03) sin cambiar código', () => {
  const hx03 = { ...loadMockMachineConfig(), machineId: 'HX03', machineName: 'FreshTouch HX03' };
  assert.doesNotThrow(() => assertValidMachineConfig(hx03));
});
