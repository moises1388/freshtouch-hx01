// ESP32Contract — la interfaz que cualquier controlador de ESP32 debe
// cumplir (mock o real), para que main.js pueda intercambiar uno por
// otro sin cambiar una línea de la UI.
//
// CORRECCIÓN (Fase 3): esta forma fue diseñada en Fase 1 asumiendo,
// incorrectamente, que HX02 hablaría el mismo protocolo que HX01 (HTTP
// local a una IP, visto en app.js — solo como referencia, nunca copiado
// ni modificado, HX01 queda intacto). Al investigar Fase 3 se confirmó
// que eso NO está decidido: el propio laboratorio de HX02
// (freshtouch-hx02-cubo-lab) marca su interfaz de ESP32 como no
// implementada a propósito y su configuración de máquina como
// "not_defined", con la nota explícita de no asumir IP, GPIO, WebSocket,
// Bluetooth ni MQTT. Ver el informe de Fase 3 para el detalle completo.
// Esta interfaz sigue teniendo la MISMA forma (setRelay/notifyCycleDone)
// porque sigue siendo una forma razonable y no compromete a ningún
// transporte concreto — pero el nombre de los componentes de abajo, y el
// transporte con el que un adaptador real hable con el ESP32, siguen sin
// confirmar para HX02.
//
// Componentes: los mismos cuatro nombres cortos ya usados desde Fase 1
// ('vapor', 'secado', 'luzuv', 'puerta') — considerar UNCONFIRMED para
// HX02 hasta que alguien inspeccione el hardware real; hoy son un
// placeholder razonable, no un hecho verificado.
//
// `testConnection()` y, desde Fase 3, `connect()`/`disconnect()` no
// existen en HX01 (que dispara relés sin confirmación) — se agregan
// porque el modo Admin y el arranque de la app sí necesitan poder saber
// si hay una conexión activa con el ESP32 antes de operar la máquina.

const ESP32_COMPONENTS = Object.freeze({
  VAPOR: 'vapor',
  SECADO: 'secado',
  LUZ_UV: 'luzuv',
  PUERTA: 'puerta',
});

function assertImplementsEsp32Contract(controller) {
  const requiredMethods = ['connect', 'disconnect', 'setRelay', 'notifyCycleDone', 'testConnection', 'getStatus'];
  const missing = requiredMethods.filter((m) => typeof controller?.[m] !== 'function');
  if (missing.length > 0) {
    throw new Error(`[ESP32Contract] Controlador incompleto — faltan métodos: ${missing.join(', ')}`);
  }
  return true;
}

export { ESP32_COMPONENTS, assertImplementsEsp32Contract };
