import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATES, canRunCycle, createOperationSession } from '../src/operationState/operationStateMachine.js';

test('estado inicial es IDLE', () => {
  const session = createOperationSession();
  assert.equal(session.getState(), STATES.IDLE);
});

test('recorrido feliz completo: IDLE -> ... -> CYCLE_FINISHED -> IDLE', () => {
  const session = createOperationSession();
  const seen = [];
  session.onTransition(({ to }) => seen.push(to));

  session.send('SELECT_SERVICE');
  session.send('REQUEST_PAYMENT');
  session.send('PAYMENT_APPROVED');
  session.send('CONFIRM_READY');
  session.send('OPEN_DOOR');
  session.send('START_CYCLE');
  session.send('CYCLE_DONE');
  session.send('RETURN_TO_IDLE');

  assert.deepEqual(seen, [
    STATES.SERVICE_SELECTED,
    STATES.WAITING_PAYMENT,
    STATES.PAYMENT_APPROVED,
    STATES.READY_TO_START,
    STATES.DOOR_OPEN,
    STATES.CYCLE_RUNNING,
    STATES.CYCLE_FINISHED,
    STATES.IDLE,
  ]);
});

test('un pago rechazado regresa a SERVICE_SELECTED, no a IDLE', () => {
  const session = createOperationSession();
  session.send('SELECT_SERVICE');
  session.send('REQUEST_PAYMENT');
  session.send('PAYMENT_DECLINED');
  assert.equal(session.getState(), STATES.SERVICE_SELECTED);
});

test('un pago con error regresa a SERVICE_SELECTED', () => {
  const session = createOperationSession();
  session.send('SELECT_SERVICE');
  session.send('REQUEST_PAYMENT');
  session.send('PAYMENT_ERROR');
  assert.equal(session.getState(), STATES.SERVICE_SELECTED);
});

test('un evento no válido para el estado actual se ignora, no lanza', () => {
  const session = createOperationSession();
  const result = session.send('START_CYCLE'); // inválido desde IDLE
  assert.equal(result, false);
  assert.equal(session.getState(), STATES.IDLE);
});

test('canRunCycle: solo true en CYCLE_RUNNING', () => {
  assert.equal(canRunCycle(STATES.IDLE), false);
  assert.equal(canRunCycle(STATES.PAYMENT_APPROVED), false);
  assert.equal(canRunCycle(STATES.DOOR_OPEN), false);
  assert.equal(canRunCycle(STATES.CYCLE_RUNNING), true);
});

test('no se puede saltar de IDLE directo a CYCLE_RUNNING sin pago', () => {
  const session = createOperationSession();
  session.send('START_CYCLE');
  session.send('OPEN_DOOR');
  session.send('CYCLE_DONE');
  assert.equal(session.getState(), STATES.IDLE, 'ningún atajo debe existir para saltarse el pago');
});

test('CANCEL desde SERVICE_SELECTED regresa a IDLE', () => {
  const session = createOperationSession();
  session.send('SELECT_SERVICE');
  session.send('CANCEL');
  assert.equal(session.getState(), STATES.IDLE);
});

test('CANCEL desde WAITING_PAYMENT regresa a SERVICE_SELECTED', () => {
  const session = createOperationSession();
  session.send('SELECT_SERVICE');
  session.send('REQUEST_PAYMENT');
  session.send('CANCEL');
  assert.equal(session.getState(), STATES.SERVICE_SELECTED);
});

test('onTransition: la función de desuscripción funciona', () => {
  const session = createOperationSession();
  let calls = 0;
  const unsubscribe = session.onTransition(() => calls++);
  session.send('SELECT_SERVICE');
  unsubscribe();
  session.send('REQUEST_PAYMENT');
  assert.equal(calls, 1);
});
