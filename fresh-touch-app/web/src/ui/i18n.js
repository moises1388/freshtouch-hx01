// Textos ES/EN — copiados literalmente del objeto T de app.js de HX01
// (no reinterpretados, no resumidos). applyLang() reproduce exactamente
// el mismo mapeo id -> texto que ya usa HX01 en producción, adaptado solo
// para recibir los precios como parámetro en vez de leer un CFG global.

const T = {
  es: {
    idle_title: 'Limpieza Profesional<br>para tu <span>Casco</span>',
    idle_sub: 'Vapor &middot; Secado &middot; Aroma &middot; Antibacterial',
    idle_btn: 'INICIAR LIMPIEZA',
    f1: '💧 Vapor', f2: '💨 Secado', f3: '🌸 Aroma',
    plan_title: 'Elige tu Plan', plan_sub: 'Selecciona el servicio',
    basic_badge: 'BASICO', premium_badge: '⭐ PREMIUM',
    basic_name: 'Limpieza Basica', premium_name: 'Limpieza Premium',
    basic_steps: ['💧 Vapor 45 segundos', '💨 Secado 2 minutos', '🌸 Aroma 10 segundos', '🦠 Antibacterial incluido'],
    premium_steps: ['💧 Vapor extendido 75s', '💨 Secado 4 minutos', '🌸 Aroma premium 10s', '🦠 Antibacterial doble', '⭐ Ciclo profundo'],
    sel: 'SELECCIONAR',
    pay_title: 'Metodo de Pago',
    pay_qr_t: 'Pago con QR', pay_qr_s: 'Cubo &middot; Escanea y paga<br>desde tu celular',
    pay_cash_t: 'Pague en Caja', pay_cash_s: 'Ingresa el codigo<br>que te dieron',
    pay_pro_t: 'Codigo Promocion', pay_pro_s: 'Ingresa tu codigo<br>de descuento',
    qr_title: 'Pago con QR', qr_scan: 'Abre tu app CUBO y escanea el codigo',
    qr_status: 'ESPERANDO CONFIRMACION...', qr_btn: 'Confirmar pago manualmente', qr_exp: 'Sesion expira en',
    code_cash_t: 'Codigo de Caja', code_cash_s: 'Ej: CJ-XXXX',
    code_pro_t: 'Codigo Promocion', code_pro_s: 'Ej: PR-XXXX',
    sess_title: 'Sesion Activa', s1: 'Abrir Puerta', s2: 'Colocar Casco', s3: 'Iniciar Ciclo',
    sess_open_i: 'Presiona para abrir la puerta e introducir tu casco',
    sess_open_s: 'Coloca tu casco dentro y cierra la puerta',
    sess_start_i: 'Casco colocado! Ahora inicia el ciclo de limpieza',
    sess_start_s: 'Asegurate que la puerta este bien cerrada',
    sess_preheat_i: 'Precalentando vapor...',
    sess_preheat_starting: 'Iniciando en',
    sess_preheat_sec: 'segundo',
    sess_preheat_secs: 'segundos',
    btn_open: '🔓 ABRIR PUERTA', btn_close: '🔒 CERRAR PUERTA', btn_start: '▶ INICIAR LIMPIEZA',
    cyc_title: 'Ciclo en Progreso', cyc_warn: 'NO ABRIR LA PUERTA DURANTE EL PROCESO',
    ph0: '💧 Vapor', ph1: '💨 Secado', ph2: '🌸 Aroma',
    cyc_v: 'Vaporizando', cyc_d: 'Secando', cyc_a: 'Desinfectando',
    p1b: 'FASE 1 DE 3 - Vapor', p2b: 'FASE 2 DE 3 - Secado', p3b: 'FASE 3 DE 3 - Desinfección UV',
    p1p: 'FASE 1 DE 3 - Vapor Extendido', p2p: 'FASE 2 DE 3 - Secado Premium', p3p: 'FASE 3 DE 3 - Desinfección UV',
    // Solo se usa cuando un fallo real de ESP32 ocurre durante un ciclo
    // pagado con Cubo real (ver handleCuboCycleFailure() en main.js) — el
    // camino mock/código de promoción nunca bloquea, no usa esto.
    cycle_error_nm: 'Error de máquina', cycle_error_lbl: 'Requiere atención del operador',
    done_title: 'Proceso Completado!', done_sub_h: 'Tu casco esta listo',
    done_main: 'Tu casco esta limpio!', done_sub: 'Proceso finalizado. Puedes retirar tu casco ahora.',
    inv_ask: 'Deseas factura electronica?', inv_ask_s: 'Recibela en tu correo al instante',
    inv_btn: 'FACTURA', extra_dry: '💨 Casco Mojado - Secado Extra +1min',
    fin_btn: '✓ Finalizar', auto_close: 'Cierra automaticamente en',
    inv_title: 'Factura Electronica', inv_sub: 'SAT Guatemala - INFILE',
    inv_nit: 'NIT o CF', inv_name: 'Nombre / Razon Social',
    inv_email: 'Correo Electronico', inv_phone: 'Telefono (opcional)',
    inv_submit: '📧 EMITIR Y ENVIAR FACTURA',
    inv_sim: 'Modo simulacion (mock Fase 1) - Cubo/INFILE aun no integrados',
    adm_title: 'Panel de Administracion', adm_exit: 'Salir',
    r_sa: '⭐ SUPER ADMIN', r_ow: '🏪 DUENO', r_tc: '🔧 TECNICO', r_tn: '🏠 INQUILINO',
    prov_locked: '🔒 Solo Super Admin (Hydrox) puede ver o cambiar la configuracion de la maquina.',
    identity_locked: '🔒 Esta cuenta no tiene permiso para ver la identidad de la maquina.',
    pin_title: 'Acceso Restringido', pin_sub: 'Ingresa tu PIN',
    pin_hint: 'PIN de administrador (mock, Fase 1)',
    pin_enter: 'ENTRAR',
    temg_title: 'Apertura de Emergencia',
    emg_sub: 'Esta accion abrira la puerta y quedara registrada.',
    emg_open: '🔓 ABRIR PUERTA AHORA', cancel: 'Cancelar',
    susp_title: 'Servicio No Disponible',
    back: '← Volver', lang: '🇺🇸 English',
    tk: {
      qr_exp: 'Sesion QR expirada',
      code_ok: 'Codigo valido - Acceso autorizado',
      code_bad: 'Codigo invalido o ya utilizado',
      door_opened: 'Puerta abierta',
      door_closed: 'Puerta cerrada',
      sess_exp: 'Sesion expirada',
      inv_f: 'Nombre y correo requeridos',
      qr_ok: 'Pago QR CUBO confirmado (mock)',
    },
  },
  en: {
    idle_title: 'Professional Cleaning<br>for your <span>Helmet</span>',
    idle_sub: 'Steam &middot; Drying &middot; Aroma &middot; Antibacterial',
    idle_btn: 'START CLEANING',
    f1: '💧 Steam', f2: '💨 Drying', f3: '🌸 Aroma',
    plan_title: 'Choose Your Plan', plan_sub: 'Select the service',
    basic_badge: 'BASIC', premium_badge: '⭐ PREMIUM',
    basic_name: 'Basic Cleaning', premium_name: 'Premium Cleaning',
    basic_steps: ['💧 Steam 45 seconds', '💨 Drying 2 minutes', '🌸 Aroma 10 seconds', '🦠 Antibacterial included'],
    premium_steps: ['💧 Extended steam 75s', '💨 Drying 4 minutes', '🌸 Premium aroma 10s', '🦠 Double antibacterial', '⭐ Deep cycle'],
    sel: 'SELECT',
    pay_title: 'Payment Method',
    pay_qr_t: 'Pay with QR', pay_qr_s: 'Cubo &middot; Scan and pay<br>from your phone',
    pay_cash_t: 'Paid at Counter', pay_cash_s: 'Enter the code<br>you received',
    pay_pro_t: 'Promo Code', pay_pro_s: 'Enter your<br>discount code',
    qr_title: 'QR Payment', qr_scan: 'Open your CUBO app and scan the code',
    qr_status: 'WAITING FOR CONFIRMATION...', qr_btn: 'Confirm payment manually', qr_exp: 'Session expires in',
    code_cash_t: 'Counter Code', code_cash_s: 'Ex: CJ-XXXX',
    code_pro_t: 'Promo Code', code_pro_s: 'Ex: PR-XXXX',
    sess_title: 'Active Session', s1: 'Open Door', s2: 'Place Helmet', s3: 'Start Cycle',
    sess_open_i: 'Press to open the door and place your helmet inside',
    sess_open_s: 'Place your helmet inside and close the door',
    sess_start_i: 'Helmet placed! Now start the cleaning cycle',
    sess_start_s: 'Make sure the door is properly closed',
    sess_preheat_i: 'Preheating steam...',
    sess_preheat_starting: 'Starting in',
    sess_preheat_sec: 'second',
    sess_preheat_secs: 'seconds',
    btn_open: '🔓 OPEN DOOR', btn_close: '🔒 CLOSE DOOR', btn_start: '▶ START CLEANING',
    cyc_title: 'Cycle in Progress', cyc_warn: 'DO NOT OPEN THE DOOR DURING THE PROCESS',
    ph0: '💧 Steam', ph1: '💨 Drying', ph2: '🌸 Aroma',
    cyc_v: 'Steaming', cyc_d: 'Drying', cyc_a: 'Disinfecting',
    p1b: 'PHASE 1 OF 3 - Steam', p2b: 'PHASE 2 OF 3 - Drying', p3b: 'PHASE 3 OF 3 - UV Disinfection',
    p1p: 'PHASE 1 OF 3 - Extended Steam', p2p: 'PHASE 2 OF 3 - Premium Drying', p3p: 'PHASE 3 OF 3 - UV Disinfection',
    cycle_error_nm: 'Machine Error', cycle_error_lbl: 'Requires operator attention',
    done_title: 'Process Complete!', done_sub_h: 'Your helmet is ready',
    done_main: 'Your helmet is clean!', done_sub: 'Process finished. You can now retrieve your helmet.',
    inv_ask: 'Would you like an invoice?', inv_ask_s: 'Receive it in your email instantly',
    inv_btn: 'INVOICE', extra_dry: '💨 Wet Helmet - Extra Drying +1min',
    fin_btn: 'Finish', auto_close: 'Auto-closes in',
    inv_title: 'Electronic Invoice', inv_sub: 'SAT Guatemala - INFILE',
    inv_nit: 'Tax ID or CF', inv_name: 'Full Name / Company',
    inv_email: 'Email Address', inv_phone: 'Phone (optional)',
    inv_submit: '📧 ISSUE AND SEND INVOICE',
    inv_sim: 'Simulation mode (Fase 1 mock) - Cubo/INFILE not integrated yet',
    adm_title: 'Administration Panel', adm_exit: 'Exit',
    r_sa: '⭐ SUPER ADMIN', r_ow: '🏪 OWNER', r_tc: '🔧 TECHNICIAN', r_tn: '🏠 TENANT',
    prov_locked: '🔒 Only Super Admin (Hydrox) can view or change the machine configuration.',
    identity_locked: '🔒 This account is not allowed to view the machine identity.',
    pin_title: 'Restricted Access', pin_sub: 'Enter your PIN',
    pin_hint: 'Administrator PIN (mock, Fase 1)',
    pin_enter: 'ENTER',
    temg_title: 'Emergency Open',
    emg_sub: 'This will open the door and be logged.',
    emg_open: '🔓 OPEN DOOR NOW', cancel: 'Cancel',
    susp_title: 'Service Unavailable',
    back: 'Back', lang: '🇬🇹 Espanol',
    tk: {
      qr_exp: 'QR session expired',
      code_ok: 'Valid code - Access granted',
      code_bad: 'Invalid or already used code',
      door_opened: 'Door opened',
      door_closed: 'Door closed',
      sess_exp: 'Session expired',
      inv_f: 'Name and email required',
      qr_ok: 'CUBO QR payment confirmed (mock)',
    },
  },
};

let currentLang = 'es';

function t() {
  return T[currentLang];
}

function getLang() {
  return currentLang;
}

function setLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'es';
}

/**
 * Mismo mapeo id -> texto que applyLang() en app.js de HX01 (líneas
 * 153-224), reproducido tal cual — no resumido. `prices` reemplaza la
 * lectura directa de CFG.priceBasic/CFG.pricePremium, ya que aquí los
 * precios vienen de machineConfig (Fase 2 los hará configurables).
 */
function applyLang(prices) {
  const l = t();
  const set = (id, prop, value) => {
    const el = document.getElementById(id);
    if (el) el[prop] = value;
  };

  set('ti-title', 'innerHTML', l.idle_title);
  set('ti-sub', 'innerHTML', l.idle_sub);
  set('ti-btn', 'textContent', l.idle_btn);
  // idle_price se arma aquí, no como texto fijo en T — así nunca vuelve a
  // desincronizarse de machineConfig.prices después de un cambio via
  // Provisioning (Fase 2), a diferencia del bug original donde HX01
  // horneaba "Q20 · Q35" como string literal en la traducción.
  const idlePriceLabel = getLang() === 'en'
    ? `Basic Q${prices.basic} &middot; Premium Q${prices.premium}`
    : `Basico Q${prices.basic} &middot; Premium Q${prices.premium}`;
  set('ti-price', 'innerHTML', idlePriceLabel);
  set('tf1', 'textContent', l.f1);
  set('tf2', 'textContent', l.f2);
  set('tf3', 'textContent', l.f3);
  set('tp-title', 'textContent', l.plan_title);
  set('tp-sub', 'textContent', l.plan_sub);
  set('tb-badge', 'textContent', l.basic_badge);
  set('tpp-badge', 'textContent', l.premium_badge);
  set('tb-name', 'textContent', l.basic_name);
  set('tpp-name', 'textContent', l.premium_name);
  set('tb-sel', 'textContent', l.sel);
  set('tpp-sel', 'textContent', l.sel);
  set('pbd', 'textContent', prices.basic);
  set('ppd', 'textContent', prices.premium);
  set('basic-steps', 'innerHTML', l.basic_steps.map((s) => `<div class="plan-step">${s}</div>`).join(''));
  set('premium-steps', 'innerHTML', l.premium_steps.map((s) => `<div class="plan-step">${s}</div>`).join(''));
  set('tpay-title', 'textContent', l.pay_title);
  set('tpay-qr-t', 'textContent', l.pay_qr_t);
  set('tpay-qr-s', 'innerHTML', l.pay_qr_s);
  set('tpay-cash-t', 'textContent', l.pay_cash_t);
  set('tpay-cash-s', 'innerHTML', l.pay_cash_s);
  set('tpay-pro-t', 'textContent', l.pay_pro_t);
  set('tpay-pro-s', 'innerHTML', l.pay_pro_s);
  set('tqr-title', 'textContent', l.qr_title);
  set('tqr-scan', 'textContent', l.qr_scan);
  set('tqr-status', 'textContent', l.qr_status);
  set('tqr-btn', 'textContent', l.qr_btn);
  set('code-hdr-t', 'textContent', l.code_cash_t);
  set('code-hdr-s', 'textContent', l.code_cash_s);
  set('tsess-title', 'textContent', l.sess_title);
  set('ts1', 'textContent', l.s1);
  set('ts2', 'textContent', l.s2);
  set('ts3', 'textContent', l.s3);
  set('tcyc-title', 'textContent', l.cyc_title);
  set('tcyc-warn', 'textContent', `⚠️ ${l.cyc_warn}`);
  set('cp0', 'textContent', l.ph0);
  set('cp1', 'textContent', l.ph1);
  set('cp2', 'textContent', l.ph2);
  set('tdone-title', 'textContent', l.done_title);
  set('tdone-sub-h', 'textContent', l.done_sub_h);
  set('tdone-main', 'textContent', l.done_main);
  set('tdone-sub', 'textContent', l.done_sub);
  set('tinv-ask', 'textContent', l.inv_ask);
  set('tinv-ask-s', 'textContent', l.inv_ask_s);
  set('tinv-btn', 'textContent', l.inv_btn);
  set('btn-extra', 'textContent', l.extra_dry);
  set('tdone-fin', 'textContent', l.fin_btn);
  set('tdone-auto', 'textContent', l.auto_close);
  set('tinv-title', 'textContent', l.inv_title);
  set('tinv-sub', 'textContent', l.inv_sub);
  set('tinv-nit', 'textContent', l.inv_nit);
  set('tinv-name', 'textContent', l.inv_name);
  set('tinv-email', 'textContent', l.inv_email);
  set('tinv-phone', 'textContent', l.inv_phone);
  set('tinv-submit', 'textContent', l.inv_submit);
  set('tinv-sim', 'textContent', l.inv_sim);
  set('tadm-title', 'textContent', l.adm_title);
  set('tadm-exit', 'textContent', l.adm_exit);
  set('tpin-title', 'textContent', l.pin_title);
  set('tpin-sub', 'textContent', l.pin_sub);
  set('tpin-hint', 'textContent', l.pin_hint);
  set('tpin-enter', 'textContent', l.pin_enter);
  set('temg-title', 'textContent', l.temg_title);
  set('temg-sub', 'textContent', l.emg_sub);
  set('temg-open', 'textContent', l.emg_open);
  set('temg-cancel', 'textContent', l.cancel);
  set('tsusp-title', 'textContent', l.susp_title);
  set('lang-btn', 'textContent', l.lang);
  ['tp-back', 'tpay-back', 'tcode-back', 'tinv-back', 'tqr-back'].forEach((id) => set(id, 'textContent', l.back));
}

export { T, t, getLang, setLang, applyLang };
