'use strict';

/**
 * Formato pedido para /status. Función pura (sin efectos secundarios, sin
 * llamadas de red) para que sea trivial de probar sin necesitar Telegram
 * real. El texto de "no autorizado" es deliberadamente genérico — no dice
 * "no tienes acceso a HX01" ni menciona qué máquinas existen, porque eso
 * ya sería revelar información a alguien no autorizado.
 */
function formatStatusMessage(statusData) {
  if (statusData.perMachine.length === 0) {
    return 'FreshTouch — no tienes ninguna máquina autorizada para consultar.';
  }
  const lines = [
    'FreshTouch — Resumen',
    '⚠️ DATOS DE PRUEBA (laboratorio, Etapa 1)',
    '',
    ...statusData.perMachine.map((m) => `${m.machineId}: Q${m.totalToday}`),
    '',
    `Total hoy: Q${statusData.totalToday}`,
    '',
    `Lavados: ${statusData.lavados}`,
    `Última operación: ${statusData.lastOperationTime}`,
  ];
  return lines.join('\n');
}

function formatUnauthorizedMessage() {
  return 'No autorizado.';
}

module.exports = { formatStatusMessage, formatUnauthorizedMessage };
