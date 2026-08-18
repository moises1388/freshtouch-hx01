'use strict';

// ⚠️ DATOS DE PRUEBA — NO SON VENTAS REALES ⚠️
//
// Esta etapa NO implementa Operation/Sale/DailyReport (quedaron
// explícitamente fuera del alcance de Etapa 1). Para poder demostrar el
// formato completo de /status sin esas tablas, este archivo simula lo que
// esas tablas devolverían — un mapa fijo, en memoria, por machine_id.
//
// Etapa 2 debe REEMPLAZAR este archivo por consultas reales a
// Operation/Sale (agregadas por día). Nada fuera de statusService.js debe
// importar este módulo, precisamente para que ese reemplazo futuro sea
// un cambio de una sola línea (el import en statusService.js), no una
// búsqueda por todo el código.

const FIXTURE_BY_MACHINE = Object.freeze({
  HX01: Object.freeze({ totalToday: 340, lavados: 17, lastOperationTime: '16:42' }),
  HX02: Object.freeze({ totalToday: 180, lavados: 9, lastOperationTime: '15:10' }),
});

function getFixtureFor(machineId) {
  return FIXTURE_BY_MACHINE[machineId] || { totalToday: 0, lavados: 0, lastOperationTime: '—' };
}

module.exports = { getFixtureFor, IS_TEST_DATA: true };
