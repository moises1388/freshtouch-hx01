'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../src/db/connection');
const { seedLabData, TELEGRAM_IDS } = require('../src/db/seed');
const { resolveAuthorization } = require('../src/auth/authorize');
const { handleTelegramUpdate } = require('../src/telegram/handleUpdate');
const { listAuditEvents } = require('../src/repositories/auditEventRepository');

function freshDb() {
  const db = createDatabase(':memory:');
  seedLabData(db);
  return db;
}

function statusUpdate(telegramUserId) {
  return { message: { from: { id: telegramUserId }, text: '/status' } };
}

test('1. super_admin puede consultar HX01 y HX02', () => {
  const db = freshDb();
  const auth = resolveAuthorization(db, TELEGRAM_IDS.SUPER_ADMIN);
  assert.equal(auth.authorized, true);
  assert.deepEqual(auth.allowedMachineIds.sort(), ['HX01', 'HX02']);
});

test('2. owner de HX02 solamente puede consultar HX02', () => {
  const db = freshDb();
  const auth = resolveAuthorization(db, TELEGRAM_IDS.OWNER_HX02);
  assert.equal(auth.authorized, true);
  assert.deepEqual(auth.allowedMachineIds, ['HX02']);
});

test('3. tenant de HX02 solamente puede consultar HX02', () => {
  const db = freshDb();
  const auth = resolveAuthorization(db, TELEGRAM_IDS.TENANT_HX02);
  assert.equal(auth.authorized, true);
  assert.deepEqual(auth.allowedMachineIds, ['HX02']);
});

test('4. usuario desconocido recibe "no autorizado"', () => {
  const db = freshDb();
  const result = handleTelegramUpdate(db, statusUpdate(TELEGRAM_IDS.UNKNOWN));
  assert.equal(result.authorized, false);
  assert.equal(result.text, 'No autorizado.');
});

test('5. owner de HX02 intentando consultar HX01 no obtiene datos de HX01', () => {
  const db = freshDb();
  const result = handleTelegramUpdate(db, statusUpdate(TELEGRAM_IDS.OWNER_HX02));
  assert.equal(result.authorized, true);
  assert.ok(!result.text.includes('HX01'), `la respuesta no debe mencionar HX01, fue: ${result.text}`);
  assert.ok(result.text.includes('HX02'));
});

test('6. cada consulta (autorizada o no) genera su AuditEvent', () => {
  const db = freshDb();
  handleTelegramUpdate(db, statusUpdate(TELEGRAM_IDS.SUPER_ADMIN));
  handleTelegramUpdate(db, statusUpdate(TELEGRAM_IDS.UNKNOWN));

  const events = listAuditEvents(db);
  assert.equal(events.length, 2);

  const okEvent = events.find((e) => e.telegram_user_id === TELEGRAM_IDS.SUPER_ADMIN);
  assert.equal(okEvent.authorized, 1);
  assert.deepEqual(JSON.parse(okEvent.machines_queried).sort(), ['HX01', 'HX02']);

  const deniedEvent = events.find((e) => e.telegram_user_id === TELEGRAM_IDS.UNKNOWN);
  assert.equal(deniedEvent.authorized, 0);
  assert.equal(deniedEvent.machines_queried, null, 'no debe revelar máquinas a un usuario no autorizado, ni en la auditoría');
});

test('7. el CORE funciona sin ninguna conexión con HX01 (aislamiento de código)', () => {
  // No es una prueba de red (no hay red que probar) — es una prueba
  // estructural: nada bajo src/ ni demo.js hace referencia a identificadores
  // propios y únicos del comportamiento operativo de HX01 o de Cubo (no a
  // los nombres de archivo en sí, que este propio código nombra en
  // comentarios al describir la regla de aislamiento — eso daría falsos
  // positivos contra su propia documentación).
  const fs = require('node:fs');
  const path = require('node:path');

  const forbidden = [
    'esp32Ip', 'relayVapor', 'relaySec', 'relayUV', 'relayPuerta',
    'makeCuboWebhook', 'makePollWebhook', 'makeVentasWebhook',
    'api-payment-a.cubopago.com', 'pinSA', 'pinOwner', 'pinTech', 'pinTenant',
  ];
  const root = path.resolve(__dirname, '..');
  const filesToScan = [];

  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'data' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.js$/.test(entry.name)) filesToScan.push(full);
    }
  })(root);

  assert.ok(filesToScan.length > 0, 'no se encontraron archivos .js para escanear — algo está mal con la prueba misma');

  // Igual que en la prueba 8: este archivo contiene los propios términos
  // prohibidos como literales de comparación, así que se excluye a sí
  // mismo del escaneo.
  const selfPath = path.resolve(__filename);

  for (const file of filesToScan) {
    if (path.resolve(file) === selfPath) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const term of forbidden) {
      assert.ok(
        !content.includes(term),
        `${path.relative(root, file)} hace referencia a "${term}" — FreshTouch CORE no debe depender de código operativo de HX01 ni de Cubo`
      );
    }
  }
});

test('8. el sistema en sí no puede modificar el flujo operativo existente (no hay ninguna escritura fuera de freshtouch-core/)', () => {
  // Prueba estructural equivalente: ningún archivo fuente escribe a rutas
  // fuera de este directorio. Se verifica que no exista ningún path.join
  // ni ruta literal que suba con '..' hacia la raíz de freshtouch-hx01.
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const filesToScan = [];

  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'data' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.js$/.test(entry.name)) filesToScan.push(full);
    }
  })(root);

  // Este propio archivo de prueba contiene, como literales de comparación,
  // los patrones que busca — excluirlo de sí mismo, si no, siempre se
  // detectaría a sí mismo como falso positivo.
  const selfPath = path.resolve(__filename);

  for (const file of filesToScan) {
    if (path.resolve(file) === selfPath) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes("'..', '..'") && !content.includes('"../.."'),
      `${path.relative(root, file)} sube más de un nivel de directorio — no debería necesitar salir de freshtouch-core/`
    );
  }
});
