'use strict';

// Helper compartido, extraído de la duplicación que la revisión formal
// encontró entre las pruebas 7 y 8 de authorization.test.js (commit
// 960592c): ambas recorrían el árbol de freshtouch-core/ con la misma
// función `walk` copiada dos veces. Este es el único lugar que hace ese
// recorrido ahora.

const fs = require('node:fs');
const path = require('node:path');

const CORE_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Lista todos los archivos .js bajo freshtouch-core/, excluyendo
 * node_modules/data/.git, y excluyendo siempre `excludeFile` (normalmente
 * el propio archivo de prueba que llama a esta función — si no se
 * excluyera, una prueba que busca ciertos términos se encontraría a sí
 * misma, porque esos términos aparecen ahí como literales de comparación).
 */
function listSourceJsFiles(excludeFile) {
  const excludePath = excludeFile ? path.resolve(excludeFile) : null;
  const files = [];

  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'data' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.js$/.test(entry.name)) files.push(full);
    }
  })(CORE_ROOT);

  return excludePath ? files.filter((f) => path.resolve(f) !== excludePath) : files;
}

module.exports = { listSourceJsFiles, CORE_ROOT };
