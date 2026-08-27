// Punto de entrada de FreshTouch App (Fase 1, corrección de fidelidad
// visual). Reproduce el comportamiento real de app.js de HX01 —mismos
// nombres de función globales invocados desde el marcado portado
// (go, selectPlan, openQR, sessAction, pinTap, etc.)— pero implementado
// sobre la arquitectura modular: cada función que en HX01 tocaba
// hardware/Cubo/Make reales aquí llama a un mock explícito
// (payment/esp32/nativeBridge), nunca a una integración real.
//
// operationState sigue siendo real y se sigue probando por separado
// (operationState/operationStateMachine.test.js) — aquí se usa como
// registro de los checkpoints de la sesión (servicio elegido, pago
// aprobado, puerta abierta, ciclo iniciado/terminado), no como el que
// decide qué pantalla mostrar (ver navigation.js para el porqué de ese
// cambio).

import { createOperationSession } from './operationState/operationStateMachine.js';
import { createMockPaymentProvider } from './payment/mockPaymentProvider.js';
import { createCuboCardProvider } from './payment/cuboCardProvider.js';
import { STATES as CUBO_STATES } from './payment/paymentStateMachine.js';
import { setApiKey, getApiKey, hasApiKey, clearApiKey } from './payment/cubo/apiKeySession.js';
import { createMockEsp32Controller } from './esp32/mockEsp32Controller.js';
import { createRealEsp32Adapter } from './esp32/realEsp32Adapter.js';
import { assertCanStartCycle } from './esp32/cycleSafety.js';
import { createMockNativeBridge } from './nativeBridge/mockNativeBridge.js';
import { createAdminSession } from './admin/adminSession.js';
import { loadMockMachineConfig } from './machineConfig/mockMachineConfig.js';
import { assertValidMachineConfig } from './machineConfig/machineConfigContract.js';
import { createMachineConfigStore } from './machineConfig/machineConfigStore.js';
import { validateDraft } from './machineConfig/provisioningValidation.js';
import { showScreen } from './ui/navigation.js';
import { initBubbles } from './ui/bubbles.js';
import { t, getLang, setLang, applyLang } from './ui/i18n.js';

// --- Composición de la app ---
// Fase 2: si la máquina ya fue configurada (provisioning, ver más abajo),
// se usa esa configuración guardada; si no, se sigue arrancando con el
// mock de Fase 1 — nunca se auto-guarda el mock, así "isProvisioned()"
// solo es true después de un Guardar explícito desde el panel de admin.
// Override temporal de esp32Mode/esp32Address vía query string —
// ?esp32Mode=real&esp32Address=172.20.10.10 — para poder probar contra el
// ESP32 real desde cualquier navegador (incluida una tablet) sin editar
// código ni tocar lo que ya esté provisionado. Nunca se persiste (no
// llama a configStore.save()): vive solo en memoria mientras esta pestaña
// tenga esos parámetros en la URL. Cualquier esp32Mode que no sea
// exactamente "mock" o "real" se ignora — fail-closed, no se acepta un
// modo inventado ni a medias.
function applyUrlConfigOverrides(config) {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('esp32Mode');
  const address = params.get('esp32Address');
  const overrides = {};
  if (mode === 'mock' || mode === 'real') overrides.esp32Mode = mode;
  if (address) overrides.esp32Address = address;
  return Object.keys(overrides).length > 0 ? { ...config, ...overrides } : config;
}

const configStore = createMachineConfigStore();
let machineConfig = applyUrlConfigOverrides(configStore.load() || loadMockMachineConfig());
assertValidMachineConfig(machineConfig);

// Selección de controlador ESP32 — Etapa 1 (smoke test de transporte
// real). Explícita y fail-closed: machineConfig.esp32Mode='real' es la
// ÚNICA forma de obtener el adaptador real; cualquier otro valor (o su
// ausencia, como en loadMockMachineConfig()) usa el mock. Si alguien
// pide 'real' sin los datos que createRealEsp32Adapter ya exige
// (esp32Id/esp32Address), esto falla fuerte aquí mismo — nunca cae al
// mock en silencio.
function resolveEsp32Controller(config) {
  if (config.esp32Mode === 'real') return createRealEsp32Adapter({ machineConfig: config });
  if (config.esp32Mode === undefined || config.esp32Mode === 'mock') return createMockEsp32Controller();
  throw new Error(`[FreshTouch] machineConfig.esp32Mode desconocido: "${config.esp32Mode}" (debe ser "mock" o "real").`);
}

const operation = createOperationSession();
const payment = createMockPaymentProvider({ simulatedDelayMs: 0 });
const esp32 = resolveEsp32Controller(machineConfig);
const nativeBridge = createMockNativeBridge();
const admin = createAdminSession({ nativeBridge });

// Pago real con Cubo QPOS Cute (tarjeta) — a diferencia de `payment`
// arriba (mock, usado por QR/código de caja/promoción, sin tocar), este
// SÍ habla con hardware real. No se construye aquí de una vez: mode
// 'web-sdk' exige que window.CuboPagoSDK ya exista (el <script> de
// index.html) y que haya una API key de sesión (ver
// payment/cubo/apiKeySession.js) — ninguna de las dos está garantizada al
// cargar la página. Se construye perezosamente en getCuboPayment(), la
// primera vez que alguien intenta pagar con POS.
let cuboPayment = null;

function getCuboPayment() {
  if (!cuboPayment) {
    cuboPayment = createCuboCardProvider({ mode: 'web-sdk', machineConfig, apiKey: getApiKey() });
    cuboPayment.onResult(renderPosScreen);
  }
  return cuboPayment;
}

// Se llama cuando cambia la API key de sesión (ver renderAdminBody): el
// proveedor viejo, si existe, queda descartado — la próxima vez que
// alguien pague con POS, getCuboPayment() construye uno nuevo con la
// clave nueva. No se reutiliza el proveedor viejo con una clave distinta.
function resetCuboPayment() {
  cuboPayment = null;
}

// --- Estado local de la sesión de UI — mismas variables que STATE en app.js de HX01 ---
const STATE = {
  plan: null,
  sessStep: 1,
  codeType: null,
  codeInput: '',
  pinInput: '',
  admTaps: 0,
  admTimer: null,
  role: null,
  doorOpen: false,
  provisioningErrors: {},
  provisioningDraft: null,
};

let toastTmr = null;
let qrTimerInterval = null;
let qrTimerSecs = 180;
let qrPollTO = null;
let cycTimer = null;
let extraTimer = null;
let doneTimer = null;
let cyPhIdx = 0;
let cySecs = 0;
let cyDur = 0;
let cyCurPh = null;

function currentPrice() {
  return STATE.plan === 'basic' ? machineConfig.prices.basic : machineConfig.prices.premium;
}

// Fases del ciclo — misma estructura de 3 fases que HX01 (Vapor/Secado/
// Aroma), duraciones acortadas a propósito para Fase 1 (demostrar el
// flujo sin esperar minutos reales) — Fase 3 (ESP32 real) las hará
// depender de la confirmación real del hardware, no de un temporizador
// local fijo.
// ETAPA 2: la tercera fase (antes "aroma", comp: null — no accionaba
// ningún relé) ahora usa 'luzuv' (GPIO18, ya probado físicamente en
// ETAPA 1). Duración sin cambios (dur: 2 en ambos planes) — no se inventa
// una nueva, queda documentado que puede no ser la ideal para UV, es
// decisión pendiente para más adelante.
const CYCLES = {
  basic: [
    { nm: 'cyc_v', ico: '🌫️', lbl: 'p1b', dur: 3, comp: 'vapor' },
    { nm: 'cyc_d', ico: '💨', lbl: 'p2b', dur: 2, comp: 'secado' },
    { nm: 'cyc_a', ico: '🔆', lbl: 'p3b', dur: 2, comp: 'luzuv' },
  ],
  premium: [
    { nm: 'cyc_v', ico: '🌫️', lbl: 'p1p', dur: 4, comp: 'vapor' },
    { nm: 'cyc_d', ico: '💨', lbl: 'p2p', dur: 3, comp: 'secado' },
    { nm: 'cyc_a', ico: '🔆', lbl: 'p3p', dur: 2, comp: 'luzuv' },
  ],
};

// --- toast — mismo comportamiento que app.js de HX01 (línea 965) ---
function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast on ${type || 'in'}`;
  clearTimeout(toastTmr);
  toastTmr = setTimeout(() => el.classList.remove('on'), 3000);
}

// --- Navegación ---
function go(id) {
  if (id === 's-idle') {
    clearInterval(cycTimer);
    clearInterval(extraTimer);
    clearInterval(doneTimer);
    clearInterval(qrTimerInterval);
    clearTimeout(qrPollTO);
  }
  showScreen(id);
}

// --- Idioma ---
function toggleLang() {
  setLang(getLang() === 'es' ? 'en' : 'es');
  applyLang(machineConfig.prices);
  if (STATE.role) renderAdminBody();
}

// --- Admin: entrada oculta (mismo patrón que admTap() de HX01) ---
function admTap() {
  STATE.admTaps++;
  clearTimeout(STATE.admTimer);
  if (STATE.admTaps >= 3) {
    STATE.admTaps = 0;
    openPIN();
  } else {
    STATE.admTimer = setTimeout(() => { STATE.admTaps = 0; }, 1500);
  }
}

function openPIN() {
  STATE.pinInput = '';
  updatePinDots();
  document.getElementById('pin-err').textContent = '';
  document.getElementById('pin-ov').classList.add('on');
}

function closePIN() {
  document.getElementById('pin-ov').classList.remove('on');
  STATE.pinInput = '';
}

function pinTap(k) {
  if (k === 'DEL') STATE.pinInput = STATE.pinInput.slice(0, -1);
  else if (STATE.pinInput.length < 6) STATE.pinInput += k;
  updatePinDots();
}

function updatePinDots() {
  document.querySelectorAll('.pin-dot').forEach((d, i) => d.classList.toggle('on', i < STATE.pinInput.length));
}

async function checkPIN() {
  const ok = await admin.authenticate(STATE.pinInput);
  if (ok) {
    STATE.role = admin.getRole(); // 'sa'|'ow'|'tc'|'tn' — ver admin/mockAdminAuth.js
    closePIN();
    renderAdminBody();
    go('s-admin');
  } else {
    document.getElementById('pin-err').textContent = 'PIN incorrecto';
    setTimeout(() => {
      STATE.pinInput = '';
      updatePinDots();
      document.getElementById('pin-err').textContent = '';
    }, 900);
  }
}

function exitAdmin() {
  admin.logout();
  STATE.role = null;
  STATE.provisioningErrors = {};
  STATE.provisioningDraft = null;
  go('s-idle');
}

// Gating por rol — réplica del patrón real de HX01 (app.js renderAdmin(),
// líneas 810-894): Settings (aquí, Provisioning) es exclusivo de 'sa'.
// 'ow' puede ver la identidad de la máquina (igual que ve Stats/Codes/
// Contacts en HX01 real) pero no editarla. 'tc'/'tn' solo ven
// Diagnóstico — HX01 real les da además el botón de puerta y, a 'tc',
// el de emergencia; esos widgets no existen todavía en esta arquitectura
// modular (no hay sesión activa que abrir desde el panel de admin en
// Fase 1-2) y quedan pendientes para cuando haya un caso de uso real que
// los necesite, no se inventan aquí solo por paridad visual.
const ROLE_LABEL_KEY = { sa: 'r_sa', ow: 'r_ow', tc: 'r_tc', tn: 'r_tn' };
const ROLE_BADGE_CLASS = { sa: 'r-sa', ow: 'r-ow', tc: 'r-tc', tn: 'r-tn' };

async function renderAdminBody() {
  const role = STATE.role;
  const l = t();
  const diag = await nativeBridge.getDiagnostics();
  const body = document.getElementById('adm-body');
  const midEl = document.getElementById('adm-mid');
  if (midEl) midEl.textContent = `Máquina ${machineConfig.machineId}`;

  const badgeEl = document.getElementById('role-bdg');
  if (badgeEl) {
    badgeEl.className = `role-bdg ${ROLE_BADGE_CLASS[role] || 'r-sa'}`;
    // Antes decía siempre "MOCK" a secas (arrastrado de Fase 1, cuando
    // todo era mock siempre) — ya no es cierto desde que existe el modo
    // real de ESP32 (Etapa 1). Refleja machineConfig.esp32Mode de verdad,
    // para poder confirmar desde la propia tablet, sin DevTools, si se
    // está hablando con el ESP32 real o con el mock.
    const esp32ModeLabel = machineConfig.esp32Mode === 'real' ? 'ESP32: REAL' : 'ESP32: MOCK';
    badgeEl.innerHTML = `${l[ROLE_LABEL_KEY[role]] || ''} <span class="mock-badge">${esp32ModeLabel}</span>`;
  }

  const diagRows = Object.entries(diag)
    .filter(([k]) => k !== 'mock')
    .map(([k, v]) => `<div class="admin-panel-row"><span class="k">${k}</span><span class="v diag-mock">${v}</span></div>`)
    .join('');

  const canViewIdentity = role === 'sa' || role === 'ow';
  const canProvision = role === 'sa';
  // ETAPA 2: recuperación manual de un ciclo atascado tras un fallo real
  // de ESP32 (ver handleCycleFailure() en main.js) — exclusiva de Admin,
  // nunca visible ni accesible desde ninguna pantalla de cliente
  // (condiciones #8/#9 de la autorización).
  const canResetCycle = role === 'sa' || role === 'tc';

  let html = '';

  if (canViewIdentity) {
    const configRows = Object.entries(machineConfig)
      .map(([k, v]) => `<div class="admin-panel-row"><span class="k">${k}</span><span class="v">${typeof v === 'object' ? JSON.stringify(v) : v}</span></div>`)
      .join('');
    html += `<div class="admin-panel-section"><h3>Identidad de máquina</h3>${configRows}</div>`;
  }

  html += `<div class="admin-panel-section"><h3>Diagnóstico</h3>${diagRows}</div>`;

  if (canResetCycle) {
    html += `<div class="admin-panel-section"><h3>Recuperación</h3>
      <button onclick="window.__ftaResetStuckCycle()">Reiniciar ciclo atascado</button>
    </div>`;
  }

  if (canProvision) {
    const hasSecret = await nativeBridge.hasSecret('cuboApiKey');
    html += renderProvisioningSection(hasSecret);
    html += `<div class="admin-panel-section"><h3>Exportar / Reset</h3>
      <button onclick="window.__ftaExportConfig()">Exportar configuración (sin secretos)</button>
      <button onclick="window.__ftaResetMachine()">Reset de máquina (mock)</button>
    </div>`;
  } else {
    html += `<div class="admin-panel-section"><h3>Provisioning — Configuración de máquina</h3>
      <div class="prov-status diag-mock">${l.prov_locked}</div>
    </div>`;
  }

  body.innerHTML = html;
}

// --- Provisioning (Fase 2) ---
// Formulario dentro del panel de admin — nunca se renderiza fuera de
// #adm-body, y #adm-body nunca tiene contenido en index.html (solo se
// llena vía renderAdminBody(), que solo se invoca después de un PIN
// correcto en checkPIN()). El cliente normal jamás ve este formulario.
function renderProvisioningSection(hasSecret) {
  // Si el último intento de guardar falló la validación, se sigue
  // mostrando lo que la persona escribió (STATE.provisioningDraft), no la
  // config vieja — si no, el error aparecería junto a un campo que ya no
  // muestra el valor inválido que lo causó, muy confuso. Con guardado
  // exitoso o al abrir el panel por primera vez, provisioningDraft es
  // null y se muestra machineConfig (la config activa real).
  const c = STATE.provisioningDraft || machineConfig;
  const provisioned = configStore.isProvisioned();
  const errors = STATE.provisioningErrors || {};
  const esc = (v) => String(v ?? '').replace(/"/g, '&quot;');
  // errorKey usa las mismas claves que devuelve provisioningValidation.js
  // (machineId, esp32Address, "prices.basic", ...) — deliberadamente
  // distintas del id del <input> (prov-machineId, etc.) para no acoplar
  // el esquema de validación a los ids del DOM.
  const errFor = (errorKey) => (errors[errorKey] ? `<div class="prov-err">${errors[errorKey]}</div>` : '');
  const field = (id, label, value, errorKey, opts = {}) => `
    <div class="prov-field">
      <label class="prov-lbl" for="${id}">${label}</label>
      <input class="prov-inp" id="${id}" type="${opts.type || 'text'}" value="${esc(value)}">
      ${errFor(errorKey)}
    </div>`;
  const select = (id, label, value, errorKey, options) => `
    <div class="prov-field">
      <label class="prov-lbl" for="${id}">${label}</label>
      <select class="prov-inp" id="${id}">
        ${options.map((o) => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
      ${errFor(errorKey)}
    </div>`;

  return `
    <div class="admin-panel-section">
      <h3>Provisioning — Configuración de máquina</h3>
      <div class="prov-status ${provisioned ? 'diag-ok' : 'diag-mock'}">
        ${provisioned ? '✅ Máquina configurada y guardada' : '⚠️ Sin configuración guardada — mostrando valores mock (Fase 1)'}
      </div>

      <div class="prov-group-title">Identidad</div>
      ${field('prov-machineId', 'Machine ID', c.machineId, 'machineId')}
      ${field('prov-machineName', 'Nombre de máquina', c.machineName, 'machineName')}
      ${field('prov-ownerId', 'Owner ID', c.ownerId, 'ownerId')}
      ${field('prov-tenantId', 'Tenant ID', c.tenantId, 'tenantId')}
      ${field('prov-location', 'Ubicación', c.location, 'location')}

      <div class="prov-group-title">ESP32</div>
      ${field('prov-esp32Id', 'ESP32 ID', c.esp32Id, 'esp32Id')}
      ${field('prov-esp32Address', 'ESP32 dirección/IP', c.esp32Address, 'esp32Address')}

      <div class="prov-group-title">Precios</div>
      ${field('prov-priceBasic', 'Precio Básico', c.prices.basic, 'prices.basic', { type: 'number' })}
      ${field('prov-pricePremium', 'Precio Premium', c.prices.premium, 'prices.premium', { type: 'number' })}

      <div class="prov-group-title">Pago</div>
      ${select('prov-paymentProvider', 'Proveedor de pago', c.paymentProvider, 'paymentProvider', ['mock', 'cubo'])}
      ${select('prov-cuboEnvironment', 'Cubo environment', c.cuboEnvironment, 'cuboEnvironment', ['sandbox', 'production'])}
      ${field('prov-cuboPosId', 'Cubo POS ID', c.cuboPosId, 'cuboPosId')}
      ${field('prov-cuboPosSerial', 'Cubo POS Serial', c.cuboPosSerial, 'cuboPosSerial')}

      <div class="prov-group-title">Secretos (SecretProvider — mock, NOT PRODUCTION)</div>
      <div class="admin-panel-row">
        <span class="k">Cubo API Key</span>
        <span class="v ${hasSecret ? 'diag-ok' : 'diag-mock'}">${hasSecret ? 'configurada (mock, valor no retenido)' : 'no configurada'}</span>
      </div>
      <div class="mock-controls">
        <span class="mock-controls-label">Solo simula la existencia — no hay campo real para escribir la clave (eso llega en Fase 6 con Keystore)</span>
        <button onclick="window.__ftaSimSetSecret()">Simular guardar Cubo API Key (mock)</button>
        <button onclick="window.__ftaSimClearSecret()">Borrar (mock)</button>
      </div>

      <div class="prov-group-title">Cubo — API Key real (integración de esta fase)</div>
      <div class="admin-panel-row">
        <span class="k">Estado (sesión del navegador)</span>
        <span class="v ${hasApiKey() ? 'diag-ok' : 'diag-bad'}">${hasApiKey() ? 'configurada para esta sesión' : 'no configurada'}</span>
      </div>
      <div class="mock-controls">
        <span class="mock-controls-label">Vive solo en memoria mientras esta pestaña esté abierta — nunca se guarda en NVS ni en ningún almacenamiento persistente del navegador. Se pierde al recargar. Necesaria para "Pagar con Tarjeta" en la pantalla de cliente.</span>
        <div class="prov-field">
          <label class="prov-lbl" for="prov-cuboApiKey">Cubo API Key</label>
          <input class="prov-inp" id="prov-cuboApiKey" type="password" placeholder="Se pierde al recargar la página">
        </div>
        <button onclick="window.__ftaSetCuboApiKey()">Usar en esta sesión</button>
        <button onclick="window.__ftaClearCuboApiKey()">Borrar de esta sesión</button>
      </div>

      <div class="prov-actions">
        <button class="prov-save" onclick="window.__ftaSaveProvisioning()">Guardar configuración</button>
        <button class="prov-restore" onclick="window.__ftaRestoreProvisioning()">Restaurar a mock</button>
      </div>
    </div>`;
}

function readProvisioningDraft() {
  const val = (id) => document.getElementById(id).value.trim();
  return {
    machineId: val('prov-machineId'),
    machineName: val('prov-machineName'),
    ownerId: val('prov-ownerId'),
    tenantId: val('prov-tenantId'),
    location: val('prov-location'),
    esp32Id: val('prov-esp32Id'),
    esp32Address: val('prov-esp32Address'),
    prices: {
      basic: Number(val('prov-priceBasic')),
      premium: Number(val('prov-pricePremium')),
    },
    paymentProvider: val('prov-paymentProvider'),
    cuboEnvironment: val('prov-cuboEnvironment'),
    cuboPosId: val('prov-cuboPosId'),
    cuboPosSerial: val('prov-cuboPosSerial'),
  };
}

async function saveProvisioning() {
  const draft = readProvisioningDraft();
  const { valid, errors } = validateDraft(draft);
  if (!valid) {
    STATE.provisioningErrors = errors;
    STATE.provisioningDraft = draft; // conserva lo escrito para que la persona pueda corregirlo, no lo pierde
    await renderAdminBody();
    toast('Revisa los campos marcados en rojo', 'er');
    return;
  }
  STATE.provisioningErrors = {};
  STATE.provisioningDraft = null;
  machineConfig = configStore.save(draft);
  applyLang(machineConfig.prices);
  await renderAdminBody();
  toast('Configuración guardada', 'ok');
}

async function restoreProvisioning() {
  configStore.reset();
  machineConfig = loadMockMachineConfig();
  STATE.provisioningErrors = {};
  STATE.provisioningDraft = null;
  applyLang(machineConfig.prices);
  await renderAdminBody();
  toast('Restaurado a configuración mock', 'in');
}

async function simSetSecret() {
  await nativeBridge.saveSecret('cuboApiKey', 'MOCK-VALUE-NEVER-RETAINED');
  await renderAdminBody();
}

async function simClearSecret() {
  await nativeBridge.clearSecret('cuboApiKey');
  await renderAdminBody();
}

async function setCuboApiKey() {
  const input = document.getElementById('prov-cuboApiKey');
  const value = input ? input.value : '';
  if (!value) {
    toast('Escribe una API key antes de usarla', 'er');
    return;
  }
  setApiKey(value);
  resetCuboPayment(); // fuerza reconstruir el proveedor con la clave nueva
  await renderAdminBody();
  toast('API key de Cubo activa para esta sesión (se pierde al recargar)', 'ok');
}

async function clearCuboApiKey() {
  clearApiKey();
  resetCuboPayment();
  await renderAdminBody();
  toast('API key de Cubo borrada de esta sesión', 'in');
}

function exportConfig() {
  const json = JSON.stringify(machineConfig, null, 2);
  console.log('[export mock — Fase 1 no descarga archivos, solo lo muestra en consola]', json);
  alert('Configuración exportada a la consola del navegador (Fase 1, sin descarga de archivo todavía).');
}

function resetMachine() {
  const confirmation = prompt(`Escribe "${machineConfig.machineId}" para confirmar el reset (mock — no borra nada real todavía):`);
  if (confirmation === machineConfig.machineId) {
    alert('Reset (mock) confirmado. En una implementación real, esto dejaría la instalación en estado UNCONFIGURED.');
  }
}

// --- Plan / selección de servicio ---
function selectPlan(plan) {
  STATE.plan = plan;
  operation.send('SELECT_SERVICE');
  const price = currentPrice();
  const label = plan === 'basic' ? t().basic_name : t().premium_name;
  document.getElementById('pay-plan-lbl').textContent = `${label} — Q${price}`;
  document.getElementById('qr-amt-lbl').textContent = `Q${price}.00`;
  document.getElementById('qr-amt-big').textContent = `Q${price}.00`;
  go('s-payment');
}

// --- QR (mock — sin Cubo real) ---
function openQR() {
  const price = currentPrice();
  document.getElementById('qr-amt-lbl').textContent = `Q${price}.00`;
  document.getElementById('qr-amt-big').textContent = `Q${price}.00`;
  document.getElementById('qr-img').src =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><rect width="220" height="220" fill="%23f0f0f0" rx="12"/><text x="110" y="115" text-anchor="middle" font-size="14" fill="%23888">MOCK — sin Cubo real</text></svg>';
  go('s-qr');
  startQRTimer();
  operation.send('REQUEST_PAYMENT');
  payment.selectService({ label: STATE.plan, amount: price });
}

function startQRTimer() {
  clearInterval(qrTimerInterval);
  qrTimerSecs = 180;
  updateQRTimer();
  qrTimerInterval = setInterval(() => {
    qrTimerSecs--;
    updateQRTimer();
    if (qrTimerSecs <= 0) {
      stopQR();
      toast(t().tk.qr_exp, 'er');
      go('s-payment');
    }
  }, 1000);
}

function updateQRTimer() {
  const m = Math.floor(qrTimerSecs / 60), s = qrTimerSecs % 60;
  document.getElementById('qr-timer').textContent = `⏱ ${m}:${s < 10 ? '0' : ''}${s}`;
}

function stopQR() {
  clearInterval(qrTimerInterval);
  clearTimeout(qrPollTO);
}

function cancelQR() {
  stopQR();
  operation.send('CANCEL');
  go('s-payment');
}

async function qrManualConfirm() {
  stopQR();
  await payment.connectPos();
  await payment.createPayment({ outcome: 'SUCCESS' });
  toast(t().tk.qr_ok, 'ok');
  if (payment.canStartCycle()) operation.send('PAYMENT_APPROVED');
  setTimeout(activateSess, 400);
}

// --- Pago con tarjeta — POS Cubo QPOS Cute (real, Web Bluetooth) ---
// A diferencia de QR/código de caja/promoción (mock arriba), esta
// pantalla habla con hardware real cuando hay una API key de sesión
// configurada y el script del SDK cargó. Se detiene deliberadamente en
// PAYMENT_SUCCESS — no llama a activateSess()/ESP32 todavía (autorización
// explícita de esta fase: el enlace pago->ciclo físico queda desconectado
// hasta validar el firmware v3 en hardware).
function openPos() {
  const price = currentPrice();
  document.getElementById('pos-amt-lbl').textContent = `Q${price}.00`;
  document.getElementById('pos-amt-big').textContent = `Q${price}.00`;
  operation.send('REQUEST_PAYMENT');
  go('s-pos');

  let provider;
  try {
    provider = getCuboPayment();
  } catch (err) {
    renderPosScreen({ state: null, event: 'init_failed', message: err.message });
    return;
  }
  const label = STATE.plan === 'basic' ? t().basic_name : t().premium_name;
  provider.selectService({ label, amount: price });
  renderPosScreen({ state: provider.getStatus() });
}

async function posConnect() {
  // Llamada directamente desde el manejador de click del botón "Conectar
  // POS" en index.html — a propósito, no envuelta en más async antes del
  // primer await real: Web Bluetooth exige un gesto de usuario genuino
  // para el primer emparejamiento, y esta app no intenta simularlo ni
  // saltárselo.
  try {
    await cuboPayment.connectPos();
    if (cuboPayment.getStatus() === CUBO_STATES.POS_CONNECTED) {
      await cuboPayment.createPayment();
    }
  } catch (err) {
    toast(`POS: ${err.message}`, 'er');
  }
}

function posCancel() {
  const status = cuboPayment?.getStatus();
  if (status === CUBO_STATES.WAITING_FOR_CARD || status === CUBO_STATES.PROCESSING_PAYMENT) {
    cuboPayment.cancelPayment();
  }
}

async function posRetry() {
  try {
    await cuboPayment.retryPayment();
    if (cuboPayment.getStatus() === CUBO_STATES.POS_CONNECTED) {
      await cuboPayment.createPayment();
    }
  } catch (err) {
    toast(`POS: ${err.message}`, 'er');
  }
}

// Botón "← Volver" de s-pos — nunca desconecta el POS (requisito
// explícito: mantener la conexión Bluetooth para el siguiente cliente
// siempre que sea posible). Si había un cobro en curso, lo cancela antes
// de salir; si no, simplemente vuelve, dejando al proveedor donde estaba.
function cancelPos() {
  posCancel();
  operation.send('CANCEL');
  go('s-payment');
}

// Botón "Volver al inicio" tras PAYMENT_SUCCESS — hallazgo confirmado:
// antes esto solo llamaba a go('s-idle'), que es navegación puramente
// visual. cuboPayment se quedaba internamente en PAYMENT_SUCCESS para
// siempre, así que el segundo cliente nunca podía pasar de
// selectService()/connectPos() (ambos exigen no estar ya en
// PAYMENT_SUCCESS). acknowledgePaymentAndReturnToIdle() consume esa
// autorización y deja el proveedor listo para un cliente nuevo — sin
// tocar el ESP32 (no se llama, no se importa) y sin desconectar ni
// reconectar el POS (el método no toca `adapter` en absoluto).
function posAcknowledgeAndReturn() {
  try {
    cuboPayment?.acknowledgePaymentAndReturnToIdle();
  } catch (err) {
    // No debería pasar en el flujo normal (el botón solo se muestra en
    // PAYMENT_SUCCESS) — si pasa, no bloquear al operador por eso: solo
    // registrar y seguir navegando a IDLE de todos modos.
    console.warn('[FreshTouch] posAcknowledgeAndReturn()', err.message);
  }
  go('s-idle');
}

function renderPosScreen(snapshot) {
  const statusEl = document.getElementById('pos-status-txt');
  const actionsEl = document.getElementById('pos-actions');
  if (!statusEl || !actionsEl) return; // la pantalla no está montada todavía

  const state = snapshot.state ?? cuboPayment?.getStatus();
  const connectBtn = '<button class="btn-qr-manual" onclick="posConnect()">Conectar POS</button>';
  const cancelBtn = '<button class="btn-back" onclick="posCancel()">Cancelar</button>';
  const retryBtn = '<button class="btn-qr-manual" onclick="posRetry()">Reintentar</button>';
  const homeBtn = '<button class="btn-back" onclick="posAcknowledgeAndReturn()">Volver al inicio</button>';

  if (snapshot.event === 'init_failed') {
    statusEl.textContent = `No se pudo iniciar el pago con POS: ${snapshot.message}`;
    actionsEl.innerHTML = '<button class="btn-back" onclick="go(\'s-payment\')">← Volver</button>';
    return;
  }

  if (snapshot.event === 'payment_pending') {
    statusEl.textContent = `⏳ ${snapshot.message || 'No se pudo confirmar el pago con el banco todavía.'}`;
    actionsEl.innerHTML = cancelBtn;
    return;
  }

  switch (state) {
    case CUBO_STATES.IDLE:
    case CUBO_STATES.SERVICE_SELECTED:
    case CUBO_STATES.PAYMENT_METHOD_SELECTED:
      statusEl.textContent = 'Presiona conectar para continuar';
      actionsEl.innerHTML = connectBtn;
      break;
    case CUBO_STATES.CONNECTING_POS:
      statusEl.textContent = 'Conectando con el POS — autoriza el emparejamiento Bluetooth si tu navegador lo pide...';
      actionsEl.innerHTML = '';
      break;
    case CUBO_STATES.POS_CONNECTED:
      statusEl.textContent = 'POS conectado. Iniciando el cobro...';
      actionsEl.innerHTML = '';
      break;
    case CUBO_STATES.WAITING_FOR_CARD:
      statusEl.textContent = 'Esperando tarjeta — acerca o inserta la tarjeta en el POS';
      actionsEl.innerHTML = cancelBtn;
      break;
    case CUBO_STATES.PROCESSING_PAYMENT:
      statusEl.textContent = 'Procesando pago...';
      actionsEl.innerHTML = cancelBtn;
      break;
    case CUBO_STATES.PAYMENT_SUCCESS:
      statusEl.textContent = '✅ Pago aprobado. Listo para iniciar.';
      actionsEl.innerHTML = homeBtn;
      operation.send('PAYMENT_APPROVED');
      break;
    case CUBO_STATES.PAYMENT_DECLINED:
      statusEl.textContent = `❌ Pago rechazado.${snapshot.message ? ' ' + snapshot.message : ''}`;
      actionsEl.innerHTML = retryBtn;
      break;
    case CUBO_STATES.PAYMENT_CANCELLED:
      statusEl.textContent = 'Pago cancelado.';
      actionsEl.innerHTML = retryBtn;
      break;
    case CUBO_STATES.PAYMENT_ERROR:
      statusEl.textContent = `⚠️ Error del POS.${snapshot.message ? ' ' + snapshot.message : ''}`;
      actionsEl.innerHTML = retryBtn;
      break;
    case CUBO_STATES.PAYMENT_TIMEOUT:
      statusEl.textContent = 'Tiempo de espera agotado.';
      actionsEl.innerHTML = retryBtn;
      break;
    default:
      statusEl.textContent = 'Presiona conectar para continuar';
      actionsEl.innerHTML = connectBtn;
  }
}

// --- Código de caja / promoción (mock) ---
function openCode(type) {
  STATE.codeType = type;
  STATE.codeInput = '';
  document.getElementById('code-disp').textContent = '_';
  const l = t();
  const cash = type === 'cash';
  document.getElementById('code-hdr-t').textContent = cash ? l.code_cash_t : l.code_pro_t;
  document.getElementById('code-hdr-s').textContent = cash ? l.code_cash_s : l.code_pro_s;
  document.getElementById('code-ico').textContent = cash ? '💵' : '🎁';
  document.getElementById('code-ttl').textContent = cash ? l.code_cash_t : l.code_pro_t;
  document.getElementById('code-sub').innerHTML = (cash ? l.code_cash_s : l.code_pro_s) + ' <span class="mock-badge">MOCK</span>';
  go('s-code');
}

function kp(key) {
  if (key === 'DEL') STATE.codeInput = STATE.codeInput.slice(0, -1);
  else if (key === 'OK') { validateCodeMock(); return; }
  else if (STATE.codeInput.length < 12) STATE.codeInput += key;
  document.getElementById('code-disp').textContent = STATE.codeInput || '_';
}

async function validateCodeMock() {
  // MOCK: cualquier código no vacío se acepta — Fase 1 no tiene un
  // Data Store real de códigos que validar (eso es Fase 2+).
  if (STATE.codeInput.length === 0) {
    toast(t().tk.code_bad, 'er');
    return;
  }
  toast(t().tk.code_ok, 'ok');
  operation.send('REQUEST_PAYMENT');
  await payment.selectService({ label: STATE.plan, amount: currentPrice() });
  await payment.connectPos();
  await payment.createPayment({ outcome: 'SUCCESS' });
  if (payment.canStartCycle()) operation.send('PAYMENT_APPROVED');
  setTimeout(activateSess, 400);
}

// --- Sesión (abrir puerta / iniciar) ---
function activateSess() {
  // Corrección de Fase 3: antes de esto, CONFIRM_READY nunca se enviaba
  // — operationState quedaba atascado en PAYMENT_APPROVED para siempre
  // (OPEN_DOOR no es una transición válida desde ahí), así que
  // canRunCycle() jamás llegaba a ser true por el flujo real. No era
  // visible porque nada dependía todavía de ese estado; ahora que
  // assertCanStartCycle() sí lo exige (ver startCycle()), hace falta que
  // la cadena de estados avance de verdad.
  operation.send('CONFIRM_READY');
  STATE.sessStep = 1;
  STATE.doorOpen = false;
  const plan = STATE.plan === 'basic' ? t().basic_name : t().premium_name;
  document.getElementById('sess-plan-hdr').textContent = `${plan} Q${currentPrice()}`;
  updateSessUI();
  go('s-session');
}

function updateSessUI() {
  const l = t();
  ['ss1', 'ss2', 'ss3'].forEach((id, i) => document.getElementById(id).classList.toggle('on', i < STATE.sessStep));
  const btn = document.getElementById('sess-btn');
  if (STATE.sessStep === 1) {
    document.getElementById('sess-anim').textContent = '🚪';
    document.getElementById('sess-inst').textContent = l.sess_open_i;
    document.getElementById('sess-sub').textContent = l.sess_open_s;
    btn.textContent = l.btn_open;
    btn.className = 'btn-act blue';
  } else {
    document.getElementById('sess-anim').innerHTML = '<img src="assets/img/img02.png" style="height:64px;object-fit:contain;">';
    document.getElementById('sess-inst').textContent = l.sess_start_i;
    document.getElementById('sess-sub').textContent = l.sess_start_s;
    btn.textContent = l.btn_start;
    btn.className = 'btn-act green';
  }
}

// ETAPA 2 — setDoor() envía el comando del relé "puerta" al ESP32.
// LIMITACIÓN DOCUMENTADA (condición #10 de la autorización): un 200 OK
// del ESP32 solo confirma que el comando fue RECIBIDO — este firmware no
// tiene ningún sensor de puerta, así que nada aquí puede confirmar que el
// electroimán físicamente abrió o retuvo la puerta.
//
// POLARIDAD SIN VERIFICAR (condición #5): open=true sigue usando la
// misma convención heredada desde Fase 1 ("abrir"), open=false para
// "cerrar/asegurar" (nuevo en ETAPA 2). No se invierte ni se asume nada
// distinto — no se pudo hacer la prueba física porque la puerta todavía
// no está conectada. Antes de operar con clientes reales, hay que
// confirmar físicamente cuál sentido (ON/OFF) corresponde a abrir vs.
// retener, tal como se pidió.
async function setDoor(open) {
  await esp32.setRelay('puerta', open);
  STATE.doorOpen = open;
  toast(open ? t().tk.door_opened : t().tk.door_closed, open ? 'in' : 'ok');
}

// Fallo real de ESP32 en cualquier punto del ciclo físico (puerta, vapor,
// secado, UV, o notifyCycleDone) — detiene todo de inmediato y deja un
// estado de error visible, SIN ninguna acción disponible para el cliente
// (nunca un botón de reintentar/cancelar/volver desde aquí). Se navega a
// s-cycle sin importar en qué pantalla estaba el fallo (ej. abriendo la
// puerta, todavía en s-session) para tener un único lugar consistente
// donde mostrar el error. La recuperación es SIEMPRE manual desde Admin
// (ver adminResetStuckCycle()) — nunca automática (condiciones #8/#9).
function handleCycleFailure(err) {
  console.error('[FreshTouch] Ciclo interrumpido — fallo real de ESP32:', err);
  clearInterval(cycTimer);
  clearInterval(extraTimer);
  clearInterval(doneTimer);
  go('s-cycle');
  const l = t();
  document.getElementById('cyc-ico').textContent = '⚠️';
  document.getElementById('cyc-ph-nm').textContent = l.cycle_error_nm;
  document.getElementById('cyc-ph-lbl').textContent = l.cycle_error_lbl;
  toast(l.cycle_error_nm, 'er');
}

async function sessAction() {
  if (STATE.sessStep === 1) {
    try {
      await setDoor(true);
    } catch (err) {
      handleCycleFailure(err);
      return;
    }
    operation.send('OPEN_DOOR');
    STATE.sessStep = 2;
    updateSessUI();
  } else {
    startCycle();
  }
}

// --- Ciclo ---
async function startCycle() {
  operation.send('START_CYCLE');
  // Fail-closed (Fase 3): si el intento de transición de arriba no fue
  // válido — p. ej. algo llamó a startCycle() sin haber pasado por un
  // pago aprobado — operation.getState() NO habrá llegado a
  // CYCLE_RUNNING, y esta guardia lo detiene aquí, antes de emitir
  // cualquier orden real al ESP32. No es una comprobación cosmética: es
  // la misma canRunCycle() que ya usan y prueban operationState/ y
  // esp32/cycleSafety.js.
  try {
    assertCanStartCycle(operation.getState());
  } catch (err) {
    console.error(err);
    toast('No se puede iniciar el ciclo: pago no confirmado.', 'er');
    go('s-idle');
    return;
  }
  cyPhIdx = 0;
  document.getElementById('cyc-mid').textContent = machineConfig.machineId;
  go('s-cycle');
  // ETAPA 2: asegurar/retener la puerta ANTES de activar cualquier
  // actuador de ciclo — si esto falla, vapor/secado/UV NUNCA arrancan
  // (condición #10, la regla de seguridad más importante de esta etapa).
  try {
    await setDoor(false);
  } catch (err) {
    handleCycleFailure(err);
    return;
  }
  runPhase();
}

async function runPhase() {
  const phases = CYCLES[STATE.plan];
  if (cyPhIdx >= phases.length) { cycleDone(); return; }
  cyCurPh = phases[cyPhIdx];
  cyDur = cyCurPh.dur;
  cySecs = cyCurPh.dur;
  const l = t();
  document.getElementById('cyc-ico').textContent = cyCurPh.ico;
  document.getElementById('cyc-ph-nm').textContent = l[cyCurPh.nm];
  document.getElementById('cyc-ph-lbl').textContent = l[cyCurPh.lbl];
  ['cp0', 'cp1', 'cp2'].forEach((id, i) => {
    document.getElementById(id).className = `cph${i < cyPhIdx ? ' done' : i === cyCurPh.ph ? ' cur' : i === cyPhIdx ? ' cur' : ''}`;
  });
  if (cyCurPh.comp) {
    try {
      await esp32.setRelay(cyCurPh.comp, true);
    } catch (err) {
      handleCycleFailure(err);
      return;
    }
  }
  updateCycTimer();
  clearInterval(cycTimer);
  cycTimer = setInterval(async () => {
    cySecs--;
    updateCycTimer();
    if (cySecs <= 0) {
      clearInterval(cycTimer);
      if (cyCurPh.comp) {
        try {
          await esp32.setRelay(cyCurPh.comp, false);
        } catch (err) {
          handleCycleFailure(err);
          return;
        }
      }
      cyPhIdx++;
      setTimeout(runPhase, 200);
    }
  }, 1000);
}

function updateCycTimer() {
  const m = Math.floor(cySecs / 60), s = cySecs % 60;
  document.getElementById('cyc-timer').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
  document.getElementById('cyc-prog').style.width = `${((cyDur - cySecs) / cyDur) * 100}%`;
}

async function cycleDone() {
  // ETAPA 2: solo si notifyCycleDone() tiene éxito se marca el ciclo como
  // terminado (operationState avanza, se muestra s-done). Si falla, NO se
  // simula un final exitoso — se detiene y requiere recuperación manual.
  try {
    await esp32.notifyCycleDone(STATE.plan);
  } catch (err) {
    handleCycleFailure(err);
    return;
  }
  operation.send('CYCLE_DONE');
  go('s-done');
  document.getElementById('btn-extra').style.display = 'block';
  document.getElementById('extra-run').style.display = 'none';
  startDoneTimer();
}

async function startExtraDry() {
  document.getElementById('btn-extra').style.display = 'none';
  document.getElementById('extra-run').style.display = 'block';
  try {
    await esp32.setRelay('secado', true);
  } catch (err) {
    console.error('[FreshTouch] startExtraDry() falló al encender secado:', err);
    toast('No se pudo activar el secado extra.', 'er');
    document.getElementById('extra-run').style.display = 'none';
    document.getElementById('btn-extra').style.display = 'block';
    return;
  }
  let s = 5; // acortado para Fase 1 — HX01 real usa 60s
  clearInterval(extraTimer);
  extraTimer = setInterval(async () => {
    s--;
    document.getElementById('extra-timer').textContent = `0:0${Math.max(s, 0)}`;
    if (s <= 0) {
      clearInterval(extraTimer);
      try {
        await esp32.setRelay('secado', false);
      } catch (err) {
        console.error('[FreshTouch] startExtraDry() falló al apagar secado:', err);
        toast('Error al apagar el secado extra — revisa manualmente.', 'er');
        return;
      }
      document.getElementById('extra-run').textContent = '✅ Listo';
    }
  }, 1000);
}

function startDoneTimer() {
  clearInterval(doneTimer);
  let s = 30;
  doneTimer = setInterval(() => {
    s--;
    const el = document.getElementById('done-auto-n');
    if (el) el.textContent = s;
    if (s <= 0) {
      clearInterval(doneTimer);
      finishSess();
    }
  }, 1000);
}

function finishSess() {
  clearInterval(doneTimer);
  clearInterval(extraTimer);
  clearInterval(cycTimer);
  operation.send('RETURN_TO_IDLE');
  go('s-idle');
}

// --- Factura (mock) ---
function submitInvoice() {
  const name = document.getElementById('inv-name').value.trim();
  const email = document.getElementById('inv-email').value.trim();
  if (!name || !email) { toast(t().tk.inv_f, 'er'); return; }
  toast('🧾 Factura enviada (mock, sin INFILE real)', 'ok');
  setTimeout(() => go('s-done'), 1200);
}

function closeEmg() {
  document.getElementById('emg-modal').classList.remove('on');
}

// ETAPA 2 — única forma de destrabar operationState tras un fallo real de
// ESP32 (ver handleCycleFailure()). Exclusiva del botón de Admin (rol
// sa/tc, ver renderAdminBody()) — nunca se llama automáticamente desde
// ningún camino de error del flujo de cliente.
function adminResetStuckCycle() {
  operation.send('RESET');
  go('s-idle');
  toast('Ciclo reiniciado desde Admin', 'in');
}

// --- Arranque ---
initBubbles();
applyLang(machineConfig.prices);

// Fase 3: la app intenta conectar con el controlador de ESP32 al
// arrancar — hoy el mock (siempre exitoso salvo que un test inyecte una
// falla). No bloquea el resto de la app si falla: un cliente debe poder
// seguir viendo pantallas / que el admin entre a diagnosticar aunque el
// ESP32 no responda; lo que sí queda fail-closed es el inicio del ciclo
// en sí (ver startCycle()), no la app entera.
esp32.connect().then((result) => {
  console.log(`[ESP32] connect() (modo "${machineConfig.esp32Mode || 'mock'}", esp32Address="${machineConfig.esp32Address}") exitoso:`, result);
}).catch((err) => {
  console.error(`[ESP32] connect() (modo "${machineConfig.esp32Mode || 'mock'}", esp32Address="${machineConfig.esp32Address}") falló al arrancar:`, err);
});

window.go = go;
window.toggleLang = toggleLang;
window.admTap = admTap;
window.closePIN = closePIN;
window.pinTap = pinTap;
window.checkPIN = checkPIN;
window.exitAdmin = exitAdmin;
window.selectPlan = selectPlan;
window.openQR = openQR;
window.cancelQR = cancelQR;
window.qrManualConfirm = qrManualConfirm;
window.openPos = openPos;
window.posConnect = posConnect;
window.posCancel = posCancel;
window.posRetry = posRetry;
window.cancelPos = cancelPos;
window.posAcknowledgeAndReturn = posAcknowledgeAndReturn;
window.openCode = openCode;
window.kp = kp;
window.sessAction = sessAction;
window.startExtraDry = startExtraDry;
window.finishSess = finishSess;
window.submitInvoice = submitInvoice;
window.closeEmg = closeEmg;
window.__ftaExportConfig = exportConfig;
window.__ftaResetMachine = resetMachine;
window.__ftaSaveProvisioning = saveProvisioning;
window.__ftaRestoreProvisioning = restoreProvisioning;
window.__ftaSimSetSecret = simSetSecret;
window.__ftaSimClearSecret = simClearSecret;
window.__ftaSetCuboApiKey = setCuboApiKey;
window.__ftaClearCuboApiKey = clearCuboApiKey;
window.__ftaResetStuckCycle = adminResetStuckCycle;
