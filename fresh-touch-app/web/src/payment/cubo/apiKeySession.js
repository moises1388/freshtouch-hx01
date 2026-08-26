// apiKeySession — la API key de Cubo vive SOLO aquí, en una variable de
// módulo en memoria. Nunca en machineConfig (que es pública/persistida vía
// MachineConfigStore — ver machineConfig/machineConfigContract.js, que ya
// rechaza con un throw fuerte cualquier objeto de configuración que
// contenga una clave así), nunca en nativeBridge (cuyo mock está diseñado
// a propósito para NUNCA retener el valor real de un secreto — ver
// nativeBridge/mockNativeBridge.js), nunca en el almacenamiento persistente
// del navegador, nunca escrita a disco. Se pierde al recargar la página —
// exactamente la "modalidad de laboratorio ya validada" que pidió la
// autorización: un campo de contraseña en pantalla, solo para la sesión
// del navegador.
//
// Deja la arquitectura preparada para Fase futura (NativeBridge/Android
// Keystore): el día que exista un backend real de secretos, esta misma
// interfaz (hasApiKey/getApiKey/setApiKey/clearApiKey) puede respaldarse
// en él en vez de en una variable de módulo — main.js y cuboCardProvider
// no tendrían que cambiar, solo este archivo.

let apiKey = null;

function setApiKey(value) {
  apiKey = value && value.length > 0 ? value : null;
}

function getApiKey() {
  return apiKey;
}

function hasApiKey() {
  return apiKey !== null;
}

function clearApiKey() {
  apiKey = null;
}

export { setApiKey, getApiKey, hasApiKey, clearApiKey };
