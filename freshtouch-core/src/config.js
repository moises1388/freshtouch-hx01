'use strict';

// Único lugar que lee configuración desde el entorno. Ningún otro archivo
// debe leer process.env directamente — mismo principio de "un único lugar"
// que ya se aplica al catálogo de agentes/flags en Runtime v1 y a la
// apertura de la base de datos en db/connection.js.
//
// Nada aquí tiene un valor por defecto que sea un secreto real. En
// laboratorio, sin la variable de entorno definida, todo resuelve a `null`
// — a propósito: esta etapa no conecta ningún Telegram real, así que no
// existe todavía ningún secreto verdadero que leer.

function getTelegramWebhookSecret() {
  return process.env.FRESHTOUCH_CORE_TELEGRAM_WEBHOOK_SECRET || null;
}

module.exports = { getTelegramWebhookSecret };
