'use strict';

const { findByTelegramUserId } = require('../repositories/authorizedUserRepository');
const { listAllowedMachineIds } = require('../repositories/permissionRepository');
const { listAllMachineIds } = require('../repositories/machineRepository');

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
 * @returns {{authorized: boolean, user: object|null, allowedMachineIds: string[]}}
 */
function resolveAuthorization(db, telegramUserId) {
  const user = findByTelegramUserId(db, telegramUserId);

  if (!user) {
    return { authorized: false, user: null, allowedMachineIds: [] };
  }

  const allowedMachineIds =
    user.role === 'super_admin'
      ? listAllMachineIds(db)
      : listAllowedMachineIds(db, user.id);

  return { authorized: true, user, allowedMachineIds };
}

module.exports = { resolveAuthorization };
