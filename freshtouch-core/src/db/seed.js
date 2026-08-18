'use strict';

// Datos de prueba fijos, usados por los tests y por demo.js. Los
// telegram_user_id son valores inventados (TEST_...), no IDs reales de
// Telegram de nadie.

const { insertMachine } = require('../repositories/machineRepository');
const { insertAuthorizedUser } = require('../repositories/authorizedUserRepository');
const { grantMachineAccess } = require('../repositories/permissionRepository');

const TELEGRAM_IDS = Object.freeze({
  SUPER_ADMIN: 'TEST_MOISES_0001',
  OWNER_HX02: 'TEST_OWNER_HX02_0001',
  TENANT_HX02: 'TEST_TENANT_HX02_0001',
  UNKNOWN: 'TEST_UNKNOWN_9999', // nunca insertado — para probar "no autorizado"
});

function seedLabData(db) {
  const ownerHydrox = db.prepare('INSERT INTO owner (name) VALUES (?)').run('Hydrox (Moisés)');
  const ownerHx02 = db.prepare('INSERT INTO owner (name) VALUES (?)').run('Propietario HX02 (prueba)');
  const tenantHx02 = db.prepare('INSERT INTO tenant (name) VALUES (?)').run('Inquilino HX02 (prueba)');

  insertMachine(db, {
    id: 'HX01',
    name: 'FreshTouch HX01',
    ownerId: Number(ownerHydrox.lastInsertRowid),
    tenantId: null,
  });
  insertMachine(db, {
    id: 'HX02',
    name: 'FreshTouch HX02',
    ownerId: Number(ownerHx02.lastInsertRowid),
    tenantId: Number(tenantHx02.lastInsertRowid),
  });

  const superAdminId = insertAuthorizedUser(db, {
    telegramUserId: TELEGRAM_IDS.SUPER_ADMIN,
    displayName: 'Moisés',
    role: 'super_admin',
  });
  const ownerHx02UserId = insertAuthorizedUser(db, {
    telegramUserId: TELEGRAM_IDS.OWNER_HX02,
    displayName: 'Owner HX02 (prueba)',
    role: 'owner',
  });
  const tenantHx02UserId = insertAuthorizedUser(db, {
    telegramUserId: TELEGRAM_IDS.TENANT_HX02,
    displayName: 'Tenant HX02 (prueba)',
    role: 'tenant',
  });

  // super_admin NO necesita fila aquí (ver auth/authorize.js).
  grantMachineAccess(db, { authorizedUserId: ownerHx02UserId, machineId: 'HX02' });
  grantMachineAccess(db, { authorizedUserId: tenantHx02UserId, machineId: 'HX02' });

  return { superAdminId, ownerHx02UserId, tenantHx02UserId };
}

module.exports = { seedLabData, TELEGRAM_IDS };
