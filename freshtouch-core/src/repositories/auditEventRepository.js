'use strict';

/**
 * Registra un evento de auditoría. Se llama SIEMPRE desde auth/authorize.js
 * (nunca es opcional, nunca se salta en el camino de éxito ni en el de
 * rechazo) — igual que trace-store.js en Runtime v1 nunca se salta un
 * mensaje oficial.
 *
 * Para consultas no autorizadas, `machinesQueried` debe llegar como null:
 * no se le da a nadie no autorizado ninguna pista de qué máquinas existen,
 * ni siquiera en el registro de auditoría (que en Etapa 2 alguien con
 * acceso al sistema, pero no necesariamente a los datos de negocio, podría
 * llegar a leer).
 */
function recordAuditEvent(db, { telegramUserId, action, authorized, machinesQueried, resultSummary }) {
  db.prepare(
    `INSERT INTO audit_event (occurred_at, telegram_user_id, action, authorized, machines_queried, result_summary)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    new Date().toISOString(),
    telegramUserId,
    action,
    authorized ? 1 : 0,
    machinesQueried ? JSON.stringify(machinesQueried) : null,
    resultSummary
  );
}

function listAuditEvents(db) {
  return db.prepare('SELECT * FROM audit_event ORDER BY id').all();
}

module.exports = { recordAuditEvent, listAuditEvents };
