// ╔═══════════════════════════════════════════════════════════╗
// ║         CONFIGURACIÓN FRESHTOUCH — EDITAR AQUÍ           ║
// ║                                                           ║
// ║  Para cambiar de máquina, solo modifica este archivo.    ║
// ║  El resto del código NO necesita tocarse nunca.          ║
// ╚═══════════════════════════════════════════════════════════╝

const CFG = {

  // ── ID DE LA MÁQUINA ─────────────────────────────────────
  machineId: 'HX01',          // ← Cambiar a: HX02, HX03, HX04...

  // ── RED (IP del ESP32 en el WiFi local) ──────────────────
  esp32Ip: '192.168.0.100',   // ← IP del ESP32 de esta máquina (MAC: 4c:c3:82:0c:79:84)

  // ── PRECIOS (en Quetzales) ───────────────────────────────
  priceBasic:   20,           // ← Precio Plan Básico (Q)
  pricePremium: 35,           // ← Precio Plan Premium (Q)

  // ── TIEMPOS CICLO BÁSICO (en segundos) ───────────────────
  durVapBasic:  45,           // Vapor básico     (45s = 0:45)
  durSecBasic:  120,          // Secado básico   (120s = 2:00)

  // ── TIEMPOS CICLO PREMIUM (en segundos) ──────────────────
  durVapPremium:  75,         // Vapor premium    (75s = 1:15)
  durSecPremium:  240,        // Secado premium  (240s = 4:00)

  // ── PINES DE ACCESO ──────────────────────────────────────
  pinSA:     '123456',        // Super Admin HYDROX  (6 dígitos)
  pinOwner:  '54321',         // Dueño de la máquina (5 dígitos)
  pinTech:   '7890',          // Técnico             (4 dígitos)
  pinTenant: '1111',          // Inquilino           (4 dígitos — diferente a pinTech)

  // ── NOMBRES DE RELAYS (deben coincidir con el firmware del ESP32) ──
  relayVapor:  'vapor',         // relay del vapor
  relaySec:    'secado',        // relay del secado/ventilador
  relayUV:     'luzuv',         // relay luz UV pin 18 ← cambiar si ESP32 usa otro nombre
  relayPuerta: 'puerta',        // relay de la puerta

  // ── SISTEMA ──────────────────────────────────────────────
  suspended:    false,
  suspendedMsg: 'Equipo fuera de servicio temporalmente.',
  infileMode:   'sandbox',    // 'sandbox' | 'production'
  businessName: 'FreshTouch by HYDROX',

  // ── WEBHOOKS MAKE.COM ───────────────────────────────────
  makeVentasWebhook: "https://hook.us2.make.com/cotj9zeggoe076da83nlmy3896mm6o1s",

  // ── CUBO PAGOS (via Make.com) ─────────────────────────────
  makeCuboWebhook:  'https://hook.us2.make.com/n0xdf2qxqkm1v4ty6uyff1wrix1aq4dm',  // Crea link de pago en Cubo
  makePollWebhook:  'https://hook.us2.make.com/mn4nu977eog6tzpg46ashfcwspexyh0q',   // Verifica si ya se pagó
  webhookSecret:    'ea0b883de6fb4542a865b23f6fdac59903b4f411405d71c0e94052f6a0cdd247', // Token de autenticación

};

