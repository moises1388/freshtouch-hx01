import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCuboCardProvider } from '../src/payment/cuboCardProvider.js';
import { STATES } from '../src/payment/paymentStateMachine.js';
import { Esp32NotImplementedError } from '../src/esp32/esp32Interface.js';

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

test('happy path: select -> connect -> createPayment(SUCCESS) -> canStartCycle true -> requestCycle passes the guard', async () => {
  const provider = await connected(newProvider(), 'SUCCESS');
  assert.equal(provider.getStatus(), STATES.POS_CONNECTED);

  await provider.createPayment();
  assert.equal(provider.getStatus(), STATES.PAYMENT_SUCCESS);
  assert.equal(provider.canStartCycle(), true);
  assert.throws(() => provider.requestCycle(), Esp32NotImplementedError);
});

// Every non-success transactionResult outcome the mock can produce,
// including the real Cubo status name 'TRANSACTION_TERMINATED': none of
// them may ever authorize a cycle.
const nonSuccessOutcomes = ['DECLINED', 'CANCELLED', 'ERROR', 'TIMEOUT', 'TRANSACTION_TERMINATED'];
for (const outcome of nonSuccessOutcomes) {
  test(`outcome=${outcome}: canStartCycle stays false and requestCycle refuses`, async () => {
    const provider = await connected(newProvider(), outcome);
    await provider.createPayment();

    assert.equal(provider.canStartCycle(), false);
    assert.throws(() => provider.requestCycle(), /Refused to request cycle start/);
  });
}

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
  assert.throws(() => provider.requestCycle(), /Refused to request cycle start/);
});

test('cancelPayment mid-flow moves to PAYMENT_CANCELLED and blocks the cycle', async () => {
  const provider = await connected(newProvider(), 'SUCCESS');

  // Deliberately not awaited yet: createPayment() runs synchronously up to
  // its first internal await, so WAITING_FOR_CARD is already the state by
  // the time this line returns.
  const paymentPromise = provider.createPayment();
  assert.equal(provider.getStatus(), STATES.WAITING_FOR_CARD);

  provider.cancelPayment();
  assert.equal(provider.getStatus(), STATES.PAYMENT_CANCELLED);
  assert.equal(provider.canStartCycle(), false);

  // The mock's own timers are still running and will eventually try to
  // deliver a late SUCCESS transactionResult. The state machine correctly
  // refuses that transition (CANCELLED has no SUCCESS event), so this
  // promise rejects — that's the safety property, not a bug. Drain it so
  // it doesn't leak an unhandled rejection into later tests.
  await paymentPromise.catch(() => {});
});

test('cancelPayment outside WAITING_FOR_CARD/PROCESSING_PAYMENT throws', () => {
  const provider = newProvider();
  assert.throws(() => provider.cancelPayment(), /has nothing to cancel/);
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
