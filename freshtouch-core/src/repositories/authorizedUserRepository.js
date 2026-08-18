'use strict';

const { VALID_ROLES } = require('../security');

/**
 * ÚNICA función que resuelve "quién es este usuario" — busca exclusivamente
 * por telegram_user_id. Nada en este repositorio acepta un nombre, un rol
 * declarado por el llamador, ni ningún otro dato como fuente de identidad.
 */
function findByTelegramUserId(db, telegramUserId) {
  return db
    .prepare('SELECT * FROM authorized_user WHERE telegram_user_id = ?')
    .get(telegramUserId) || null;
}

function insertAuthorizedUser(db, { telegramUserId, displayName, role }) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`[authorizedUserRepository] Rol inválido: "${role}". Debe ser uno de: ${VALID_ROLES.join(', ')}`);
  }
  const info = db
    .prepare('INSERT INTO authorized_user (telegram_user_id, display_name, role) VALUES (?, ?, ?)')
    .run(telegramUserId, displayName, role);
  return Number(info.lastInsertRowid);
}

module.exports = { findByTelegramUserId, insertAuthorizedUser };
