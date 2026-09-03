// Tipos de error compartidos entre cualquier implementación de
// ESP32Contract (mock o real) y withEsp32Retries.js — un solo lugar para
// que `instanceof` funcione igual sin importar qué adaptador esté
// activo, y para que quede explícito cuáles fallas son transitorias
// (vale la pena reintentarlas) y cuáles no.

// Transitorio — vale la pena reintentar (la red/el ESP32 no respondió a
// tiempo, pero el comando pudo no haberse ejecutado).
class Esp32TimeoutError extends Error {}

// Transitorio — no hay conexión activa (cable, WiFi, lo que sea que
// resulte ser el transporte real). También vale la pena reintentar tras
// reconectar.
class Esp32UnavailableError extends Error {}

// NO transitorio — el ESP32 respondió y rechazó el comando. Reintentar
// esto a ciegas sería peligroso: el ESP32 ya tomó una decisión.
class Esp32CommandRejectedError extends Error {}

// El protocolo real de HX02 no está confirmado todavía — ver el informe
// de Fase 3. No es un error de red, es un estado del proyecto.
class Esp32ProtocolUndefinedError extends Error {}

export {
  Esp32TimeoutError,
  Esp32UnavailableError,
  Esp32CommandRejectedError,
  Esp32ProtocolUndefinedError,
};
