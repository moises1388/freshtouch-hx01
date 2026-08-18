'use strict';

function listAllMachineIds(db) {
  return db.prepare('SELECT id FROM machine ORDER BY id').all().map((r) => r.id);
}

function getMachine(db, machineId) {
  return db.prepare('SELECT * FROM machine WHERE id = ?').get(machineId) || null;
}

function insertMachine(db, { id, name, ownerId, tenantId = null, status = 'active' }) {
  db.prepare(
    'INSERT INTO machine (id, name, owner_id, tenant_id, status) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, ownerId, tenantId, status);
}

module.exports = { listAllMachineIds, getMachine, insertMachine };
