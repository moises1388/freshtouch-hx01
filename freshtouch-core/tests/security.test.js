'use strict';

// Pruebas agregadas por la revisión formal de la Etapa 1 (commit
// 960592c) — una por cada corrección autorizada (1, 2, 3, 4, 5, 6). La
// deduplicación (7) vive en authorization.test.js, que es donde estaba la
// duplicación original.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createDatabase } = require('../src/db/connection');
const { seedLabData, TELEGRAM_IDS } = require('../src/db/seed');
const { assertExpectedEnvironment, DATA_DIR, CORE_ROOT } = require('../src/security');
const { setMachineStatus } = require('../src/repositories/machineRepository');
const { resolveAuthorization } = require('../src/auth/authorize');
const { handleTelegramUpdate, extractSupportedMessage } = require('../src/telegram/handleUpdate');
const { isValidWebhookSecret } = require('../src/telegram/webhookAuth');

function freshDb() {
  const db = createDatabase(':memory:');
  seedLabData(db);
  return db;
}

// ---------------------------------------------------------------------
// 1. Formas de Telegram Update no soportadas — no deben tumbar el proceso
// ---------------------------------------------------------------------

test('1a. extractSupportedMessage ignora edited_message sin lanzar', () => {
  const result = extractSupportedMessage({ edited_message: { from: { id: 'x' }, text: '/status' } });
  assert.equal(result, null);
});

test('1b. extractSupportedMessage ignora channel_post sin lanzar', () => {
  const result = extractSupportedMessage({ channel_post: { text: 'hola canal' } });
  assert.equal(result, null);
});

test('1c. extractSupportedMessage ignora callback_query sin lanzar', () => {
  const result = extractSupportedMessage({ callback_query: { from: { id: 'x' }, data: 'algo' } });
  assert.equal(result, null);
});

test('1d. extractSupportedMessage ignora un message sin texto (foto, sticker, etc.)', () => {
  const result = extractSupportedMessage({ message: { from: { id: 'x' }, photo: [{ file_id: 'abc' }] } });
  assert.equal(result, null);
});

test('1e. handleTelegramUpdate no lanza con ninguna forma de Update no soportada, y responde handled:false', () => {
  const db = freshDb();
  const unsupportedUpdates = [
    { edited_message: { from: { id: TELEGRAM_IDS.SUPER_ADMIN }, text: '/status' } },
    { channel_post: { text: '/status' } },
    { callback_query: { from: { id: TELEGRAM_IDS.SUPER_ADMIN }, data: 'x' } },
    { message: { from: { id: TELEGRAM_IDS.SUPER_ADMIN }, sticker: { file_id: 'abc' } } },
    {},
    { message: {} },
  ];
  for (const update of unsupportedUpdates) {
    assert.doesNotThrow(() => handleTelegramUpdate(db, update), `no debe lanzar con: ${JSON.stringify(update)}`);
    const result = handleTelegramUpdate(db, update);
    assert.equal(result.handled, false);
  }
});

// ---------------------------------------------------------------------
// 2. createDatabase debe rechazar rutas fuera de freshtouch-core/data/
// ---------------------------------------------------------------------

test('2. createDatabase rechaza una ruta de base de datos fuera de data/', () => {
  const outsidePath = path.join(require('node:os').tmpdir(), 'freshtouch-core-security-test-outside.db');
  assert.throws(
    () => createDatabase(outsidePath),
    /fuera de lo permitido/,
    'createDatabase debe rechazar una ruta fuera de freshtouch-core/data/, no solo tenerlo documentado'
  );
  // No debe haber creado el archivo si lo rechazó antes de abrirlo.
  assert.equal(fs.existsSync(outsidePath), false);
});

test('2b. createDatabase acepta :memory: y una ruta real dentro de data/', () => {
  assert.doesNotThrow(() => createDatabase(':memory:'));

  const insidePath = path.join(DATA_DIR, 'security-test-inside.db');
  try {
    assert.doesNotThrow(() => createDatabase(insidePath));
  } finally {
    if (fs.existsSync(insidePath)) fs.rmSync(insidePath);
  }
});

// ---------------------------------------------------------------------
// 3. assertExpectedEnvironment aplicado en los puntos de entrada reales
// ---------------------------------------------------------------------

test('3a. assertExpectedEnvironment(root) rechaza un directorio sin CORE.md', () => {
  const fakeRoot = require('node:os').tmpdir();
  assert.throws(() => assertExpectedEnvironment(fakeRoot), /No se encontró/);
});

test('3b. assertExpectedEnvironment() sin argumentos pasa en el entorno real', () => {
  assert.doesNotThrow(() => assertExpectedEnvironment());
});

test('3c. createDatabase() y handleTelegramUpdate() se niegan a operar si falta CORE.md (no solo demo.js)', () => {
  const coreMdPath = path.join(CORE_ROOT, 'CORE.md');
  const backup = fs.readFileSync(coreMdPath, 'utf8');
  const db = freshDb(); // creado ANTES de quitar el marcador — sigue siendo un objeto válido para pasarle a handleTelegramUpdate
  fs.rmSync(coreMdPath);
  try {
    assert.throws(() => createDatabase(':memory:'), /No se encontró/, 'createDatabase debe exigir el marcador de entorno');
    assert.throws(
      () => handleTelegramUpdate(db, { message: { from: { id: TELEGRAM_IDS.SUPER_ADMIN }, text: '/status' } }),
      /No se encontró/,
      'handleTelegramUpdate debe exigir el marcador de entorno, no solo demo.js'
    );
  } finally {
    fs.writeFileSync(coreMdPath, backup);
  }
});

// ---------------------------------------------------------------------
// 4. machine.status: una máquina suspendida no es "disponible" para
//    owner/tenant/technician, pero super_admin sabe que existe
// ---------------------------------------------------------------------

test('4a. owner con permiso explícito sobre una máquina suspendida (HX03) no la ve como disponible', () => {
  const db = freshDb();
  const auth = resolveAuthorization(db, TELEGRAM_IDS.OWNER_HX02);
  assert.ok(!auth.allowedMachineIds.includes('HX03'), 'HX03 (suspendida) no debe estar en allowedMachineIds');
  assert.ok(auth.suspendedMachineIds.includes('HX03'), 'sí debe quedar registrada como suspendida para este usuario');
});

test('4b. el texto de /status del owner NO menciona HX03 en absoluto (no es "disponible")', () => {
  const db = freshDb();
  const result = handleTelegramUpdate(db, { message: { from: { id: TELEGRAM_IDS.OWNER_HX02 }, text: '/status' } });
  assert.ok(!result.text.includes('HX03'), `la respuesta a un owner no debe mencionar una máquina suspendida, fue: ${result.text}`);
});

test('4c. super_admin SÍ puede identificar que HX03 existe y está suspendida', () => {
  const db = freshDb();
  const result = handleTelegramUpdate(db, { message: { from: { id: TELEGRAM_IDS.SUPER_ADMIN }, text: '/status' } });
  assert.ok(result.text.includes('HX03'), 'super_admin debe ver que HX03 existe');
  assert.ok(/HX03.*suspendida|suspendida[\s\S]*HX03/.test(result.text), `debe quedar claro que HX03 está suspendida, fue: ${result.text}`);
});

test('4d. suspender una máquina no borra su historial (la fila sigue existiendo, solo cambia status)', () => {
  const db = freshDb();
  const before = db.prepare('SELECT COUNT(*) as n FROM machine').get().n;
  setMachineStatus(db, 'HX02', 'suspended');
  const after = db.prepare('SELECT COUNT(*) as n FROM machine').get().n;
  assert.equal(before, after, 'suspender no debe eliminar ninguna fila de machine');
  const row = db.prepare('SELECT * FROM machine WHERE id = ?').get('HX02');
  assert.equal(row.status, 'suspended');
  assert.equal(row.name, 'FreshTouch HX02', 'el resto de los datos de la máquina permanece intacto');
});

// ---------------------------------------------------------------------
// 5. Preparación (no activación) de la autenticidad del webhook
// ---------------------------------------------------------------------

test('5a. isValidWebhookSecret acepta cuando el secreto coincide exactamente (datos ficticios)', () => {
  assert.equal(isValidWebhookSecret('secreto-de-prueba-123', 'secreto-de-prueba-123'), true);
});

test('5b. isValidWebhookSecret rechaza un secreto distinto', () => {
  assert.equal(isValidWebhookSecret('secreto-incorrecto', 'secreto-de-prueba-123'), false);
});

test('5c. isValidWebhookSecret rechaza vacíos, undefined, y tipos no-string', () => {
  assert.equal(isValidWebhookSecret('', 'secreto-de-prueba-123'), false);
  assert.equal(isValidWebhookSecret('secreto-de-prueba-123', ''), false);
  assert.equal(isValidWebhookSecret(undefined, 'secreto-de-prueba-123'), false);
  assert.equal(isValidWebhookSecret(123, 'secreto-de-prueba-123'), false);
});

test('5d. isValidWebhookSecret rechaza cuando el proporcionado tiene distinta longitud (sin lanzar)', () => {
  assert.doesNotThrow(() => isValidWebhookSecret('corto', 'un-secreto-mucho-mas-largo'));
  assert.equal(isValidWebhookSecret('corto', 'un-secreto-mucho-mas-largo'), false);
});

// ---------------------------------------------------------------------
// 6. Rol technician respeta exactamente su alcance
// ---------------------------------------------------------------------

test('6a. technician solamente puede consultar las máquinas que tiene explícitamente permitidas (HX01)', () => {
  const db = freshDb();
  const auth = resolveAuthorization(db, TELEGRAM_IDS.TECHNICIAN);
  assert.equal(auth.authorized, true);
  assert.deepEqual(auth.allowedMachineIds, ['HX01']);
});

test('6b. technician no ve HX02 en su /status', () => {
  const db = freshDb();
  const result = handleTelegramUpdate(db, { message: { from: { id: TELEGRAM_IDS.TECHNICIAN }, text: '/status' } });
  assert.equal(result.authorized, true);
  assert.ok(!result.text.includes('HX02'), `technician no debe ver HX02, fue: ${result.text}`);
  assert.ok(result.text.includes('HX01'));
});
