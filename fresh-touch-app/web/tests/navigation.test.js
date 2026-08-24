import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATES } from '../src/operationState/operationStateMachine.js';
import { SCREEN_BY_STATE } from '../src/ui/navigation.js';

test('todo estado de operationStateMachine tiene una pantalla asignada', () => {
  for (const state of Object.values(STATES)) {
    assert.ok(SCREEN_BY_STATE[state], `falta pantalla para el estado "${state}"`);
  }
});
