'use strict';

// Demo de laboratorio: simula 4 mensajes de Telegram (sin red, sin token
// real) contra una base en memoria con datos de prueba, e imprime la
// respuesta de cada uno. Ejecutar con: npm run demo

const { assertExpectedEnvironment } = require('./src/security');
const { createDatabase } = require('./src/db/connection');
const { seedLabData, TELEGRAM_IDS } = require('./src/db/seed');
const { handleTelegramUpdate } = require('./src/telegram/handleUpdate');
const { listAuditEvents } = require('./src/repositories/auditEventRepository');

assertExpectedEnvironment();

const db = createDatabase(':memory:');
seedLabData(db);

function simulate(label, telegramUserId) {
  const update = { message: { from: { id: telegramUserId }, text: '/status' } };
  const result = handleTelegramUpdate(db, update);
  console.log(`\n--- ${label} (telegram_user_id=${telegramUserId}) ---`);
  console.log(result.text);
}

simulate('super_admin (Moisés)', TELEGRAM_IDS.SUPER_ADMIN);
simulate('owner de HX02', TELEGRAM_IDS.OWNER_HX02);
simulate('tenant de HX02', TELEGRAM_IDS.TENANT_HX02);
simulate('usuario desconocido', TELEGRAM_IDS.UNKNOWN);

console.log('\n--- AuditEvent registrados ---');
for (const ev of listAuditEvents(db)) {
  console.log(JSON.stringify(ev));
}
