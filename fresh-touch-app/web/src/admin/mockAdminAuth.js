// ⚠️ MOCK / NOT PRODUCTION — PINES TEMPORALES, NO ES SEGURIDAD REAL ⚠️
//
// Réplica fiel del esquema de roles real de HX01 (su función de
// verificación de PIN en el arranque del panel de admin): 4 PINes de
// longitud distinta (6/5/4/4), cada uno resuelve a un rol con distinto
// nivel de acceso. Antes de esta corrección, Fase
// 1-2 tenían un único PIN mock que siempre otorgaba 'sa' — un hueco de
// fidelidad real, no solo visual: cualquiera que abriera el panel de
// admin podía ver y cambiar la configuración de la máquina.
//
// Los valores de este archivo son deliberadamente DISTINTOS de los
// valores reales de config.js — nunca se copia un secreto real de
// producción a esta app, aunque sea a un mock — pero conservan la MISMA
// forma (misma longitud por rol), para que el comportamiento
// (desambiguación por longitud, no solo por valor) se pueda probar igual.
//
// La pieza de seguridad que sí importa desde ya, y que replica
// deliberadamente el diseño real: el PIN de 'sa' (Super Admin HYDROX) NO
// tiene, en ningún lugar de este código, una función que lo cambie —
// igual que en HX01 real, donde la pantalla de configuración deja
// reescribir los PINes de técnico/inquilino/dueño pero nunca el de super
// admin. Así, aunque la máquina se venda, solo Hydrox (quien conoce el
// PIN de fábrica) conserva ese nivel de acceso. Fase 6 (Keystore)
// reemplaza este archivo entero por verificación real; hasta entonces,
// este mock es honesto sobre sus límites, no sobre su fuerza — sigue
// viviendo en texto plano legible por cualquiera con las herramientas de
// desarrollador del navegador.

const MOCK_PINS_NOT_FOR_PRODUCTION = Object.freeze({
  sa: '000000', // Super Admin HYDROX — 6 dígitos, igual forma que HX01 real
  ow: '00000',  // Dueño de la máquina — 5 dígitos
  tc: '0001',   // Técnico / mantenimiento — 4 dígitos
  tn: '0002',   // Inquilino — 4 dígitos, distinto de tc
});

// Se conserva este nombre (ya usado desde Fase 1) por compatibilidad:
// sigue siendo el PIN de super admin, ahora explícitamente parte del
// esquema de 4 roles en vez de ser el único PIN que existe.
const MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION = MOCK_PINS_NOT_FOR_PRODUCTION.sa;

// Misma lógica de desambiguación que checkPIN() en el app.js real de
// HX01: se compara longitud Y valor exacto — nunca solo el valor — para
// que un PIN de 4 dígitos jamás pueda "colarse" como coincidencia parcial
// de uno de 5 o 6.
function resolveMockAdminRole(candidate) {
  const p = String(candidate ?? '');
  if (p.length === 6 && p === MOCK_PINS_NOT_FOR_PRODUCTION.sa) return 'sa';
  if (p.length === 5 && p === MOCK_PINS_NOT_FOR_PRODUCTION.ow) return 'ow';
  if (p.length === 4 && p === MOCK_PINS_NOT_FOR_PRODUCTION.tc) return 'tc';
  if (p.length === 4 && p === MOCK_PINS_NOT_FOR_PRODUCTION.tn) return 'tn';
  return null;
}

function verifyMockAdminPin(candidate) {
  return resolveMockAdminRole(candidate) !== null;
}

export {
  MOCK_PINS_NOT_FOR_PRODUCTION,
  MOCK_ADMIN_PIN_NOT_FOR_PRODUCTION,
  resolveMockAdminRole,
  verifyMockAdminPin,
};
