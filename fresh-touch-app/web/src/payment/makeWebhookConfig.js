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
// DEFAULTS: por instrucción explícita del dueño (asumiendo el riesgo de
// tenerlos en el repo, que a partir de este cambio queda privado en
// GitHub) son el mismo escenario/webhooks de Make que ya usa HX01 en
// producción — así HX02 queda funcionando sin necesitar ningún paso
// manual en Admin. Un valor guardado desde Admin (ver
// saveMakeWebhookConfig()) sigue teniendo prioridad sobre este default —
// se puede seguir cambiando sin tocar código ni redeploy si algún día
// hace falta un escenario de Make distinto para HX02.

import { createKeyValueStore } from '../machineConfig/machineConfigStore.js';

const STORAGE_KEY = 'freshtouch.secret.makeWebhooks';
const FIELDS = ['salesWebhookUrl', 'qrWebhookUrl', 'qrPollWebhookUrl', 'webhookSecret'];
const store = createKeyValueStore();

const DEFAULTS = {
  salesWebhookUrl: 'https://hook.us2.make.com/eflzu6yezv4r9fwlqtueu7ojkueulimw',
  qrWebhookUrl: 'https://hook.us2.make.com/n0xdf2qxqkm1v4ty6uyff1wrix1aq4dm',
  qrPollWebhookUrl: 'https://hook.us2.make.com/mn4nu977eog6tzpg46ashfcwspexyh0q',
  webhookSecret: 'ea0b883de6fb4542a865b23f6fdac59903b4f411405d71c0e94052f6a0cdd247',
};

function getMakeWebhookConfig() {
  const raw = store.get(STORAGE_KEY);
  const saved = raw ? JSON.parse(raw) : {};
  const cfg = {};
  for (const f of FIELDS) cfg[f] = saved[f] || DEFAULTS[f] || '';
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
