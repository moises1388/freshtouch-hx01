// PaymentContract — la interfaz que CUALQUIER proveedor de pago debe
// cumplir para conectarse a FreshTouch App.
//
// Esta forma NO es una invención de Fase 1: es deliberadamente la MISMA
// forma ya diseñada, construida y probada con hardware real (QPOS Cute)
// en freshtouch-hx02-cubo-lab/src/payment/paymentProvider.js y
// documentada en freshtouch-hx02-cubo-lab/.claude/skills/hydrox-payment-architecture/SKILL.md.
// No se copia ni se importa ese código aquí (aislamiento del lab, regla
// de esta fase) — se reproduce la FORMA a propósito, para que integrar el
// CuboCardProvider real en Fase 5 sea conectar una pieza ya construida,
// no rediseñar el contrato bajo presión.
//
// Métodos que un PaymentProvider real (o el mock de esta fase) debe
// implementar:
//
//   selectService(service)   -> fija qué servicio priced se está pagando
//   connectPos()              -> establece la sesión/conexión con el medio de pago
//   createPayment()            -> inicia un intento de pago para el servicio ya seleccionado
//   cancelPayment()            -> cancela, best-effort, un intento en curso
//   retryPayment()              -> reintenta tras una falla, sin repetir pasos innecesarios
//   getStatus()                  -> el estado interno actual del proveedor (string)
//   canStartCycle()              -> true SOLO cuando el pago está realmente aprobado
//   requestCycle()                -> vuelve a verificar canStartCycle() y, si procede, autoriza avisar a ESP32
//   onResult(handler)              -> se suscribe a cada cambio de estado del proveedor, no solo al final
//
// Regla de seguridad que ya se estableció en el lab y se mantiene aquí sin
// excepción: canStartCycle() es la ÚNICA función que operationState puede
// consultar para decidir si autoriza CYCLE_RUNNING. Nunca se asume pago
// aprobado por otra vía (temporizador, UI, "probablemente ya pagó").

/**
 * Verifica en tiempo de ejecución que un objeto cumple la forma mínima
 * del contrato — no es un chequeo de tipos completo, es una red de
 * seguridad barata para detectar un proveedor mal construido antes de
 * conectarlo a operationState.
 */
function assertImplementsPaymentContract(provider) {
  const requiredMethods = [
    'selectService', 'connectPos', 'createPayment', 'cancelPayment',
    'retryPayment', 'getStatus', 'canStartCycle', 'requestCycle', 'onResult',
  ];
  const missing = requiredMethods.filter((m) => typeof provider?.[m] !== 'function');
  if (missing.length > 0) {
    throw new Error(`[PaymentContract] Proveedor incompleto — faltan métodos: ${missing.join(', ')}`);
  }
  return true;
}

export { assertImplementsPaymentContract };
