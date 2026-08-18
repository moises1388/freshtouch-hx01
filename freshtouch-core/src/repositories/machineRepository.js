'use strict';

// Nota (revisión formal, hallazgo D4): listAllMachineIds() devuelve TODAS
// las máquinas sin importar status — a propósito, la sigue usando
// super_admin en auth/authorize.js para saber que una máquina suspendida
// existe. listActiveMachineIds() es la nueva consulta que sí filtra, y es
// la que decide qué se considera "disponible para operaciones normales".

function listAllMachineIds(db) {
  return db.prepare('SELECT id FROM machine ORDER BY id').all().map((r) => r.id);
}

function listActiveMachineIds(db) {
  return db.prepare("SELECT id FROM machine WHERE status = 'active' ORDER BY id").all().map((r) => r.id);
}

function getMachine(db, machineId) {
  return db.prepare('SELECT * FROM machine WHERE id = ?').get(machineId) || null;
}

function insertMachine(db, { id, name, ownerId, tenantId = null, status = 'active' }) {
  db.prepare(
    'INSERT INTO machine (id, name, owner_id, tenant_id, status) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, ownerId, tenantId, status);
}

function setMachineStatus(db, machineId, status) {
  db.prepare('UPDATE machine SET status = ? WHERE id = ?').run(status, machineId);
}

module.exports = { listAllMachineIds, listActiveMachineIds, getMachine, insertMachine, setMachineStatus };
