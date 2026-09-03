// apiKeySession — la API key de Cubo se guarda en el navegador vía el
// mismo store de clave/valor que expone machineConfigStore.js (este
// archivo nunca toca el almacenamiento del navegador directamente — ver
// isolation test que lo exige), en un namespace propio, separado de
// machineConfig/MachineConfigStore —
// machineConfigContract.js rechaza con un throw fuerte cualquier objeto de
// configuración que contenga una clave así, así que este archivo NUNCA
// pasa por ahí. Nunca en el código/commits de este repo.
//
// Antes vivía solo en una variable de módulo en memoria (se perdía al
// recargar la página) — por instrucción explícita de "quitar la opción de
// insertar la API key cada sesión" al pasar a producción, ahora persiste,
// para que baste con configurarla una sola vez desde Admin.

import { createKeyValueStore } from '../../machineConfig/machineConfigStore.js';

const STORAGE_KEY = 'freshtouch.secret.cuboApiKey';
const store = createKeyValueStore();

function setApiKey(value) {
  if (value && value.length > 0) store.set(STORAGE_KEY, value);
  else store.remove(STORAGE_KEY);
}

function getApiKey() {
  return store.get(STORAGE_KEY);
}

function hasApiKey() {
  return getApiKey() !== null;
}

function clearApiKey() {
  store.remove(STORAGE_KEY);
}

export { setApiKey, getApiKey, hasApiKey, clearApiKey };
