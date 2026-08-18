'use strict';

// Principios de seguridad de FreshTouch CORE.
//
// Esto NO es una copia de hydrox-ai/runtime/security-config.js — ese
// archivo protege un mecanismo distinto (invocación del CLI `claude`,
// catálogo de agentes, flags de proceso hijo) que no existe aquí. Lo que
// se reutiliza son los PRINCIPIOS, adaptados a lo que este sistema
// realmente hace:
//
//   1. Validar el entorno esperado antes de arrancar (equivalente
//      conceptual de assertExpectedRepo()).
//   2. No confiar en datos enviados por el usuario para decidir permisos.
//   3. Allowlist donde corresponda (roles válidos, ubicación de datos).
//   4. No exponer secretos (ver config.js — nunca hardcodeados, siempre desde
//      variable de entorno, indefinidos por defecto en laboratorio).
//   5. Configuración separada del código (ver config.js).
//   6. Registrar operaciones relevantes (ver repositories/auditEventRepository.js,
//      invocado desde auth/authorize.js — nunca opcional).
//
// Revisión formal (commit 960592c) encontró que assertExpectedEnvironment()
// y assertDataLocationIsSafe() existían pero no se aplicaban en los puntos
// de entrada reales (db/connection.js, telegram/handleUpdate.js) — solo en
// demo.js. Esta versión los aplica ahí, no solo aquí.

const fs = require('node:fs');
const path = require('node:path');

const CORE_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(CORE_ROOT, 'data');

/**
 * Equivalente conceptual de assertExpectedRepo(): antes de que cualquier
 * otra cosa corra, confirma que este proceso vive dentro de la carpeta
 * freshtouch-core/ esperada (marcador CORE.md) y no, por ejemplo, dentro
 * de un import accidental desde la raíz de freshtouch-hx01 o desde algún
 * otro proyecto que haya copiado archivos sueltos de aquí sin el resto.
 *
 * Se invoca desde los puntos de entrada reales (db/connection.js::createDatabase
 * y telegram/handleUpdate.js::handleTelegramUpdate), no solo desde demo.js —
 * por eso acepta `root` como parámetro opcional (default: CORE_ROOT real),
 * lo que también permite probar el rechazo sin tocar el sistema de archivos
 * en la mayoría de los tests (ver tests/security.test.js).
 */
function assertExpectedEnvironment(root = CORE_ROOT) {
  const marker = path.join(root, 'CORE.md');
  if (!fs.existsSync(marker)) {
    throw new Error(
      `[security] No se encontró "${marker}". FreshTouch CORE se niega a ` +
      `arrancar fuera de su propio directorio esperado (root=${root}).`
    );
  }
  return true;
}

/**
 * Ninguna ruta de base de datos puede apuntar fuera de freshtouch-core/data/.
 * Existe específicamente para que un futuro cambio de configuración no
 * pueda, ni por error ni a propósito, hacer que este sistema lea o escriba
 * un archivo dentro de la raíz de freshtouch-hx01 (donde vive la app de
 * producción) ni en ningún otro lugar del sistema de archivos.
 */
function assertDataLocationIsSafe(location) {
  if (location === ':memory:') return true;
  const resolved = path.resolve(location);
  if (!resolved.startsWith(DATA_DIR + path.sep) && resolved !== DATA_DIR) {
    throw new Error(
      `[security] Ruta de base de datos fuera de lo permitido: "${resolved}". ` +
      `Debe estar dentro de ${DATA_DIR} o ser ":memory:".`
    );
  }
  return true;
}

const VALID_ROLES = Object.freeze(['super_admin', 'owner', 'tenant', 'technician']);

module.exports = {
  CORE_ROOT,
  DATA_DIR,
  VALID_ROLES,
  assertExpectedEnvironment,
  assertDataLocationIsSafe,
};
