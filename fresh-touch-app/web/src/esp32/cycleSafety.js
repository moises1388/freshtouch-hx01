// Regla de seguridad fail-closed exigida en la autorización de Fase 3:
// "si el pago todavía no está confirmado, ninguna orden debe iniciar un
// ciclo de limpieza". No se reimplementa el criterio aquí — se reutiliza
// canRunCycle(), la misma función que operationState/operationStateMachine.js
// ya expone y prueba, para que exista una única fuente de verdad sobre
// cuándo es seguro arrancar un ciclo (solo en CYCLE_RUNNING, al que solo
// se llega después de un pago aprobado — ver esa máquina de estados).
//
// Este archivo vive en esp32/ a propósito, no en main.js: así CUALQUIER
// punto de entrada que quiera arrancar un ciclo (hoy main.js, mañana un
// posible modo de prueba en admin) queda protegido por la misma función,
// en vez de depender de que cada llamador recuerde revisar el estado por
// su cuenta.

import { canRunCycle } from '../operationState/operationStateMachine.js';

class CycleStartRefusedError extends Error {}

function assertCanStartCycle(operationState) {
  if (!canRunCycle(operationState)) {
    throw new CycleStartRefusedError(
      `[ESP32] Orden de iniciar ciclo rechazada — estado de operación "${operationState}", ` +
        'se requiere CYCLE_RUNNING (solo se llega ahí después de un pago aprobado).'
    );
  }
}

export { assertCanStartCycle, CycleStartRefusedError };
