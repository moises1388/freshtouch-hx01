'use strict';

// Datos de prueba fijos, usados por los tests y por demo.js. Los
// telegram_user_id son valores inventados (TEST_...), no IDs reales de
// Telegram de nadie.
//
// Incluye HX03 como máquina 'suspended' (revisión formal, hallazgo D4) y
// un usuario 'technician', a propósito, para poder probar ambos casos sin
// que cada test tenga que armar su propio escenario desde cero.

const { insertMachine } = require('../repositories/machineRepository');
const { insertAuthorizedUser } = require('../repositories/authorizedUserRepository');
const { grantMachineAccess } = require('../repositories/permissionRepository');

const TELEGRAM_IDS = Object.freeze({
  SUPER_ADMIN: 'TEST_MOISES_0001',
  OWNER_HX02: 'TEST_OWNER_HX02_0001',
  TENANT_HX02: 'TEST_TENANT_HX02_0001',
  TECHNICIAN: 'TEST_TECHNICIAN_0001',
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
  // HX03: suspendida a propósito, y con permiso explícito otorgado al
  // owner de HX02 (mismo dueño, por simplicidad del dato de prueba) — así
  // el test de suspensión cubre el caso real: un usuario CON permiso
  // explícito sobre una máquina que, aun así, no debe verla como
  // disponible mientras esté suspendida.
  insertMachine(db, {
    id: 'HX03',
    name: 'FreshTouch HX03',
    ownerId: Number(ownerHx02.lastInsertRowid),
    tenantId: null,
    status: 'suspended',
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
  const technicianId = insertAuthorizedUser(db, {
    telegramUserId: TELEGRAM_IDS.TECHNICIAN,
    displayName: 'Técnico (prueba)',
    role: 'technician',
  });

  // super_admin NO necesita fila aquí (ver auth/authorize.js).
  grantMachineAccess(db, { authorizedUserId: ownerHx02UserId, machineId: 'HX02' });
  grantMachineAccess(db, { authorizedUserId: ownerHx02UserId, machineId: 'HX03' });
  grantMachineAccess(db, { authorizedUserId: tenantHx02UserId, machineId: 'HX02' });
  grantMachineAccess(db, { authorizedUserId: technicianId, machineId: 'HX01' });

  return { superAdminId, ownerHx02UserId, tenantHx02UserId, technicianId };
}

module.exports = { seedLabData, TELEGRAM_IDS };
