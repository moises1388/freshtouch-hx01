'use strict';

// Punto de entrada con forma de "lo que un webhook de Telegram entregaría".
// Etapa 1 NO levanta ningún servidor HTTP ni usa ningún token real de bot
// — eso es, a propósito, "conectar/activar", fuera de lo autorizado ahora.
// Esta función es lo que un futuro servidor webhook llamaría con el
// `update` ya parseado; se prueba directamente con objetos de prueba con
// forma de update de Telegram, sin red de por medio.
//
// Revisión formal (commit 960592c, hallazgo D1): esta función asumía que
// todo Update trae `.message.from.id` y `.message.text`. Telegram también
// envía `edited_message`, `channel_post`, `callback_query`, y mensajes sin
// texto (foto, sticker, ubicación...) — ninguno de esos tiene esa forma.
// extractSupportedMessage() es ahora el único lugar que decide si un
// Update trae algo que esta etapa sabe procesar; todo lo demás se ignora
// de forma segura, nunca lanza.

const { assertExpectedEnvironment } = require('../security');
const { resolveAuthorization } = require('../auth/authorize');
const { recordAuditEvent } = require('../repositories/auditEventRepository');
const { buildStatusData } = require('../status/statusService');
const { formatStatusMessage, formatUnauthorizedMessage } = require('./formatStatus');

/**
 * Únicas formas de Update que esta etapa sabe leer: un `message` con
 * `from.id` y `text` de tipo string. `edited_message`, `channel_post`,
 * `callback_query`, o un `message` sin texto (foto, sticker, ubicación...)
 * devuelven null aquí — el llamador los trata como "no manejado", nunca
 * como error.
 */
function extractSupportedMessage(update) {
  if (!update || typeof update !== 'object') return null;
  const message = update.message;
  if (!message || typeof message !== 'object') return null;
  if (!message.from || typeof message.from !== 'object') return null;
  if (message.from.id === undefined || message.from.id === null) return null;
  if (typeof message.text !== 'string') return null;
  return message;
}

/**
 * @param {object} db
 * @param {object} update un Telegram Update completo (cualquier forma real: message, edited_message, channel_post, callback_query...)
 */
function handleTelegramUpdate(db, update) {
  assertExpectedEnvironment();

  const message = extractSupportedMessage(update);
  if (!message) {
    // Forma de Update no soportada en esta etapa — se ignora, no se
    // audita (no hay identidad confiable de la que dejar rastro en varios
    // de estos casos, p. ej. channel_post) y sobre todo no se lanza.
    return { handled: false, text: null };
  }

  const telegramUserId = String(message.from.id);
  const text = message.text.trim();

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

  const statusData = buildStatusData(db, {
    allowedMachineIds: auth.allowedMachineIds,
    suspendedMachineIds: auth.suspendedMachineIds,
    includeSuspended: auth.user.role === 'super_admin',
  });

  recordAuditEvent(db, {
    telegramUserId,
    action: 'status',
    authorized: true,
    machinesQueried: auth.allowedMachineIds,
    resultSummary: `ok: ${auth.allowedMachineIds.length} máquina(s) activa(s) — rol ${auth.user.role}`,
  });

  return { handled: true, authorized: true, text: formatStatusMessage(statusData) };
}

module.exports = { handleTelegramUpdate, extractSupportedMessage };
