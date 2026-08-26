// Portado desde freshtouch-hx02-cubo-lab/tests/cuboCardProvider.test.js.
//
// Adaptación deliberada respecto al original (ver la nota de cabecera en
// src/payment/cuboCardProvider.js): el lab espera que requestCycle()
// lance Esp32NotImplementedError tras autorizar — aquí requestCycle() no
// toca nada de esp32/ (arquitectura de esta fase: PaymentProvider y ESP32
// son ramas separadas colgando de operationState, no una llamando a la
// otra), así que un requestCycle() autorizado devuelve
// { authorized: true, service } en vez de lanzar. Todo lo demás —
// incluyendo que un segundo requestCycle() para el mismo pago se
// rechace— es idéntico al comportamiento ya validado en el lab.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCuboCardProvider } from '../src/payment/cuboCardProvider.js';
import { STATES } from '../src/payment/paymentStateMachine.js';
import { CUBO_EVENTS, CUBO_ERROR_TYPES } from '../src/payment/cubo/cuboEvents.js';

const machineConfig = { machineId: 'HX02-TEST', cuboPosId: 'POS-TEST', currency: 'GTQ' };
const service = { label: 'BASIC', amount: 20 };

function newProvider() {
  return createCuboCardProvider({ mode: 'mock', machineConfig });
}

async function connected(provider, mockOutcome) {
  provider.selectService({ ...service, mockOutcome });
  await provider.connectPos();
  return provider;
}

test('happy path: select -> connect -> createPayment(SUCCESS) -> canStartCycle true -> requestCycle authorizes and consumes', async () => {
  const provider = await connected(newProvider(), 'SUCCESS');
  assert.equal(provider.getStatus(), STATES.POS_CONNECTED);

  await provider.createPayment();
  assert.equal(provider.getStatus(), STATES.PAYMENT_SUCCESS);
  assert.equal(provider.canStartCycle(), true);

  const result = provider.requestCycle();
  assert.deepEqual(result, { authorized: true, service: { ...service, mockOutcome: 'SUCCESS' } });
  assert.equal(provider.getStatus(), STATES.CYCLE_IN_PROGRESS);
});

// Cada resultado no-exitoso que el mock puede producir: ninguno puede
// autorizar jamás un ciclo.
const nonSuccessOutcomes = ['DECLINED', 'ERROR'];
for (const outcome of nonSuccessOutcomes) {
  test(`outcome=${outcome}: canStartCycle stays false and requestCycle refuses`, async () => {
    const provider = await connected(newProvider(), outcome);
    await provider.createPayment();

    assert.equal(provider.canStartCycle(), false);
    assert.throws(() => provider.requestCycle(), /requestCycle\(\) rechazado/);
  });
}

test('CUBO_EVENTS.ERROR: propagates type and message from the adapter event, not a nonexistent "code" field', async () => {
  const provider = await connected(newProvider(), 'ERROR');

  const errorSnapshot = await new Promise((resolve) => {
    provider.onResult((snap) => {
      if (snap.event === CUBO_EVENTS.ERROR) resolve(snap);
    });
    provider.createPayment();
  });

  assert.equal(errorSnapshot.type, CUBO_ERROR_TYPES.SDK_ERROR);
  assert.equal(errorSnapshot.message, 'Simulated SDK error (mock).');
  assert.equal(errorSnapshot.code, undefined, 'no debe seguir emitiendo un campo "code" que Cubo nunca envía');
});

test('outcome=PENDING: does not transition, does not authorize, and does not retry automatically', async () => {
  const provider = await connected(newProvider(), 'PENDING');
  const pendingSnapshot = await new Promise((resolve) => {
    provider.onResult((snap) => {
      if (snap.event === 'payment_pending') resolve(snap);
    });
    provider.createPayment();
  });

  assert.ok(pendingSnapshot.message);
  // Fail-closed: se queda donde CARD_DETECTED la dejó, nunca SUCCESS.
  assert.equal(provider.getStatus(), STATES.PROCESSING_PAYMENT);
  assert.equal(provider.canStartCycle(), false);
  assert.throws(() => provider.requestCycle(), /requestCycle\(\) rechazado/);
});

test('connectPos before selectService throws', async () => {
  const provider = newProvider();
  await assert.rejects(() => provider.connectPos());
});

test('createPayment before connectPos throws and never reaches a payable state', async () => {
  const provider = newProvider();
  provider.selectService(service);
  await assert.rejects(() => provider.createPayment());
  assert.equal(provider.canStartCycle(), false);
});

test('disconnect after connecting but before payment ends in PAYMENT_ERROR, not authorized', async () => {
  const provider = await connected(newProvider(), 'SUCCESS');
  await provider.disconnectPos();

  assert.equal(provider.getStatus(), STATES.PAYMENT_ERROR);
  assert.equal(provider.canStartCycle(), false);
  assert.throws(() => provider.requestCycle(), /requestCycle\(\) rechazado/);
});

test('cancelPayment mid-flow moves to PAYMENT_CANCELLED, blocks the cycle, and stops the in-flight request', async () => {
  const provider = await connected(newProvider(), 'SUCCESS');

  const paymentPromise = provider.createPayment();
  assert.equal(provider.getStatus(), STATES.WAITING_FOR_CARD);

  let cancelSnapshot;
  provider.onResult((snap) => {
    if (snap.event === 'cancelled_locally') cancelSnapshot = snap;
  });
  provider.cancelPayment();
  assert.equal(provider.getStatus(), STATES.PAYMENT_CANCELLED);
  assert.equal(provider.canStartCycle(), false);
  assert.equal(cancelSnapshot.realCancelAccepted, true);

  await paymentPromise;
  assert.equal(provider.getStatus(), STATES.PAYMENT_CANCELLED);
});

test('cancelPayment outside WAITING_FOR_CARD/PROCESSING_PAYMENT throws', () => {
  const provider = newProvider();
  assert.throws(() => provider.cancelPayment(), /has nothing to cancel/);
});

test('retryPayment after a failure reuses the still-live POS connection without reconnecting', async () => {
  const provider = await connected(newProvider(), 'ERROR');
  await provider.createPayment();
  assert.equal(provider.getStatus(), STATES.PAYMENT_ERROR);

  let connectingSeen = false;
  provider.onResult((snap) => {
    if (snap.event === 'connecting') connectingSeen = true;
  });

  await provider.retryPayment();
  assert.equal(provider.getStatus(), STATES.POS_CONNECTED);
  assert.equal(connectingSeen, false);

  provider.selectService({ ...service, mockOutcome: 'SUCCESS' });
  await provider.createPayment();
  assert.equal(provider.getStatus(), STATES.PAYMENT_SUCCESS);
});

test('retryPayment reconnects if the POS actually disconnected in the meantime', async () => {
  const provider = await connected(newProvider(), 'ERROR');
  await provider.createPayment();
  assert.equal(provider.getStatus(), STATES.PAYMENT_ERROR);

  await provider.disconnectPos();

  let connectingSeen = false;
  provider.onResult((snap) => {
    if (snap.event === 'connecting') connectingSeen = true;
  });
  await provider.retryPayment();
  assert.equal(connectingSeen, true);
  assert.equal(provider.getStatus(), STATES.POS_CONNECTED);
});

test('retryPayment outside a failure state throws', async () => {
  const provider = await connected(newProvider(), 'SUCCESS');
  await assert.rejects(() => provider.retryPayment(), /has nothing to retry/);
});

// --- Un pago, un ciclo (requisito #1-#3 de la autorización) ---

test('a successful payment authorizes exactly one cycle; a second requestCycle() for the same payment is refused', async () => {
  const provider = await connected(newProvider(), 'SUCCESS');
  await provider.createPayment();
  assert.equal(provider.canStartCycle(), true);

  const result = provider.requestCycle();
  assert.equal(result.authorized, true);
  assert.equal(provider.getStatus(), STATES.CYCLE_IN_PROGRESS);
  assert.equal(provider.canStartCycle(), false);

  // Segunda llamada, mismo pago, nada nuevo pasó: debe rechazarse, NUNCA
  // tratarse como todavía autorizado.
  assert.throws(() => provider.requestCycle(), /requestCycle\(\) rechazado/);
});

test('declined, cancelled, and pending payments never authorize a cycle', async () => {
  for (const outcome of ['DECLINED', 'ERROR']) {
    const provider = await connected(newProvider(), outcome);
    await provider.createPayment();
    assert.equal(provider.canStartCycle(), false);
    assert.throws(() => provider.requestCycle(), /requestCycle\(\) rechazado/);
  }

  const pendingProvider = await connected(newProvider(), 'PENDING');
  await new Promise((resolve) => {
    pendingProvider.onResult((snap) => {
      if (snap.event === 'payment_pending') resolve();
    });
    pendingProvider.createPayment();
  });
  assert.equal(pendingProvider.canStartCycle(), false);
  assert.throws(() => pendingProvider.requestCycle(), /requestCycle\(\) rechazado/);
});

test('retrying after a failure does not carry over or improperly grant cycle authorization', async () => {
  const provider = await connected(newProvider(), 'ERROR');
  await provider.createPayment();
  assert.equal(provider.getStatus(), STATES.PAYMENT_ERROR);
  assert.equal(provider.canStartCycle(), false);

  await provider.retryPayment();
  assert.equal(provider.canStartCycle(), false);
  assert.throws(() => provider.requestCycle(), /requestCycle\(\) rechazado/);

  provider.selectService({ ...service, mockOutcome: 'SUCCESS' });
  await provider.createPayment();
  assert.equal(provider.canStartCycle(), true);
  const result = provider.requestCycle();
  assert.equal(result.authorized, true);
  assert.equal(provider.canStartCycle(), false);
});

test('reportCycleComplete() returns to IDLE and the next customer can pay again without reconnecting', async () => {
  const provider = await connected(newProvider(), 'SUCCESS');
  await provider.createPayment();
  provider.requestCycle();
  assert.equal(provider.getStatus(), STATES.CYCLE_IN_PROGRESS);

  provider.reportCycleComplete();
  assert.equal(provider.getStatus(), STATES.IDLE);
  assert.equal(provider.canStartCycle(), false);

  // Siguiente cliente: seleccionar servicio, conectar (debe reutilizar la
  // conexión POS todavía viva, sin nuevo emparejamiento Bluetooth), pagar
  // de nuevo.
  let connectingSeen = false;
  provider.onResult((snap) => {
    if (snap.event === 'connecting') connectingSeen = true;
  });
  provider.selectService({ ...service, mockOutcome: 'SUCCESS' });
  await provider.connectPos();
  assert.equal(connectingSeen, false);
  assert.equal(provider.getStatus(), STATES.POS_CONNECTED);

  await provider.createPayment();
  assert.equal(provider.canStartCycle(), true);
});

test('reportCycleComplete() outside CYCLE_IN_PROGRESS throws', () => {
  const provider = newProvider();
  assert.throws(() => provider.reportCycleComplete(), /no cycle is in progress/);
});

test('onResult unsubscribe stops further notifications', async () => {
  const provider = newProvider();
  let calls = 0;
  const unsubscribe = provider.onResult(() => {
    calls++;
  });
  await connected(provider, 'SUCCESS');
  unsubscribe();
  const before = calls;
  await provider.createPayment();
  assert.equal(calls, before);
});

// --- Rebuild del proveedor: un proveedor descartado no debe seguir
// afectando a uno nuevo. Cada createCuboCardProvider() crea su PROPIO
// adaptador y su PROPIO Set de resultHandlers — esto confirma que no hay
// estado compartido accidental entre instancias (el hallazgo real de
// hardware del lab — un proveedor viejo "revivía" un estado tras
// reconstruir — se verificó ahí con Playwright/hardware real, no
// reproducible en un test de Node sin Bluetooth real; esto prueba la
// propiedad de aislamiento que sí se puede probar aquí).
test('rebuilding the provider (discard old, create new) never leaks state or notifications across instances', async () => {
  const oldProvider = await connected(newProvider(), 'SUCCESS');
  let oldProviderCalls = 0;
  oldProvider.onResult(() => {
    oldProviderCalls++;
  });
  await oldProvider.createPayment();
  assert.equal(oldProvider.getStatus(), STATES.PAYMENT_SUCCESS);
  const callsBeforeRebuild = oldProviderCalls;

  // "Rebuild": se descarta oldProvider y se crea uno nuevo, como haría
  // main.js en un reset completo.
  const newProviderInstance = newProvider();
  assert.equal(newProviderInstance.getStatus(), STATES.IDLE);
  assert.equal(newProviderInstance.canStartCycle(), false);

  await connected(newProviderInstance, 'SUCCESS');
  await newProviderInstance.createPayment();
  assert.equal(newProviderInstance.getStatus(), STATES.PAYMENT_SUCCESS);

  // El proveedor viejo, ya sin referencias activas de nadie más, no debe
  // haber recibido ninguna notificación de lo que le pasó al nuevo.
  assert.equal(oldProviderCalls, callsBeforeRebuild);
  // Y el viejo se queda exactamente donde estaba, no "revive".
  assert.equal(oldProvider.getStatus(), STATES.PAYMENT_SUCCESS);
});
