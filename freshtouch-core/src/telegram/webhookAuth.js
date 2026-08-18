'use strict';

// Preparación de la autenticidad del webhook (hallazgo 5 de la revisión
// formal), NO activación: nada en esta etapa conecta un webhook real de
// Telegram ni usa un secreto real. Esto queda listo para que, cuando
// Etapa 2 sí levante un servidor HTTP, exista una única función ya
// probada que decidir si una solicitud entrante realmente vino de
// Telegram — en vez de reinventar esa comparación en el servidor nuevo.
//
// Cómo funciona en Telegram real (para cuando se conecte, no hoy): al
// configurar el webhook se le puede pasar a Telegram un `secret_token`;
// Telegram lo devuelve en cada solicitud como el header
// `X-Telegram-Bot-Api-Secret-Token`. Comparar ese valor contra el que
// nosotros configuramos (config.js::getTelegramWebhookSecret) es lo que
// impide que cualquiera que no sea Telegram pueda enviar un `/status`
// falso una vez que exista un servidor real escuchando.

const crypto = require('node:crypto');

/**
 * Comparación en tiempo constante — evita que una diferencia de timing
 * revele cuántos caracteres del secreto acertó un atacante. `providedSecret`
 * es dato no confiable (vendría de un header HTTP); `expectedSecret` es el
 * valor configurado por nosotros (config.js, nunca hardcodeado).
 */
function isValidWebhookSecret(providedSecret, expectedSecret) {
  if (typeof providedSecret !== 'string' || providedSecret.length === 0) return false;
  if (typeof expectedSecret !== 'string' || expectedSecret.length === 0) return false;

  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(expectedSecret);
  if (provided.length !== expected.length) return false; // timingSafeEqual exige igual longitud

  return crypto.timingSafeEqual(provided, expected);
}

module.exports = { isValidWebhookSecret };
