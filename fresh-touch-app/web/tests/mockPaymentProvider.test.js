import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockPaymentProvider } from '../src/payment/mockPaymentProvider.js';
import { assertImplementsPaymentContract } from '../src/payment/paymentContract.js';

const service = { label: 'BASIC', amount: 20 };

test('el mock cumple PaymentContract', () => {
  assert.doesNotThrow(() => assertImplementsPaymentContract(createMockPaymentProvider()));
});

test('assertImplementsPaymentContract rechaza un objeto incompleto', () => {
  assert.throws(() => assertImplementsPaymentContract({ selectService: () => {} }), /faltan métodos/);
});

test('flujo SUCCESS: canStartCycle solo se vuelve true tras el pago aprobado', async () => {
  const provider = createMockPaymentProvider();
  provider.selectService(service);
  await provider.connectPos();
  assert.equal(provider.canStartCycle(), false);

  await provider.createPayment({ outcome: 'SUCCESS' });
  assert.equal(provider.canStartCycle(), true);

  const result = provider.requestCycle();
  assert.equal(result.authorized, true);
});

test('flujo DECLINED: canStartCycle nunca se vuelve true', async () => {
  const provider = createMockPaymentProvider();
  provider.selectService(service);
  await provider.connectPos();
  await provider.createPayment({ outcome: 'DECLINED' });

  assert.equal(provider.canStartCycle(), false);
  assert.throws(() => provider.requestCycle());
});

test('flujo ERROR: canStartCycle nunca se vuelve true', async () => {
  const provider = createMockPaymentProvider();
  provider.selectService(service);
  await provider.connectPos();
  await provider.createPayment({ outcome: 'ERROR' });

  assert.equal(provider.canStartCycle(), false);
  assert.throws(() => provider.requestCycle());
});

test('requestCycle() sin pago aprobado siempre lanza, sin importar el estado', () => {
  const provider = createMockPaymentProvider();
  assert.throws(() => provider.requestCycle(), /nunca autorizar sin pago aprobado/);
});

test('onResult recibe cada evento intermedio, no solo el final', async () => {
  const provider = createMockPaymentProvider();
  const events = [];
  provider.onResult((snap) => events.push(snap.event));

  provider.selectService(service);
  await provider.connectPos();
  await provider.createPayment({ outcome: 'SUCCESS' });

  assert.deepEqual(events, ['service_selected', 'connecting', 'connected', 'payment_started', 'payment_approved']);
});
