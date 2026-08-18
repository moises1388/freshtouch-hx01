'use strict';

const { findByTelegramUserId } = require('../repositories/authorizedUserRepository');
const { listAllowedMachineIds } = require('../repositories/permissionRepository');
const { listAllMachineIds, listActiveMachineIds } = require('../repositories/machineRepository');

/**
 * ÚNICO lugar del sistema donde se decide qué máquinas puede ver un
 * usuario. Todo lo demás (formateo de /status, futuros comandos) debe
 * llamar aquí — nunca reimplementar esta lógica en otro archivo.
 *
 * Entrada: exclusivamente `telegramUserId`, el identificador numérico que
 * Telegram entrega junto con cada mensaje (nunca el texto del mensaje, ni
 * un nombre, ni ningún dato que el propio usuario pueda escribir). Esa es
 * la regla no negociable que pidió esta etapa: "la autorización debe
 * basarse en el Telegram user_id real dentro del modelo, no en el texto
 * que el usuario escriba."
 *
 * Caso especial documentado: role === 'super_admin' recibe TODAS las
 * máquinas que existan en `machine`, sin necesitar una fila explícita en
 * authorized_user_machine por cada una. Es la única excepción a "solo las
 * máquinas que aparecen explícitamente en sus permisos", y se decidió así
 * porque el propio pedido de esta etapa lo define igual ("Moisés →
 * super_admin → todas las máquinas") — mantenerlo como fila explícita por
 * máquina obligaría a acordarse de agregar una fila cada vez que se cree
 * una máquina nueva, lo cual iría en contra del objetivo de "agregar un
 * negocio/máquina es configuración, no reprogramar". Para owner/tenant/
 * technician no existe ninguna excepción: sin fila en
 * authorized_user_machine, no hay acceso, punto.
 *
 * Política de `machine.status` (revisión formal, hallazgo D4): una máquina
 * `suspended` nunca cuenta como "disponible para operaciones normales" —
 * se excluye de `allowedMachineIds` para TODOS los roles, incluido
 * super_admin. Pero super_admin sí debe poder saber que existe y que está
 * suspendida (nunca queda ciego a su propia flota), así que para
 * super_admin se calcula además `suspendedMachineIds` con todas las
 * suspendidas del sistema. Para owner/tenant/technician, `suspendedMachineIds`
 * también se calcula (misma función, mismo camino, sin caso especial) pero
 * queda restringido a las máquinas que ese usuario tiene permitidas — la
 * capa de presentación (formatStatus.js) decide no mostrárselo, solo a
 * super_admin, tal como pidió la autorización. Ningún dato histórico se
 * borra ni se toca aquí — status es una bandera de lectura, no un filtro
 * destructivo sobre las tablas.
 *
 * @returns {{authorized: boolean, user: object|null, allowedMachineIds: string[], suspendedMachineIds: string[]}}
 */
function resolveAuthorization(db, telegramUserId) {
  const user = findByTelegramUserId(db, telegramUserId);

  if (!user) {
    return { authorized: false, user: null, allowedMachineIds: [], suspendedMachineIds: [] };
  }

  const permittedMachineIds =
    user.role === 'super_admin'
      ? listAllMachineIds(db)
      : listAllowedMachineIds(db, user.id);

  const activeMachineIds = new Set(listActiveMachineIds(db));
  const allowedMachineIds = permittedMachineIds.filter((id) => activeMachineIds.has(id));
  const suspendedMachineIds = permittedMachineIds.filter((id) => !activeMachineIds.has(id));

  return { authorized: true, user, allowedMachineIds, suspendedMachineIds };
}

module.exports = { resolveAuthorization };
