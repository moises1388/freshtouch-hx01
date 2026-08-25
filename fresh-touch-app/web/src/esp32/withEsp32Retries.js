// Reintentos controlados — mismo criterio para cualquier adaptador (mock
// o real): solo se reintentan fallas TRANSITORIAS (timeout, ESP32 no
// disponible). Un comando explícitamente rechazado (Esp32CommandRejectedError)
// NUNCA se reintenta — el ESP32 ya respondió y tomó una decisión;
// reintentarlo a ciegas podría ejecutar dos veces algo que ya se rechazó
// por una razón real, o esconder un error de programación detrás de un
// reintento silencioso.

import { Esp32TimeoutError, Esp32UnavailableError } from './esp32Errors.js';

function isRetryableEsp32Error(err) {
  return err instanceof Esp32TimeoutError || err instanceof Esp32UnavailableError;
}

async function withEsp32Retries(fn, { retries = 2, delayMs = 300 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableEsp32Error(err) || attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export { withEsp32Retries, isRetryableEsp32Error };
