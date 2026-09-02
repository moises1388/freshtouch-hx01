// MachineConfigStore — encapsula la persistencia de la configuración NO
// SECRETA de la máquina detrás de MachineConfigContract.
//
//   MachineConfigContract
//          │
//          ▼
//   MachineConfigStore   <-- este módulo
//          │
//          ▼
//   Local persistence (localStorage hoy; Fase 3+ puede cambiarlo por
//   disco vía nativeBridge, o por HTTP a FreshTouch CORE, sin que
//   provisioning/ ni main.js se enteren — solo hablan con este módulo).
//
// La UI (provisioning, admin) NUNCA debe llamar a localStorage
// directamente — siempre a través de las funciones exportadas aquí. Eso
// es lo que hace posible cambiar el backend de persistencia después sin
// tocar la UI (ver isolation test que verifica que no hay acceso directo
// a localStorage fuera de este archivo).
//
// Guarda EXCLUSIVAMENTE lo que assertValidMachineConfig acepta. Un
// secreto (Cubo API Key, tokens) jamás pasa por save() — el contrato ya
// lo rechaza con un throw fuerte si alguien lo intenta (ver
// machineConfigContract.js). Los secretos viven en nativeBridge (mock
// hoy, Android Keystore en Fase 6) — nunca aquí.

import { assertValidMachineConfig } from './machineConfigContract.js';

const NAMESPACE = 'freshtouch.machineConfig.';
const ACTIVE_KEY = `${NAMESPACE}__active`;

// Adaptador en memoria con la misma forma que usa Web Storage
// (getItem/setItem/removeItem/key/length), para poder probar el store
// completo bajo `node --test` (sin DOM) y para que un navegador real sin
// localStorage disponible (raro, pero posible en algunos WebViews
// restringidos) siga teniendo un fallback funcional dentro de la misma
// sesión.
function createInMemoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    key: (i) => Array.from(data.keys())[i] ?? null,
    get length() { return data.size; },
  };
}

function defaultStorage() {
  if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  return createInMemoryStorage();
}

// Store genérico de clave/valor sobre el mismo backend (localStorage o el
// fallback en memoria) — para que otros secretos persistentes del
// navegador (API key de Cubo, webhooks de Make, ver payment/cubo/
// apiKeySession.js y payment/makeWebhookConfig.js) NUNCA tengan que tocar
// localStorage directamente: solo este archivo lo hace (ver isolation
// test que lo exige).
function createKeyValueStore({ storage } = {}) {
  const backend = storage || defaultStorage();
  return {
    get: (key) => backend.getItem(key),
    set: (key, value) => backend.setItem(key, value),
    remove: (key) => backend.removeItem(key),
  };
}

function createMachineConfigStore({ storage } = {}) {
  const backend = storage || defaultStorage();
  const keyFor = (machineId) => `${NAMESPACE}${machineId}`;

  function getActiveMachineId() {
    return backend.getItem(ACTIVE_KEY);
  }

  function isProvisioned() {
    return getActiveMachineId() !== null;
  }

  function load(machineId) {
    const id = machineId || getActiveMachineId();
    if (!id) return null;
    const raw = backend.getItem(keyFor(id));
    return raw ? JSON.parse(raw) : null;
  }

  function save(config) {
    assertValidMachineConfig(config);
    backend.setItem(keyFor(config.machineId), JSON.stringify(config));
    backend.setItem(ACTIVE_KEY, config.machineId);
    return load(config.machineId);
  }

  function listMachineIds() {
    const ids = [];
    for (let i = 0; i < backend.length; i++) {
      const k = backend.key(i);
      if (k && k.startsWith(NAMESPACE) && k !== ACTIVE_KEY) {
        ids.push(k.slice(NAMESPACE.length));
      }
    }
    return ids;
  }

  function reset(machineId) {
    const id = machineId || getActiveMachineId();
    if (!id) return;
    backend.removeItem(keyFor(id));
    if (getActiveMachineId() === id) backend.removeItem(ACTIVE_KEY);
  }

  return { isProvisioned, getActiveMachineId, load, save, listMachineIds, reset };
}

export { createMachineConfigStore, createInMemoryStorage, createKeyValueStore };
