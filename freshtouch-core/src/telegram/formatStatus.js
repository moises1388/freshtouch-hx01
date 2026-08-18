'use strict';

/**
 * Formato pedido para /status. Función pura (sin efectos secundarios, sin
 * llamadas de red) para que sea trivial de probar sin necesitar Telegram
 * real. El texto de "no autorizado" es deliberadamente genérico — no dice
 * "no tienes acceso a HX01" ni menciona qué máquinas existen, porque eso
 * ya sería revelar información a alguien no autorizado.
 */
function formatStatusMessage(statusData) {
  const hasActive = statusData.perMachine.length > 0;
  const hasSuspended = statusData.suspended && statusData.suspended.length > 0;

  if (!hasActive && !hasSuspended) {
    return 'FreshTouch — no tienes ninguna máquina autorizada para consultar.';
  }

  const lines = ['FreshTouch — Resumen', '⚠️ DATOS DE PRUEBA (laboratorio, Etapa 1)', ''];

  if (hasActive) {
    lines.push(
      ...statusData.perMachine.map((m) => `${m.machineId}: Q${m.totalToday}`),
      '',
      `Total hoy: Q${statusData.totalToday}`,
      '',
      `Lavados: ${statusData.lavados}`,
      `Última operación: ${statusData.lastOperationTime}`
    );
  } else {
    lines.push('(sin máquinas activas autorizadas)');
  }

  if (hasSuspended) {
    lines.push('', 'Máquinas suspendidas:', ...statusData.suspended.map((m) => `${m.machineId}: suspendida`));
  }

  return lines.join('\n');
}

function formatUnauthorizedMessage() {
  return 'No autorizado.';
}

module.exports = { formatStatusMessage, formatUnauthorizedMessage };
