// Portado desde freshtouch-hx02-cubo-lab/tests/paymentStateMachine.test.js
// — mismos casos, solo cambia la ruta de import.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATES,
  transition,
  canStartCycle,
  createPaymentSession,
} from '../src/payment/paymentStateMachine.js';

test('happy path IDLE -> ... -> PAYMENT_SUCCESS', () => {
  const session = createPaymentSession();
  session.send('SELECT_SERVICE');
  session.send('SELECT_CARD_PAYMENT');
  session.send('CONNECT_POS');
  session.send('POS_CONNECTED');
  session.send('START_PAYMENT');
  session.send('CARD_DETECTED');
  session.send('SUCCESS');
  assert.equal(session.getState(), STATES.PAYMENT_SUCCESS);
  assert.equal(session.canStartCycle(), true);
});

test('declined path never reaches PAYMENT_SUCCESS', () => {
  const session = createPaymentSession();
  session.send('SELECT_SERVICE');
  session.send('SELECT_CARD_PAYMENT');
  session.send('CONNECT_POS');
  session.send('POS_CONNECTED');
  session.send('START_PAYMENT');
  session.send('CARD_DETECTED');
  session.send('DECLINED');
  assert.equal(session.getState(), STATES.PAYMENT_DECLINED);
  assert.equal(session.canStartCycle(), false);
});

test('cancel from WAITING_FOR_CARD', () => {
  const session = createPaymentSession();
  session.send('SELECT_SERVICE');
  session.send('SELECT_CARD_PAYMENT');
  session.send('CONNECT_POS');
  session.send('POS_CONNECTED');
  session.send('START_PAYMENT');
  session.send('CANCEL');
  assert.equal(session.getState(), STATES.PAYMENT_CANCELLED);
});

test('timeout from PROCESSING_PAYMENT', () => {
  const session = createPaymentSession();
  session.send('SELECT_SERVICE');
  session.send('SELECT_CARD_PAYMENT');
  session.send('CONNECT_POS');
  session.send('POS_CONNECTED');
  session.send('START_PAYMENT');
  session.send('CARD_DETECTED');
  session.send('TIMEOUT');
  assert.equal(session.getState(), STATES.PAYMENT_TIMEOUT);
});

test('invalid transition throws instead of silently moving state', () => {
  assert.throws(() => transition(STATES.IDLE, 'SUCCESS'));
  assert.throws(() => transition(STATES.WAITING_FOR_CARD, 'SELECT_SERVICE'));
});

test('PAYMENT_SUCCESS -> START_CYCLE -> CYCLE_IN_PROGRESS -> CYCLE_COMPLETE -> IDLE, and the cycle cannot be started twice', () => {
  const session = createPaymentSession();
  session.send('SELECT_SERVICE');
  session.send('SELECT_CARD_PAYMENT');
  session.send('CONNECT_POS');
  session.send('POS_CONNECTED');
  session.send('START_PAYMENT');
  session.send('CARD_DETECTED');
  session.send('SUCCESS');
  assert.equal(session.canStartCycle(), true);

  session.send('START_CYCLE');
  assert.equal(session.getState(), STATES.CYCLE_IN_PROGRESS);
  // El punto central: una vez consumido, el mismo pago nunca puede
  // autorizar un segundo ciclo — canStartCycle() es una función pura del
  // estado, y este estado ya no es PAYMENT_SUCCESS.
  assert.equal(session.canStartCycle(), false);
  assert.throws(() => transition(STATES.CYCLE_IN_PROGRESS, 'START_CYCLE'));

  session.send('CYCLE_COMPLETE');
  assert.equal(session.getState(), STATES.IDLE);
  assert.equal(session.canStartCycle(), false);
});

test('RESET is available from CYCLE_IN_PROGRESS', () => {
  assert.equal(transition(STATES.CYCLE_IN_PROGRESS, 'RESET'), STATES.IDLE);
});

test('PAYMENT_SUCCESS -> ACKNOWLEDGE -> IDLE never passes through CYCLE_IN_PROGRESS, and consumes the authorization', () => {
  const session = createPaymentSession();
  session.send('SELECT_SERVICE');
  session.send('SELECT_CARD_PAYMENT');
  session.send('CONNECT_POS');
  session.send('POS_CONNECTED');
  session.send('START_PAYMENT');
  session.send('CARD_DETECTED');
  session.send('SUCCESS');
  assert.equal(session.canStartCycle(), true);

  session.send('ACKNOWLEDGE');
  assert.equal(session.getState(), STATES.IDLE);
  assert.equal(session.canStartCycle(), false);
  // Nunca pasó por CYCLE_IN_PROGRESS — no se simuló un ciclo.
  assert.notEqual(session.getHistory().includes(STATES.CYCLE_IN_PROGRESS), true);
});

test('ACKNOWLEDGE and START_CYCLE are mutually exclusive for the same payment', () => {
  assert.equal(transition(STATES.PAYMENT_SUCCESS, 'ACKNOWLEDGE'), STATES.IDLE);
  // Una vez en IDLE (ya sea por ACKNOWLEDGE o por START_CYCLE), ninguno de
  // los dos vuelve a ser válido para ese mismo pago.
  assert.throws(() => transition(STATES.IDLE, 'ACKNOWLEDGE'));
  assert.throws(() => transition(STATES.IDLE, 'START_CYCLE'));
});

test('a terminal error/decline/cancel/timeout state can RESET back to IDLE', () => {
  for (const state of [
    STATES.PAYMENT_DECLINED,
    STATES.PAYMENT_CANCELLED,
    STATES.PAYMENT_ERROR,
    STATES.PAYMENT_TIMEOUT,
  ]) {
    assert.equal(transition(state, 'RESET'), STATES.IDLE);
  }
});

for (const state of Object.values(STATES)) {
  test(`canStartCycle(${state}) is ${state === STATES.PAYMENT_SUCCESS}`, () => {
    assert.equal(canStartCycle(state), state === STATES.PAYMENT_SUCCESS);
  });
}
