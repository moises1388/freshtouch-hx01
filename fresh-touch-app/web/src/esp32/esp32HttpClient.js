// Esp32HttpClient — transporte HTTP puro para hablar con el firmware v3
// real (FreshTouchESP32v3.ino). No conoce ESP32Contract, no conoce
// machineConfig completo, no conoce estado de la app: recibe una
// dirección y devuelve un resultado, o lanza uno de los tipos ya
// existentes en esp32Errors.js. realEsp32Adapter.js es el único que lo
// usa y el único que traduce esto al contrato que main.js consume.
//
// Rutas exactas del firmware v3 (confirmadas leyendo el .ino, no
// inventadas): GET /status (siempre 200, JSON), GET /relay?comp=X&state=0|1
// (200 "ok" | 400 si falta comp/state o state no es 0/1 | 404 componente
// desconocido, siempre text/plain). Nada de esto se modificó — Etapa 1
// prohíbe explícitamente tocar el firmware.
//
// Nota conocida (documentada, no resuelta aquí): el firmware no envía
// cabeceras CORS. Si fresh-touch-app se sirve desde un origen distinto al
// del ESP32, un fetch() de navegador puede ser bloqueado por CORS antes
// de llegar siquiera a la red — eso se ve como un fallo de red genérico
// (mapeado abajo a Esp32UnavailableError), no como un error del ESP32.
// Resolverlo es un cambio de firmware explícitamente fuera de alcance en
// esta etapa.

import { Esp32TimeoutError, Esp32UnavailableError, Esp32CommandRejectedError } from './esp32Errors.js';

const DEFAULT_TIMEOUT_MS = 4000;

function buildUrl(esp32Address, pathAndQuery) {
  return `http://${esp32Address}${pathAndQuery}`;
}

async function fetchWithTimeout(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method: 'GET', signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Esp32TimeoutError(`[Esp32HttpClient] Timeout (${timeoutMs}ms) esperando respuesta de "${url}".`);
    }
    // Cualquier otro fallo de fetch (conexión rechazada, DNS, CORS
    // bloqueado por el navegador, etc.) se trata como "no disponible" —
    // es transitorio y vale la pena reintentarlo, igual que en HX01.
    throw new Esp32UnavailableError(`[Esp32HttpClient] No se pudo contactar "${url}": ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

async function getEsp32Status(esp32Address, opts = {}) {
  const url = buildUrl(esp32Address, '/status');
  const res = await fetchWithTimeout(url, opts);
  if (!res.ok) {
    // El firmware nunca responde algo distinto de 200 en /status — si
    // esto pasa es una situación real, no se inventa un manejo especial,
    // se reporta como no disponible.
    throw new Esp32UnavailableError(`[Esp32HttpClient] GET /status respondió ${res.status} en "${url}".`);
  }
  return res.json();
}

async function setEsp32Relay(esp32Address, component, state, opts = {}) {
  const stateParam = state ? '1' : '0';
  const url = buildUrl(esp32Address, `/relay?comp=${encodeURIComponent(component)}&state=${stateParam}`);
  const res = await fetchWithTimeout(url, opts);
  const body = await res.text();
  if (res.status === 400 || res.status === 404) {
    // El ESP32 respondió y rechazó el comando explícitamente (componente
    // desconocido o "state" inválido) — no es un fallo de red, es una
    // decisión del firmware. Nunca se reintenta esto (ver esp32Errors.js).
    throw new Esp32CommandRejectedError(`[Esp32HttpClient] GET /relay rechazado (${res.status}): ${body}`);
  }
  if (!res.ok) {
    throw new Esp32UnavailableError(`[Esp32HttpClient] GET /relay respondió ${res.status} inesperado en "${url}": ${body}`);
  }
  return { ok: true, body };
}

export { getEsp32Status, setEsp32Relay, DEFAULT_TIMEOUT_MS };
