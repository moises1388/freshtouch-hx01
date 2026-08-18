-- FreshTouch CORE — esquema mínimo, Etapa 1 (laboratorio)
--
-- Solo las entidades pedidas para esta etapa: Machine, Owner, Tenant,
-- AuthorizedUser, Permission (authorized_user_machine), AuditEvent.
--
-- Operation / Sale / Incident / DailyReport quedan deliberadamente fuera
-- de este esquema por ahora (Etapa 2) — el diseño no las necesita para
-- existir ya: se agregarán como tablas nuevas con machine_id como llave
-- foránea, sin tocar ninguna de las tablas de aquí.

CREATE TABLE owner (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL
);

CREATE TABLE tenant (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL
);

CREATE TABLE machine (
  id        TEXT PRIMARY KEY,        -- 'HX01', 'HX02', ... (mismo machineId que usa config.js en la tablet, solo como dato, sin ninguna conexión de código)
  name      TEXT NOT NULL,
  owner_id  INTEGER REFERENCES owner(id),
  tenant_id INTEGER REFERENCES tenant(id),   -- puede ser NULL: no toda máquina tiene inquilino
  status    TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended'))
);

CREATE TABLE authorized_user (
  id                INTEGER PRIMARY KEY,
  telegram_user_id  TEXT NOT NULL UNIQUE,   -- ÚNICA clave de identidad. Nunca el texto del mensaje.
  display_name      TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('super_admin','owner','tenant','technician'))
);

-- Permission: relación explícita usuario -> máquina.
-- Regla del sistema: un usuario solo puede consultar las máquinas que
-- aparecen aquí, CON UNA EXCEPCIÓN DE DISEÑO explícita y documentada en
-- src/auth/authorize.js: super_admin no requiere filas aquí (ver ese
-- archivo para el porqué). Para owner/tenant/technician, sin fila aquí
-- significa sin acceso — no hay ningún otro camino para obtenerlo.
CREATE TABLE authorized_user_machine (
  authorized_user_id  INTEGER NOT NULL REFERENCES authorized_user(id),
  machine_id          TEXT NOT NULL REFERENCES machine(id),
  PRIMARY KEY (authorized_user_id, machine_id)
);

-- AuditEvent: toda consulta (autorizada o no) deja rastro.
-- Para consultas no autorizadas, machines_queried queda NULL a propósito
-- (nunca se reporta qué máquinas existen a alguien no autorizado).
CREATE TABLE audit_event (
  id                INTEGER PRIMARY KEY,
  occurred_at       TEXT NOT NULL,     -- ISO 8601
  telegram_user_id  TEXT NOT NULL,     -- se registra tal cual llegó, exista o no en authorized_user
  action            TEXT NOT NULL,
  authorized        INTEGER NOT NULL CHECK (authorized IN (0,1)),
  machines_queried  TEXT,              -- JSON array de machine_id, NULL si no autorizado
  result_summary    TEXT NOT NULL
);
