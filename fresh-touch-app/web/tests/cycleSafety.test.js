import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertCanStartCycle, CycleStartRefusedError } from '../src/esp32/cycleSafety.js';
import { STATES, createOperationSession } from '../src/operationState/operationStateMachine.js';

test('assertCanStartCycle NO lanza cuando el estado es CYCLE_RUNNING', () => {
  assert.doesNotThrow(() => assertCanStartCycle(STATES.CYCLE_RUNNING));
});

test('assertCanStartCycle lanza CycleStartRefusedError para cualquier otro estado', () => {
  for (const state of Object.values(STATES)) {
    if (state === STATES.CYCLE_RUNNING) continue;
    assert.throws(() => assertCanStartCycle(state), CycleStartRefusedError, `no debería permitir arrancar desde ${state}`);
  }
});

test('fail-closed de extremo a extremo: sin pago aprobado, el recorrido real de operationState nunca llega a un estado que apruebe el ciclo', () => {
  const op = createOperationSession();
  op.send('SELECT_SERVICE');
  op.send('REQUEST_PAYMENT');
  // Nunca se envía PAYMENT_APPROVED — el pago nunca se confirmó.
  assert.throws(() => assertCanStartCycle(op.getState()), CycleStartRefusedError);
});

test('recorrido feliz: tras PAYMENT_APPROVED -> CONFIRM_READY -> OPEN_DOOR -> START_CYCLE, assertCanStartCycle no lanza', () => {
  const op = createOperationSession();
  op.send('SELECT_SERVICE');
  op.send('REQUEST_PAYMENT');
  op.send('PAYMENT_APPROVED');
  op.send('CONFIRM_READY');
  op.send('OPEN_DOOR');
  op.send('START_CYCLE');
  assert.doesNotThrow(() => assertCanStartCycle(op.getState()));
});
