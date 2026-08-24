import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMachineConfigStore, createInMemoryStorage } from '../src/machineConfig/machineConfigStore.js';
import { loadMockMachineConfig } from '../src/machineConfig/mockMachineConfig.js';

function freshStore() {
  return createMachineConfigStore({ storage: createInMemoryStorage() });
}

test('una máquina recién creada no está provisionada y load() devuelve null', () => {
  const store = freshStore();
  assert.equal(store.isProvisioned(), false);
  assert.equal(store.load(), null);
  assert.equal(store.getActiveMachineId(), null);
});

test('save() persiste la configuración y la deja como máquina activa', () => {
  const store = freshStore();
  const cfg = { ...loadMockMachineConfig(), machineId: 'HX02' };
  const saved = store.save(cfg);
  assert.equal(saved.machineId, 'HX02');
  assert.equal(store.isProvisioned(), true);
  assert.equal(store.getActiveMachineId(), 'HX02');
});

test('recuperación: load() después de guardar devuelve exactamente lo guardado', () => {
  const store = freshStore();
  const cfg = { ...loadMockMachineConfig(), machineId: 'HX02', machineName: 'FreshTouch HX02 - Zona 10' };
  store.save(cfg);
  const loaded = store.load();
  assert.equal(loaded.machineName, 'FreshTouch HX02 - Zona 10');
  assert.deepEqual(loaded.prices, cfg.prices);
});

test('persistencia sobrevive un store nuevo sobre el mismo backend (simula cierre/reapertura de la app)', () => {
  const backend = createInMemoryStorage();
  const storeA = createMachineConfigStore({ storage: backend });
  storeA.save({ ...loadMockMachineConfig(), machineId: 'HX02' });

  // Un store nuevo, mismo backend == "reabrir la app" en un navegador
  // real, donde localStorage sí sobrevive el cierre.
  const storeB = createMachineConfigStore({ storage: backend });
  assert.equal(storeB.isProvisioned(), true);
  assert.equal(storeB.load().machineId, 'HX02');
});

test('actualización: guardar de nuevo sobre la misma máquina reemplaza los valores previos', () => {
  const store = freshStore();
  store.save({ ...loadMockMachineConfig(), machineId: 'HX02', prices: { basic: 20, premium: 35 } });
  store.save({ ...loadMockMachineConfig(), machineId: 'HX02', prices: { basic: 25, premium: 40 } });
  assert.deepEqual(store.load().prices, { basic: 25, premium: 40 });
});

test('configuración de diferentes máquinas: HX02 y HX03 se guardan y recuperan de forma independiente', () => {
  const store = freshStore();
  store.save({ ...loadMockMachineConfig(), machineId: 'HX02', machineName: 'FreshTouch HX02' });
  store.save({ ...loadMockMachineConfig(), machineId: 'HX03', machineName: 'FreshTouch HX03' });

  assert.equal(store.load('HX02').machineName, 'FreshTouch HX02');
  assert.equal(store.load('HX03').machineName, 'FreshTouch HX03');
  // La activa es la última guardada, pero HX02 sigue recuperable por id.
  assert.equal(store.getActiveMachineId(), 'HX03');
  assert.deepEqual(store.listMachineIds().sort(), ['HX02', 'HX03']);
});

test('reset() de la máquina activa la deja sin configuración guardada otra vez', () => {
  const store = freshStore();
  store.save({ ...loadMockMachineConfig(), machineId: 'HX02' });
  store.reset();
  assert.equal(store.isProvisioned(), false);
  assert.equal(store.load(), null);
});

test('reset() de una máquina no afecta la configuración guardada de otra', () => {
  const store = freshStore();
  store.save({ ...loadMockMachineConfig(), machineId: 'HX02' });
  store.save({ ...loadMockMachineConfig(), machineId: 'HX03' });
  store.reset('HX02');
  assert.equal(store.load('HX02'), null);
  assert.equal(store.load('HX03').machineId, 'HX03');
});

test('save() rechaza (vía el contrato) una configuración incompleta o con un secreto colado', () => {
  const store = freshStore();
  assert.throws(() => store.save({ machineId: 'HX02' }), /faltan campos/);
  assert.throws(
    () => store.save({ ...loadMockMachineConfig(), machineId: 'HX02', cuboApiKey: 'no-deberia-estar-aqui' }),
    /no debe contener secretos/
  );
});
