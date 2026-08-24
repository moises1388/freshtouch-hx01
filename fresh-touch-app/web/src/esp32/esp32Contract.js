// ESP32Contract — la interfaz que cualquier controlador de ESP32 debe
// cumplir.
//
// Igual que PaymentContract: la forma no es inventada. Reproduce las
// operaciones que YA son reales y están en producción hoy en HX01
// (app.js: relay(comp,on) vía HTTP local al ESP32, notifyCycleDone(tipo))
// — se lee ese archivo como referencia, nunca se importa ni se modifica
// (HX01 queda intacto).
//
// Componentes reales conocidos, con el mismo nombre corto que ya usa la
// configuración de relés de HX01 (vapor/secado/luz UV/puerta), sin repetir
// aquí los nombres exactos de las constantes internas de ese archivo:
// 'vapor', 'secado', 'luzuv', 'puerta'.
//
// Diferencia deliberada con HX01: en HX01 estas llamadas son "dispara y
// olvida" (fire-and-forget, sin confirmación) — ya se identificó ese
// vacío en una revisión anterior de este proyecto. Este contrato agrega
// `testConnection()`, que HX01 no tiene, porque el modo Admin (Fase 6) sí
// necesita poder confirmar activamente que el ESP32 responde antes de
// activar una máquina — no se cambia el comportamiento de HX01, se agrega
// algo nuevo para HX02+.

const ESP32_COMPONENTS = Object.freeze({
  VAPOR: 'vapor',
  SECADO: 'secado',
  LUZ_UV: 'luzuv',
  PUERTA: 'puerta',
});

function assertImplementsEsp32Contract(controller) {
  const requiredMethods = ['setRelay', 'notifyCycleDone', 'testConnection', 'getStatus'];
  const missing = requiredMethods.filter((m) => typeof controller?.[m] !== 'function');
  if (missing.length > 0) {
    throw new Error(`[ESP32Contract] Controlador incompleto — faltan métodos: ${missing.join(', ')}`);
  }
  return true;
}

export { ESP32_COMPONENTS, assertImplementsEsp32Contract };
