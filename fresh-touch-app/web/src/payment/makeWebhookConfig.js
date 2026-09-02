// makeWebhookConfig — URLs y token de los webhooks de Make.com (QR Cubo,
// verificación de pago, registro de venta) que HX02 llama en producción.
// Igual que apiKeySession.js: persisten vía el store de clave/valor que
// expone machineConfigStore.js (este archivo nunca toca el almacenamiento
// del navegador directamente — ver isolation test), separados de
// machineConfig (que persiste vía
// MachineConfigStore y termina en exportConfig()) y del código/commits de
// este repo — una URL de webhook de Make funciona como credencial (quien
// la tenga puede invocarla), igual de sensible que el token que la
// acompaña.
//
// Los nombres de campo son propios de HX02 (qrWebhookUrl/qrPollWebhookUrl/
// salesWebhookUrl) — mismo protocolo, mismo Make.com, pero sin acoplar
// este código a los identificadores internos que usa el config.js de la
// otra máquina (ver isolation.test.js).
//
// Se configuran una sola vez desde Admin (panel de Secretos) y quedan
// guardadas para la máquina en ese navegador — no hay que volver a
// pegarlas en cada sesión.

import { createKeyValueStore } from '../machineConfig/machineConfigStore.js';

const STORAGE_KEY = 'freshtouch.secret.makeWebhooks';
const FIELDS = ['salesWebhookUrl', 'qrWebhookUrl', 'qrPollWebhookUrl', 'webhookSecret'];
const store = createKeyValueStore();

function getMakeWebhookConfig() {
  const raw = store.get(STORAGE_KEY);
  const saved = raw ? JSON.parse(raw) : {};
  const cfg = {};
  for (const f of FIELDS) cfg[f] = saved[f] || '';
  return cfg;
}

// Solo sobreescribe los campos presentes en `patch` — así "Guardar
// secretos" con un campo en blanco (la persona no quiso cambiarlo) no
// borra los demás ya guardados.
function saveMakeWebhookConfig(patch) {
  const current = getMakeWebhookConfig();
  const next = { ...current, ...patch };
  store.set(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function hasMakeWebhookConfig() {
  const cfg = getMakeWebhookConfig();
  return Boolean(cfg.salesWebhookUrl || cfg.qrWebhookUrl || cfg.qrPollWebhookUrl);
}

function clearMakeWebhookConfig() {
  store.remove(STORAGE_KEY);
}

export { getMakeWebhookConfig, saveMakeWebhookConfig, hasMakeWebhookConfig, clearMakeWebhookConfig };
