// Logging de diagnóstico que nunca filtra valores sensibles. Portado
// literalmente desde freshtouch-hx02-cubo-lab/src/logger.js.
//
// Regla: cualquier clave de contexto que parezca un secreto o un dato de
// tarjeta se enmascara antes de llegar a la consola. Es una lista negra
// por patrón, no una garantía de seguridad para campos que no se
// consideraron — quien llame a esto igual debe evitar pasar un número de
// tarjeta completo, CVV o PIN dentro de `context`.

const SENSITIVE_KEY_PATTERN = /api[_-]?key|card|pan|cvv|pin|password|secret|token/i;

export function maskSecret(value) {
  if (!value) return '(not set)';
  const str = String(value);
  if (str.length <= 4) return '****';
  return `${'*'.repeat(Math.max(str.length - 4, 4))}${str.slice(-4)}`;
}

function sanitize(context) {
  const safe = {};
  for (const [key, value] of Object.entries(context || {})) {
    safe[key] = SENSITIVE_KEY_PATTERN.test(key) ? maskSecret(value) : value;
  }
  return safe;
}

export function log(machineId, message, context = {}) {
  const prefix = `[${machineId}] ${message}`;
  const safeContext = sanitize(context);
  const line = Object.keys(safeContext).length
    ? `${prefix} ${JSON.stringify(safeContext)}`
    : prefix;
  console.log(line);
  return line;
}
