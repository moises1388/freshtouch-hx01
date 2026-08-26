import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setApiKey, getApiKey, hasApiKey, clearApiKey } from '../src/payment/cubo/apiKeySession.js';

test('sin setApiKey(), hasApiKey() es false y getApiKey() es null', () => {
  clearApiKey();
  assert.equal(hasApiKey(), false);
  assert.equal(getApiKey(), null);
});

test('setApiKey() la deja disponible en memoria para la sesión', () => {
  setApiKey('clave-de-prueba-no-real');
  assert.equal(hasApiKey(), true);
  assert.equal(getApiKey(), 'clave-de-prueba-no-real');
  clearApiKey();
});

test('setApiKey("") se trata igual que no configurada', () => {
  setApiKey('');
  assert.equal(hasApiKey(), false);
  assert.equal(getApiKey(), null);
});

test('clearApiKey() la borra', () => {
  setApiKey('otra-clave-de-prueba');
  clearApiKey();
  assert.equal(hasApiKey(), false);
  assert.equal(getApiKey(), null);
});
