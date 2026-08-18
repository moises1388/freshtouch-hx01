'use strict';

function grantMachineAccess(db, { authorizedUserId, machineId }) {
  db.prepare(
    'INSERT INTO authorized_user_machine (authorized_user_id, machine_id) VALUES (?, ?)'
  ).run(authorizedUserId, machineId);
}

/** Máquinas explícitamente permitidas para un usuario — sin excepciones ni casos especiales aquí (el caso especial de super_admin vive en auth/authorize.js, no aquí, para que esta consulta siga siendo literal). */
function listAllowedMachineIds(db, authorizedUserId) {
  return db
    .prepare('SELECT machine_id FROM authorized_user_machine WHERE authorized_user_id = ?')
    .all(authorizedUserId)
    .map((r) => r.machine_id);
}

module.exports = { grantMachineAccess, listAllowedMachineIds };
