import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockCuboAdapter } from '../src/cubo/mockCuboAdapter.js';

const machineConfig = { machineId: 'HX02-TEST', cuboPosId: 'POS-TEST' };

test('connect() emits connected and flips isConnected', async () => {
  const adapter = createMockCuboAdapter({ machineConfig, simulatedLatencyMs: 1 });
  let fired = false;
  adapter.on('connected', () => (fired = true));
  await adapter.connect();
  assert.equal(fired, true);
  assert.equal(adapter.isConnected(), true);
});

test('disconnect() emits disconnected and flips isConnected back', async () => {
  const adapter = createMockCuboAdapter({ machineConfig, simulatedLatencyMs: 1 });
  await adapter.connect();
  let fired = false;
  adapter.on('disconnected', () => (fired = true));
  await adapter.disconnect();
  assert.equal(fired, true);
  assert.equal(adapter.isConnected(), false);
});

test('startPayment before connect throws (POS not found / not connected)', async () => {
  const adapter = createMockCuboAdapter({ machineConfig, simulatedLatencyMs: 1 });
  await assert.rejects(() =>
    adapter.startPayment({ amount: 2000, currencyCode: '0320', currencySymbol: 'Q' })
  );
});

const outcomes = ['SUCCESS', 'DECLINED', 'CANCELLED', 'ERROR', 'TIMEOUT'];
for (const outcome of outcomes) {
  test(`startPayment outcome=${outcome} emits a matching transactionResult`, async () => {
    const adapter = createMockCuboAdapter({ machineConfig, simulatedLatencyMs: 1 });
    await adapter.connect();
    const result = await new Promise((resolve) => {
      adapter.on('transactionResult', resolve);
      adapter.startPayment({ amount: 2000, currencyCode: '0320', currencySymbol: 'Q', outcome });
    });
    assert.equal(result.status, outcome);
    if (outcome === 'SUCCESS') {
      assert.ok(result.transactionId);
      assert.ok(result.referenceId);
      assert.ok(result.authorizationCode);
      assert.ok(result.timestamp);
    }
  });
}

test('SUCCESS result never includes card number, cvv or pin fields', async () => {
  const adapter = createMockCuboAdapter({ machineConfig, simulatedLatencyMs: 1 });
  await adapter.connect();
  const result = await new Promise((resolve) => {
    adapter.on('transactionResult', resolve);
    adapter.startPayment({ amount: 2000, currencyCode: '0320', currencySymbol: 'Q', outcome: 'SUCCESS' });
  });
  const keys = Object.keys(result).join(',').toLowerCase();
  assert.doesNotMatch(keys, /card|pan|cvv|pin/);
});
