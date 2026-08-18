'use strict';

// Punto de entrada con forma de "lo que un webhook de Telegram entregaría".
// Etapa 1 NO levanta ningún servidor HTTP ni usa ningún token real de bot
// — eso es, a propósito, "conectar/activar", fuera de lo autorizado ahora.
// Esta función es lo que un futuro servidor webhook llamaría con el
// `update` ya parseado; se prueba directamente con objetos de prueba con
// forma de update de Telegram, sin red de por medio.

const { resolveAuthorization } = require('../auth/authorize');
const { recordAuditEvent } = require('../repositories/auditEventRepository');
const { buildStatusData } = require('../status/statusService');
const { formatStatusMessage, formatUnauthorizedMessage } = require('./formatStatus');

/**
 * @param {object} db
 * @param {{message: {from: {id: number|string}, text: string}}} update forma mínima de un Telegram Update
 */
function handleTelegramUpdate(db, update) {
  const telegramUserId = String(update.message.from.id);
  const text = (update.message.text || '').trim();

  if (text !== '/status') {
    // Fuera de alcance de esta etapa: cualquier otro comando/texto se
    // ignora explícitamente, no se intenta interpretar.
    return { handled: false, text: null };
  }

  const auth = resolveAuthorization(db, telegramUserId);

  if (!auth.authorized) {
    recordAuditEvent(db, {
      telegramUserId,
      action: 'status',
      authorized: false,
      machinesQueried: null,
      resultSummary: 'rechazado: telegram_user_id no está en authorized_user',
    });
    return { handled: true, authorized: false, text: formatUnauthorizedMessage() };
  }

  const statusData = buildStatusData(db, auth.allowedMachineIds);
  recordAuditEvent(db, {
    telegramUserId,
    action: 'status',
    authorized: true,
    machinesQueried: auth.allowedMachineIds,
    resultSummary: `ok: ${auth.allowedMachineIds.length} máquina(s) — rol ${auth.user.role}`,
  });

  return { handled: true, authorized: true, text: formatStatusMessage(statusData) };
}

module.exports = { handleTelegramUpdate };
