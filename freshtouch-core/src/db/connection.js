'use strict';

// Único archivo que sabe cómo abrir la base de datos. Todo lo demás recibe
// un objeto `db` ya listo — nadie más construye una ruta de archivo ni
// decide el motor. Mismo principio de "un único lugar" que
// hydrox-ai/runtime/security-config.js aplica a los flags del CLI.
//
// Motor: node:sqlite (built-in de Node desde 22.5, experimental). Elegido
// por tres razones, en este orden: cero dependencias que instalar (nada
// que aprobar), es exactamente el motor que ya se recomendó como base del
// futuro CORE en el informe de arquitectura ($0, Node+SQLite), y migrar a
// PostgreSQL más adelante no exige reescribir esta capa — solo
// reemplazarla, porque nada fuera de este archivo conoce SQL crudo de
// SQLite (los repositorios sí usan SQL, pero es SQL estándar, no
// específico del motor).

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/**
 * @param {string} location ':memory:' (default, usado por tests y por el
 *   demo) o una ruta de archivo dentro de freshtouch-core/data/ — nunca
 *   fuera de este directorio (ver security.js::assertDataLocationIsSafe).
 */
function createDatabase(location = ':memory:') {
  const db = new DatabaseSync(location);
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  return db;
}

module.exports = { createDatabase };
