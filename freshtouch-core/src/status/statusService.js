'use strict';

const { getMachine } = require('../repositories/machineRepository');
const { getFixtureFor } = require('./testFixtureData');

/**
 * Arma los datos de /status para exactamente el conjunto de máquinas ya
 * autorizado (resuelto antes, en auth/authorize.js — esta función no
 * decide permisos, solo reporta sobre lo que ya se decidió permitirle ver
 * al usuario).
 */
function buildStatusData(db, allowedMachineIds) {
  const perMachine = allowedMachineIds.map((machineId) => {
    const machine = getMachine(db, machineId);
    const fixture = getFixtureFor(machineId);
    return {
      machineId,
      machineName: machine ? machine.name : machineId,
      totalToday: fixture.totalToday,
      lavados: fixture.lavados,
      lastOperationTime: fixture.lastOperationTime,
    };
  });

  const totalToday = perMachine.reduce((sum, m) => sum + m.totalToday, 0);
  const lavados = perMachine.reduce((sum, m) => sum + m.lavados, 0);
  const lastOperationTime = perMachine
    .map((m) => m.lastOperationTime)
    .filter((v) => v !== '—')
    .sort()
    .pop() || '—';

  return { perMachine, totalToday, lavados, lastOperationTime };
}

module.exports = { buildStatusData };
