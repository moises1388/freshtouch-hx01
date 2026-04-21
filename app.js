// CFG cargado desde config.js

// LANG
let LANG='es';
const T={
  es:{
    idle_title:'Limpieza Profesional<br>para tu <span>Casco</span>',
    idle_sub:'Vapor &middot; Secado &middot; Aroma &middot; Antibacterial',
    idle_btn:'INICIAR LIMPIEZA',idle_price:'Basico Q20 &middot; Premium Q35',
    f1:'💧 Vapor',f2:'💨 Secado',f3:'🌸 Aroma',
    plan_title:'Elige tu Plan',plan_sub:'Selecciona el servicio',
    basic_badge:'BASICO',premium_badge:'⭐ PREMIUM',
    basic_name:'Limpieza Basica',premium_name:'Limpieza Premium',
    basic_steps:['💧 Vapor 45 segundos','💨 Secado 2 minutos','🌸 Aroma 10 segundos','🦠 Antibacterial incluido'],
    premium_steps:['💧 Vapor extendido 75s','💨 Secado 4 minutos','🌸 Aroma premium 10s','🦠 Antibacterial doble','⭐ Ciclo profundo'],
    sel:'SELECCIONAR',
    pay_title:'Metodo de Pago',
    pay_nfc_t:'Tarjeta / NFC',pay_nfc_s:'Acerca tu tarjeta<br>o paga sin contacto',
    pay_qr_t:'Pago con QR',pay_qr_s:'Cubo &middot; Escanea y paga<br>desde tu celular',
    pay_cash_t:'Pague en Caja',pay_cash_s:'Ingresa el codigo<br>que te dieron',
    pay_pro_t:'Codigo Promocion',pay_pro_s:'Ingresa tu codigo<br>de descuento',
    nfc_title:'Pago sin Contacto',nfc_main:'Acerca tu tarjeta al lector',
    nfc_sub:'Visa, Mastercard, American Express<br>Debito o credito sin contacto',
    nfc_status:'ESPERANDO TARJETA...',nfc_manual:'Confirmar pago manualmente',
    qr_title:'Pago con QR',qr_scan:'Escanea con tu app bancaria',
    qr_already:'Ya realizaste el pago?',
    qr_instr:'Ingresa los ultimos <b>4 digitos</b> del comprobante.',
    qr_lbl:'Ultimos 4 digitos',qr_btn:'CONFIRMAR PAGO',qr_exp:'Sesion expira en',
    code_cash_t:'Codigo de Caja',code_cash_s:'Ej: CJ-XXXX',
    code_pro_t:'Codigo Promocion',code_pro_s:'Ej: PR-XXXX',
    sess_title:'Sesion Activa',s1:'Abrir Puerta',s2:'Colocar Casco',s3:'Iniciar Ciclo',
    sess_open_i:'Presiona para abrir la puerta e introducir tu casco',
    sess_open_s:'Coloca tu casco dentro y cierra la puerta',
    sess_start_i:'Casco colocado! Ahora inicia el ciclo de limpieza',
    sess_start_s:'Asegurate que la puerta este bien cerrada',
    btn_open:'🔓 ABRIR PUERTA',btn_close:'🔒 CERRAR PUERTA',btn_start:'▶ INICIAR LIMPIEZA',
    cyc_title:'Ciclo en Progreso',cyc_warn:'NO ABRIR LA PUERTA DURANTE EL PROCESO',
    ph0:'💧 Vapor',ph1:'💨 Secado',ph2:'🌸 Aroma',
    cyc_v:'Vaporizando',cyc_d:'Secando',cyc_a:'Aromatizando',
    p1b:'FASE 1 DE 3 - Vapor',p2b:'FASE 2 DE 3 - Secado',p3b:'FASE 3 DE 3 - Aroma',
    p1p:'FASE 1 DE 3 - Vapor Extendido',p2p:'FASE 2 DE 3 - Secado Premium',p3p:'FASE 3 DE 3 - Aroma',
    done_title:'Proceso Completado!',done_sub_h:'Tu casco esta listo',
    done_main:'Tu casco esta limpio!',done_sub:'Proceso finalizado. Puedes retirar tu casco ahora.',
    inv_ask:'Deseas factura electronica?',inv_ask_s:'Recibela en tu correo al instante',
    inv_btn:'FACTURA',extra_dry:'💨 Casco Mojado - Secado Extra +1min',
    fin_btn:'✓ Finalizar',auto_close:'Cierra automaticamente en',
    inv_title:'Factura Electronica',inv_sub:'SAT Guatemala - INFILE',
    inv_nit:'NIT o CF',inv_name:'Nombre / Razon Social',
    inv_email:'Correo Electronico',inv_phone:'Telefono (opcional)',
    inv_submit:'📧 EMITIR Y ENVIAR FACTURA',
    inv_sim:'Modo simulacion - configura INFILE desde panel admin',
    adm_title:'Panel de Administracion',adm_exit:'Salir',
    pin_title:'Acceso Restringido',pin_sub:'Ingresa tu PIN',
    pin_hint:'4 digitos = Tecnico / Inquilino\n5 digitos = Dueno\n6 digitos = Super Admin',
    pin_enter:'ENTRAR',
    stat_today:'Ciclos Hoy',stat_rev_today:'Ingresos Hoy',
    stat_total:'Total Ciclos',stat_rev_total:'Total Ingresos',
    mach_st:'Estado de la Maquina',online:'EN LINEA',susp_st:'SUSPENDIDA',
    door_open_btn:'🔓 Abrir Puerta',door_close_btn:'🔒 Cerrar Puerta',
    btn_emg:'🚨 Emergencia',btn_test:'🧪 Ciclo Prueba',
    codes_title:'🎫 Generador de Codigos',gen_cash:'Caja (efectivo)',gen_promo:'Promocion',
    btn_gen:'+ GENERAR',contacts:'👥 Contactos',log_title:'📋 Registro',
    no_events:'Sin eventos aun',susp_label:'Maquina activa',
    cfg_title:'⚙️ Configuracion',cfg_mid:'ID Maquina',cfg_ip:'IP del ESP32',
    cfg_basic:'Precio Basico (Q)',cfg_prem:'Precio Premium (Q)',
    cfg_tech:'PIN Tecnico (4)',cfg_tenant:'PIN Inquilino (4)',cfg_owner:'PIN Dueno (5)',
    cfg_infile:'Modo Factura',cfg_sandbox:'Simulacion',cfg_prod:'INFILE Produccion',
    btn_save:'💾 Guardar',back:'← Volver',lang:'🇺🇸 English',
    r_sa:'⭐ SUPER ADMIN',r_ow:'🏪 DUENO',r_tc:'🔧 TECNICO',r_tn:'🏠 INQUILINO',
    used:'USADO',active:'ACTIVO',
    emg_title:'Apertura de Emergencia',
    emg_sub:'Esta accion abrira la puerta y quedara registrada.',
    emg_open:'🔓 ABRIR PUERTA AHORA',cancel:'Cancelar',
    susp_title:'Servicio No Disponible',
    tk:{qr_d:'Ingresa los 4 digitos del comprobante',
      qr_exp:'Sesion QR expirada',code_ok:'Codigo valido - Acceso autorizado',
      code_bad:'Codigo invalido o ya utilizado',door_opened:'Puerta abierta',
      door_closed:'Puerta cerrada',sess_exp:'Sesion expirada',
      inv_f:'Nombre y correo requeridos',cfg:'Configuracion guardada',
      emg:'Puerta abierta - emergencia',code_gen:'Codigo generado:',
      nfc_ok:'Pago NFC confirmado'},
    test_lbl:'🧪 MODO PRUEBA',
  },
  en:{
    idle_title:'Professional Cleaning<br>for your <span>Helmet</span>',
    idle_sub:'Steam &middot; Drying &middot; Aroma &middot; Antibacterial',
    idle_btn:'START CLEANING',idle_price:'Basic Q20 &middot; Premium Q35',
    f1:'💧 Steam',f2:'💨 Drying',f3:'🌸 Aroma',
    plan_title:'Choose Your Plan',plan_sub:'Select the service',
    basic_badge:'BASIC',premium_badge:'⭐ PREMIUM',
    basic_name:'Basic Cleaning',premium_name:'Premium Cleaning',
    basic_steps:['💧 Steam 45 seconds','💨 Drying 2 minutes','🌸 Aroma 10 seconds','🦠 Antibacterial included'],
    premium_steps:['💧 Extended steam 75s','💨 Drying 4 minutes','🌸 Premium aroma 10s','🦠 Double antibacterial','⭐ Deep cycle'],
    sel:'SELECT',
    pay_title:'Payment Method',
    pay_nfc_t:'Card / NFC',pay_nfc_s:'Tap your card<br>or pay contactless',
    pay_qr_t:'Pay with QR',pay_qr_s:'Cubo &middot; Scan and pay<br>from your phone',
    pay_cash_t:'Paid at Counter',pay_cash_s:'Enter the code<br>you received',
    pay_pro_t:'Promo Code',pay_pro_s:'Enter your<br>discount code',
    nfc_title:'Contactless Payment',nfc_main:'Tap your card on the reader',
    nfc_sub:'Visa, Mastercard, American Express<br>Debit or credit contactless',
    nfc_status:'WAITING FOR CARD...',nfc_manual:'Confirm payment manually',
    qr_title:'QR Payment',qr_scan:'Scan with your banking app',
    qr_already:'Did you complete the payment?',
    qr_instr:'Enter the last <b>4 digits</b> of your receipt.',
    qr_lbl:'Last 4 digits',qr_btn:'CONFIRM PAYMENT',qr_exp:'Session expires in',
    code_cash_t:'Counter Code',code_cash_s:'Ex: CJ-XXXX',
    code_pro_t:'Promo Code',code_pro_s:'Ex: PR-XXXX',
    sess_title:'Active Session',s1:'Open Door',s2:'Place Helmet',s3:'Start Cycle',
    sess_open_i:'Press to open the door and place your helmet inside',
    sess_open_s:'Place your helmet inside and close the door',
    sess_start_i:'Helmet placed! Now start the cleaning cycle',
    sess_start_s:'Make sure the door is properly closed',
    btn_open:'🔓 OPEN DOOR',btn_close:'🔒 CLOSE DOOR',btn_start:'▶ START CLEANING',
    cyc_title:'Cycle in Progress',cyc_warn:'DO NOT OPEN THE DOOR DURING THE PROCESS',
    ph0:'💧 Steam',ph1:'💨 Drying',ph2:'🌸 Aroma',
    cyc_v:'Steaming',cyc_d:'Drying',cyc_a:'Scenting',
    p1b:'PHASE 1 OF 3 - Steam',p2b:'PHASE 2 OF 3 - Drying',p3b:'PHASE 3 OF 3 - Aroma',
    p1p:'PHASE 1 OF 3 - Extended Steam',p2p:'PHASE 2 OF 3 - Premium Drying',p3p:'PHASE 3 OF 3 - Aroma',
    done_title:'Process Complete!',done_sub_h:'Your helmet is ready',
    done_main:'Your helmet is clean!',done_sub:'Process finished. You can now retrieve your helmet.',
    inv_ask:'Would you like an invoice?',inv_ask_s:'Receive it in your email instantly',
    inv_btn:'INVOICE',extra_dry:'💨 Wet Helmet - Extra Drying +1min',
    fin_btn:'Finish',auto_close:'Auto-closes in',
    inv_title:'Electronic Invoice',inv_sub:'SAT Guatemala - INFILE',
    inv_nit:'Tax ID or CF',inv_name:'Full Name / Company',
    inv_email:'Email Address',inv_phone:'Phone (optional)',
    inv_submit:'📧 ISSUE AND SEND INVOICE',
    inv_sim:'Simulation mode - configure INFILE from admin panel',
    adm_title:'Administration Panel',adm_exit:'Exit',
    pin_title:'Restricted Access',pin_sub:'Enter your PIN',
    pin_hint:'4 digits = Technician / Tenant\n5 digits = Owner\n6 digits = Super Admin',
    pin_enter:'ENTER',
    stat_today:'Cycles Today',stat_rev_today:'Revenue Today',
    stat_total:'Total Cycles',stat_rev_total:'Total Revenue',
    mach_st:'Machine Status',online:'ONLINE',susp_st:'SUSPENDED',
    door_open_btn:'🔓 Open Door',door_close_btn:'🔒 Close Door',
    btn_emg:'🚨 Emergency',btn_test:'🧪 Test Cycle',
    codes_title:'🎫 Code Generator',gen_cash:'Counter (cash)',gen_promo:'Promotion',
    btn_gen:'+ GENERATE',contacts:'👥 Contacts',log_title:'📋 Event Log',
    no_events:'No events yet',susp_label:'Machine active',
    cfg_title:'Settings',cfg_mid:'Machine ID',cfg_ip:'ESP32 IP',
    cfg_basic:'Basic Price (Q)',cfg_prem:'Premium Price (Q)',
    cfg_tech:'Tech PIN (4)',cfg_tenant:'Tenant PIN (4)',cfg_owner:'Owner PIN (5)',
    cfg_infile:'Invoice Mode',cfg_sandbox:'Simulation',cfg_prod:'INFILE Production',
    btn_save:'Save',back:'Back',lang:'🇬🇹 Espanol',
    r_sa:'⭐ SUPER ADMIN',r_ow:'🏪 OWNER',r_tc:'🔧 TECHNICIAN',r_tn:'🏠 TENANT',
    used:'USED',active:'ACTIVE',
    emg_title:'Emergency Open',
    emg_sub:'This will open the door and be logged.',
    emg_open:'🔓 OPEN DOOR NOW',cancel:'Cancel',
    susp_title:'Service Unavailable',
    tk:{qr_d:'Enter the 4 digits of your receipt',
      qr_exp:'QR session expired',code_ok:'Valid code - Access granted',
      code_bad:'Invalid or already used code',door_opened:'Door opened',
      door_closed:'Door closed',sess_exp:'Session expired',
      inv_f:'Name and email required',cfg:'Settings saved',
      emg:'Door open - emergency',code_gen:'Code generated:',
      nfc_ok:'NFC payment confirmed'},
    test_lbl:'🧪 TEST MODE',
  }
};

function t(){return T[LANG];}
function applyLang(){
  const l=t();
  document.getElementById('ti-title').innerHTML=l.idle_title;
  document.getElementById('ti-sub').innerHTML=l.idle_sub;
  document.getElementById('ti-btn').textContent=l.idle_btn;
  document.getElementById('ti-price').innerHTML=l.idle_price;
  document.getElementById('tf1').textContent=l.f1;
  document.getElementById('tf2').textContent=l.f2;
  document.getElementById('tf3').textContent=l.f3;
  document.getElementById('tp-title').textContent=l.plan_title;
  document.getElementById('tp-sub').textContent=l.plan_sub;
  document.getElementById('tb-badge').textContent=l.basic_badge;
  document.getElementById('tpp-badge').textContent=l.premium_badge;
  document.getElementById('tb-name').textContent=l.basic_name;
  document.getElementById('tpp-name').textContent=l.premium_name;
  document.getElementById('tb-sel').textContent=l.sel;
  document.getElementById('tpp-sel').textContent=l.sel;
  document.getElementById('pbd').textContent=CFG.priceBasic;
  document.getElementById('ppd').textContent=CFG.pricePremium;
  document.getElementById('basic-steps').innerHTML=l.basic_steps.map(s=>'<div class="plan-step">'+s+'</div>').join('');
  document.getElementById('premium-steps').innerHTML=l.premium_steps.map(s=>'<div class="plan-step">'+s+'</div>').join('');
  document.getElementById('tpay-title').textContent=l.pay_title;
  document.getElementById('tpay-nfc-t').textContent=l.pay_nfc_t;
  document.getElementById('tpay-nfc-s').innerHTML=l.pay_nfc_s;
  document.getElementById('tpay-cash-t').textContent=l.pay_cash_t;
  document.getElementById('tpay-cash-s').innerHTML=l.pay_cash_s;
  document.getElementById('tpay-pro-t').textContent=l.pay_pro_t;
  document.getElementById('tpay-pro-s').innerHTML=l.pay_pro_s;
  document.getElementById('tnfc-title').textContent=l.nfc_title;
  document.getElementById('tnfc-main').textContent=l.nfc_main;
  document.getElementById('tnfc-sub').innerHTML=l.nfc_sub;
  document.getElementById('tnfc-status').textContent=l.nfc_status;
  document.getElementById('tnfc-manual').textContent=l.nfc_manual;
  document.getElementById('tsess-title').textContent=l.sess_title;
  document.getElementById('ts1').textContent=l.s1;
  document.getElementById('ts2').textContent=l.s2;
  document.getElementById('ts3').textContent=l.s3;
  document.getElementById('tcyc-title').textContent=l.cyc_title;
  document.getElementById('tcyc-warn').textContent='⚠️ '+l.cyc_warn;
  document.getElementById('cp0').textContent=l.ph0;
  document.getElementById('cp1').textContent=l.ph1;
  document.getElementById('cp2').textContent=l.ph2;
  document.getElementById('tdone-title').textContent=l.done_title;
  document.getElementById('tdone-sub-h').textContent=l.done_sub_h;
  document.getElementById('tdone-main').textContent=l.done_main;
  document.getElementById('tdone-sub').textContent=l.done_sub;
  document.getElementById('tinv-ask').textContent=l.inv_ask;
  document.getElementById('tinv-ask-s').textContent=l.inv_ask_s;
  document.getElementById('tinv-btn').textContent=l.inv_btn;
  document.getElementById('btn-extra').textContent=l.extra_dry;
  document.getElementById('tdone-fin').textContent=l.fin_btn;
  document.getElementById('tdone-auto').textContent=l.auto_close;
  document.getElementById('tinv-title').textContent=l.inv_title;
  document.getElementById('tinv-sub').textContent=l.inv_sub;
  document.getElementById('tinv-nit').textContent=l.inv_nit;
  document.getElementById('tinv-name').textContent=l.inv_name;
  document.getElementById('tinv-email').textContent=l.inv_email;
  document.getElementById('tinv-phone').textContent=l.inv_phone;
  document.getElementById('tinv-submit').textContent=l.inv_submit;
  document.getElementById('tinv-sim').textContent=l.inv_sim;
  document.getElementById('tadm-title').textContent=l.adm_title;
  document.getElementById('tadm-exit').textContent=l.adm_exit;
  document.getElementById('tpin-title').textContent=l.pin_title;
  document.getElementById('tpin-sub').textContent=l.pin_sub;
  document.getElementById('tpin-hint').textContent=l.pin_hint;
  document.getElementById('tpin-enter').textContent=l.pin_enter;
  document.getElementById('temg-title').textContent=l.emg_title;
  document.getElementById('temg-sub').textContent=l.emg_sub;
  document.getElementById('temg-open').textContent=l.emg_open;
  document.getElementById('temg-cancel').textContent=l.cancel;
  document.getElementById('tsusp-title').textContent=l.susp_title;
  document.getElementById('lang-btn').textContent=l.lang;
  ['tp-back','tpay-back','tcode-back','tinv-back','tnfc-back'].forEach(id=>document.getElementById(id).textContent=l.back);
}
function toggleLang(){LANG=LANG==='es'?'en':'es';applyLang();if(STATE.role)renderAdmin(STATE.role);}

// STATE
let STATE={plan:null,codeType:null,codeInput:'',pinInput:'',role:null,
  admTaps:0,admTimer:null,sessStep:1,sessTO:null,
  vaporCD:null,cycTimer:null,extraTimer:null,doneTimer:null,
  doorOpen:false};

// DB
let DB={
  load(){
    try{const d=JSON.parse(localStorage.getItem('hx_db')||'{}');
      this.codes=d.codes||[];this.log=d.log||[];
      this.stats=d.stats||{total:0,today:0,revTotal:0,revToday:0,lastDay:''};
      this.contacts=d.contacts||[];
    }catch{this.codes=[];this.log=[];
      this.stats={total:0,today:0,revTotal:0,revToday:0,lastDay:''};this.contacts=[];}
    const td=new Date().toLocaleDateString('es-GT');
    if(this.stats.lastDay!==td){this.stats.today=0;this.stats.revToday=0;this.stats.lastDay=td;this.save();}
  },
  save(){localStorage.setItem('hx_db',JSON.stringify({codes:this.codes,log:this.log,stats:this.stats,contacts:this.contacts}));},
  addLog(ic,msg){const t=new Date().toLocaleTimeString('es-GT',{hour:'2-digit',minute:'2-digit'});this.log.unshift({t,ic,msg});if(this.log.length>120)this.log.pop();this.save();},
  record(plan,amt){this.stats.total++;this.stats.today++;this.stats.revTotal+=amt;this.stats.revToday+=amt;this.addLog('⛑️','Ciclo '+plan+' Q'+amt);this.save();},
  genCode(type,plan){const ch='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c=(type==='cash'?'CJ-':'PR-');for(let i=0;i<4;i++)c+=ch[Math.floor(Math.random()*ch.length)];this.codes.push({code:c,type,plan,used:false,created:new Date().toLocaleString('es-GT')});this.save();return c;},
  validate(code){return this.codes.find(c=>c.code===code.toUpperCase().trim()&&!c.used)||null;},
  useCode(code){const c=this.codes.find(x=>x.code===code.toUpperCase());if(c){c.used=true;this.save();}}
};
DB.load();
if(DB.codes.length===0){
  DB.codes.push({code:'CJ-DEMO',type:'cash',plan:'basic',used:false,created:'Demo'});
  DB.codes.push({code:'PR-DEMO',type:'promo',plan:'premium',used:false,created:'Demo'});
  DB.save();
}

// NAVIGATION
function go(id){
  document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  document.getElementById('wm').className=id==='s-cycle'?'wm-cycle':'';
}

// BUBBLES
(function(){
  const c=document.getElementById('bbl');
  const cols=['#5BA3C9','#1B2A4A','#3D5166','#C0571A'];
  for(let i=0;i<14;i++){
    const b=document.createElement('div');b.className='bbl';
    const sz=20+Math.random()*90;
    b.style.cssText='width:'+sz+'px;height:'+sz+'px;left:'+Math.random()*100+'%;background:'+cols[i%4]+';animation-duration:'+(14+Math.random()*18)+'s;animation-delay:-'+(Math.random()*20)+'s;';
    c.appendChild(b);
  }
})();

// ESP32 API
async function relay(comp,on){
  try{
    await fetch('http://'+CFG.esp32Ip+'/relay?comp='+comp+'&state='+(on?1:0),
      {signal:AbortSignal.timeout(3000)});
  }catch{DB.addLog('📡','relay '+comp+'='+(on?'ON':'OFF')+' (demo)');}
}

// ── SONIDOS ──────────────────────────────────────────────────────────────────
function playSound(type){
  try{
    if(type==='inicio'){
      const a=new Audio('sound_inicio.mp3');a.play().catch(()=>{});
    } else if(type==='retiro'){
      const a=new Audio('sound_retiro.mp3');a.play().catch(()=>{});
    } else if(type==='campana'){
      // Campana clásica ding-ding-ding via Web Audio API
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      function ding(t){
        const osc=ctx.createOscillator();
        const gain=ctx.createGain();
        osc.connect(gain);gain.connect(ctx.destination);
        osc.type='sine';osc.frequency.setValueAtTime(1200,t);
        osc.frequency.exponentialRampToValueAtTime(800,t+0.4);
        gain.gain.setValueAtTime(0.7,t);
        gain.gain.exponentialRampToValueAtTime(0.001,t+0.5);
        osc.start(t);osc.stop(t+0.5);
      }
      ding(ctx.currentTime);
      ding(ctx.currentTime+0.55);
      ding(ctx.currentTime+1.10);
    }
  }catch(e){}
}
// ─────────────────────────────────────────────────────────────────────────────
async function notifyCycleDone(tipo){
  try{await fetch('http://'+CFG.esp32Ip+'/cycle-done?tipo='+tipo,{method:'POST',signal:AbortSignal.timeout(3000)});}
  catch{DB.addLog('📡','cycle-done '+tipo+' (demo)');}
}

// DOOR STATE - toggle open/close
function setDoor(open){
  STATE.doorOpen=open;
  relay('puerta',open);
  DB.addLog(open?'🔓':'🔒',open?'Puerta abierta':'Puerta cerrada');
  toast(open?t().tk.door_opened:t().tk.door_closed,open?'in':'ok');
}

// PLAN
function selectPlan(plan){
  STATE.plan=plan;
  const price=plan==='basic'?CFG.priceBasic:CFG.pricePremium;
  const lbl=t()[plan==='basic'?'basic_name':'premium_name'];
  document.getElementById('pay-plan-lbl').textContent=lbl+' — Q'+price;
  document.getElementById('nfc-amt-lbl').textContent='Q'+price+'.00';
  document.getElementById('nfc-amt-big').textContent='Q'+price+'.00';
  go('s-payment');
}

// NFC
function nfcManualConfirm(){
  const amt=STATE.plan==='basic'?CFG.priceBasic:CFG.pricePremium;
  DB.addLog('📲','Pago NFC manual Q'+amt);
  toast(t().tk.nfc_ok,'ok');
  setTimeout(activateSess,600);
}

// NFC only — QR removed

// CODE
function kp(key){
  if(key==='DEL'){STATE.codeInput=STATE.codeInput.slice(0,-1);}
  else if(key==='OK'){validateCode();}
  else if(STATE.codeInput.length<12){STATE.codeInput+=key;}
  const el=document.getElementById('code-disp');
  el.textContent=STATE.codeInput||'_';
  el.style.color=STATE.codeInput.length>=3?'var(--blue)':'rgba(255,255,255,.3)';
}
function openCode(type){
  STATE.codeType=type;STATE.codeInput='';
  document.getElementById('code-disp').textContent='_';
  document.getElementById('code-disp').style.color='rgba(255,255,255,.3)';
  const l=t();
  const cash=type==='cash';
  document.getElementById('code-hdr-t').textContent=cash?l.code_cash_t:l.code_pro_t;
  document.getElementById('code-hdr-s').textContent=cash?l.code_cash_s:l.code_pro_s;
  document.getElementById('code-ico').textContent=cash?'💵':'🎁';
  document.getElementById('code-ttl').textContent=cash?l.code_cash_t:l.code_pro_t;
  document.getElementById('code-sub').textContent=cash?l.code_cash_s:l.code_pro_s;
  go('s-code');
}
function validateCode(){
  const found=DB.validate(STATE.codeInput);
  if(found){
    DB.useCode(STATE.codeInput);
    if(found.plan)STATE.plan=found.plan;
    DB.addLog('🎫','Codigo '+found.type+': '+STATE.codeInput);
    toast(t().tk.code_ok,'ok');
    setTimeout(activateSess,700);
  }else{
    toast(t().tk.code_bad,'er');
    STATE.codeInput='';
    document.getElementById('code-disp').textContent='_';
  }
}

// SESSION
function activateSess(){
  STATE.sessStep=1;STATE.doorOpen=false;
  const plan=STATE.plan==='basic'?t().basic_name:t().premium_name;
  const price=STATE.plan==='basic'?CFG.priceBasic:CFG.pricePremium;
  document.getElementById('sess-plan-hdr').textContent=plan+' Q'+price;
  updateSessUI();startSessTO();go('s-session');
}
function updateSessUI(){
  const l=t();
  ['ss1','ss2','ss3'].forEach((id,i)=>document.getElementById(id).classList.toggle('on',i<STATE.sessStep));
  if(STATE.sessStep===1){
    document.getElementById('sess-anim').textContent='🚪';
    document.getElementById('sess-inst').textContent=l.sess_open_i;
    document.getElementById('sess-sub').textContent=l.sess_open_s;
    document.getElementById('sess-btn').textContent=l.btn_open;
    document.getElementById('sess-btn').className='btn-act blue';
    document.getElementById('sess-btn').disabled=false;
    document.getElementById('sess-btn').style.opacity='1';
  }else{
    document.getElementById('sess-anim').innerHTML='<img src="img/img02.png" style="height:64px;object-fit:contain;">';
    document.getElementById('sess-inst').textContent=l.sess_start_i;
    document.getElementById('sess-sub').textContent=l.sess_start_s;
    document.getElementById('sess-btn').textContent=l.btn_start;
    document.getElementById('sess-btn').className='btn-act green';
    document.getElementById('sess-btn').disabled=false;
    document.getElementById('sess-btn').style.opacity='1';
  }
}
function sessAction(){
  if(STATE.sessStep===1){
    setDoor(true);
    STATE.sessStep=2;updateSessUI();
  }else{
    startVaporCountdown();
  }
}
function startVaporCountdown(){
  clearInterval(STATE.sessTO);
  const btn=document.getElementById('sess-btn');
  btn.disabled=true;btn.style.opacity='0.5';
  document.getElementById('sess-anim').textContent='💧';
  document.getElementById('sess-inst').textContent='Precalentando vapor...';
  relay(CFG.relayVapor,true);
  relay(CFG.relayUV,true);
  DB.addLog('💧','Precalentando vapor — 10 segundos');
  let secs=10;
  document.getElementById('sess-sub').textContent='Iniciando en '+secs+' segundos...';
  clearInterval(STATE.vaporCD);
  STATE.vaporCD=setInterval(()=>{
    secs--;
    if(secs<=0){clearInterval(STATE.vaporCD);startCycle();}
    else{document.getElementById('sess-sub').textContent='Iniciando en '+secs+(secs===1?' segundo...':' segundos...');}
  },1000);
}
let sessTOSec=120;
function startSessTO(){
  clearInterval(STATE.sessTO);sessTOSec=120;
  STATE.sessTO=setInterval(()=>{
    sessTOSec--;
    const m=Math.floor(sessTOSec/60),s=sessTOSec%60;
    document.getElementById('sess-timeout').textContent='⏱ '+m+':'+(s<10?'0':'')+s;
    if(sessTOSec<=0){clearInterval(STATE.sessTO);setDoor(false);DB.addLog('⏱','Sesion expirada');toast(t().tk.sess_exp,'er');go('s-idle');}
  },1000);
}

// CYCLE
const CYCLES={
  basic:[
    {nm:'cyc_v',ico:'💧',lbl:'p1b',dur:CFG.durVapBasic,ph:0,
      onStart(){relay(CFG.relayVapor,true);relay(CFG.relayPuerta,false);STATE.doorOpen=false;playSound('inicio');},
      onStart(){relay(CFG.relayVapor,true);relay(CFG.relayUV,true);relay(CFG.relayPuerta,false);STATE.doorOpen=false;playSound('inicio');},
      onTick(l){},onEnd(){relay(CFG.relayVapor,false);}},
      onStart(){relay('vapor',true);relay('puerta',false);STATE.doorOpen=false;playSound('inicio');},
      onStart(){relay('vapor',true);relay('luzuv',true);relay('puerta',false);STATE.doorOpen=false;playSound('inicio');},
      onTick(l){},onEnd(){relay('vapor',false);}},
    {nm:'cyc_d',ico:'💨',lbl:'p2b',dur:CFG.durSecBasic,ph:1,
      onStart(){relay(CFG.relaySec,true);},
      onTick(l){},
      onEnd(){relay(CFG.relaySec,false);}},
    {nm:'cyc_a',ico:'🌸',lbl:'p3b',dur:3,ph:2,
      onStart(){},onTick(){},onEnd(){relay(CFG.relayUV,false);}},
  ],
  premium:[
    {nm:'cyc_v',ico:'💧',lbl:'p1p',dur:CFG.durVapPremium,ph:0,
      onStart(){relay(CFG.relayVapor,true);relay(CFG.relayPuerta,false);STATE.doorOpen=false;playSound('inicio');},
      onStart(){relay(CFG.relayVapor,true);relay(CFG.relayUV,true);relay(CFG.relayPuerta,false);STATE.doorOpen=false;playSound('inicio');},
      onTick(){},onEnd(){relay(CFG.relayVapor,false);}},
    {nm:'cyc_d',ico:'💨',lbl:'p2p',dur:CFG.durSecPremium,ph:1,
      onStart(){relay(CFG.relaySec,true);},
      onTick(l){},
      onEnd(){relay(CFG.relaySec,false);}},
    {nm:'cyc_a',ico:'🌸',lbl:'p3p',dur:3,ph:2,
      onStart(){},onTick(){},onEnd(){relay(CFG.relayUV,false);}},
  ]
};
let cyPhIdx=0,cySecs=0,cyDur=0,cyCurPh=null;
function startCycle(){
  clearInterval(STATE.sessTO);
  const amt=STATE.plan==='basic'?CFG.priceBasic:CFG.pricePremium;
  DB.record(STATE.plan,amt);
  cyPhIdx=0;
  document.getElementById('cyc-mid').textContent=CFG.machineId;
  go('s-cycle');runPhase();
}
function runPhase(){
  const phases=CYCLES[STATE.plan];
  if(cyPhIdx>=phases.length){cycleDone();return;}
  cyCurPh=phases[cyPhIdx];
  cyDur=cyCurPh.dur;cySecs=cyCurPh.dur;
  const l=t();
  document.getElementById('cyc-ico').textContent=cyCurPh.ico;
  document.getElementById('cyc-ph-nm').textContent=l[cyCurPh.nm];
  document.getElementById('cyc-ph-lbl').textContent=l[cyCurPh.lbl];
  ['cp0','cp1','cp2'].forEach((id,i)=>{
    const el=document.getElementById(id);
    el.textContent=l['ph'+i];
    el.className='cph'+(i<cyPhIdx?' done':i===cyCurPh.ph?' cur':'');
  });
  updateCycTimer();cyCurPh.onStart();
  clearInterval(STATE.cycTimer);
  STATE.cycTimer=setInterval(()=>{
    cySecs--;cyCurPh.onTick(cySecs);updateCycTimer();
    if(cySecs<=0){clearInterval(STATE.cycTimer);cyCurPh.onEnd();cyPhIdx++;setTimeout(runPhase,400);}
  },1000);
}
function updateCycTimer(){
  const m=Math.floor(cySecs/60),s=cySecs%60;
  document.getElementById('cyc-timer').textContent=m+':'+(s<10?'0':'')+s;
  document.getElementById('cyc-prog').style.width=(((cyDur-cySecs)/cyDur)*100)+'%';
}
function cycleDone(){
  DB.addLog('✅','Ciclo completado');
  notifyCycleDone(STATE.plan);
  playSound('campana');          // ding-ding-ding: proceso finalizado
  setTimeout(()=>{
    setDoor(true);               // abre puerta para retirar casco
    playSound('retiro');         // sonido: puede retirar el casco
  },1200);
  go('s-done');
  document.getElementById('btn-extra').style.display='block';
  document.getElementById('extra-run').style.display='none';
  startDoneTimer();
}

// EXTRA DRY
function startExtraDry(){
  document.getElementById('btn-extra').style.display='none';
  document.getElementById('extra-run').style.display='block';
  relay(CFG.relaySec,true);
  DB.addLog('💨','Secado extra +1min');
  let s=60;
  clearInterval(STATE.extraTimer);
  STATE.extraTimer=setInterval(()=>{
    s--;
    const m=Math.floor(s/60),sec=s%60;
    document.getElementById('extra-timer').textContent=m+':'+(sec<10?'0':'')+sec;
    if(s<=0){clearInterval(STATE.extraTimer);relay(CFG.relaySec,false);document.getElementById('extra-run').textContent='✅ Listo';}
  },1000);
}

// DONE - auto-close door after 30s if no action
function startDoneTimer(){
  clearInterval(STATE.doneTimer);let s=30;
  STATE.doneTimer=setInterval(()=>{
    s--;const el=document.getElementById('done-auto-n');if(el)el.textContent=s;
    if(s<=0){
      clearInterval(STATE.doneTimer);
      setDoor(false); // close door automatically
      DB.addLog('🔒','Puerta cerrada automaticamente - timeout 30s');
      go('s-idle');
    }
  },1000);
}
function finishSess(){
  clearInterval(STATE.doneTimer);
  clearInterval(STATE.extraTimer);
  setDoor(false); // close door on manual finish
  go('s-idle');
}

// INVOICE
function submitInvoice(){
  const nit=document.getElementById('inv-nit').value.trim()||'CF';
  const name=document.getElementById('inv-name').value.trim();
  const email=document.getElementById('inv-email').value.trim();
  const phone=document.getElementById('inv-phone').value.trim();
  if(!name||!email){toast(t().tk.inv_f,'er');return;}
  const amt=STATE.plan==='basic'?CFG.priceBasic:CFG.pricePremium;
  DB.contacts.push({nit,name,email,phone,date:new Date().toLocaleString('es-GT'),plan:STATE.plan,amt});
  DB.save();DB.addLog('🧾','Factura: '+name+' '+email);
  toast('🧾 Factura enviada a '+email+' [DEMO]','ok');
  setTimeout(()=>go('s-done'),1500);
}

// ADMIN TRIGGER
function admTap(){
  STATE.admTaps++;clearTimeout(STATE.admTimer);
  if(STATE.admTaps>=3){STATE.admTaps=0;openPIN();}
  else STATE.admTimer=setTimeout(()=>{STATE.admTaps=0;},1500);
}

// PIN
function openPIN(){
  STATE.pinInput='';updatePinDots();
  document.getElementById('pin-err').textContent='';
  document.getElementById('pin-ov').classList.add('on');
}
function closePIN(){document.getElementById('pin-ov').classList.remove('on');STATE.pinInput='';}
function pinTap(k){
  if(k==='DEL')STATE.pinInput=STATE.pinInput.slice(0,-1);
  else if(STATE.pinInput.length<6)STATE.pinInput+=k;
  updatePinDots();
}
function updatePinDots(){
  document.querySelectorAll('.pin-dot').forEach((d,i)=>d.classList.toggle('on',i<STATE.pinInput.length));
}
function checkPIN(){
  const p=STATE.pinInput;
  let role=null;
  if(p.length===6&&p===CFG.pinSA)role='sa';
  else if(p.length===5&&p===CFG.pinOwner)role='ow';
  else if(p.length===4&&p===CFG.pinTech)role='tc';
  else if(p.length===4&&p===CFG.pinTenant)role='tn';
  if(role){
    STATE.role=role;closePIN();renderAdmin(role);go('s-admin');
    DB.addLog('🔑','Acceso panel: '+role);
  }else{
    document.getElementById('pin-err').textContent='PIN incorrecto';
    setTimeout(()=>{STATE.pinInput='';updatePinDots();document.getElementById('pin-err').textContent='';},900);
  }
}

// ADMIN PANEL
function renderAdmin(role){
  const l=t();const s=DB.stats;
  const bm={sa:'r-sa',ow:'r-ow',tc:'r-tc',tn:'r-tn'};
  const rn={sa:l.r_sa,ow:l.r_ow,tc:l.r_tc,tn:l.r_tn};
  document.getElementById('role-bdg').className='role-bdg '+bm[role];
  document.getElementById('role-bdg').textContent=rn[role];
  document.getElementById('adm-mid').textContent=l.cfg_mid+': '+CFG.machineId;
  const body=document.getElementById('adm-body');
  let h='';

  // Stats
  if(role==='sa'||role==='ow'){
    h+='<div class="stats-row"><div class="stat"><div class="stat-v">'+s.today+'</div><div class="stat-l">'+l.stat_today+'</div></div>'
      +'<div class="stat or"><div class="stat-v">Q'+s.revToday+'</div><div class="stat-l">'+l.stat_rev_today+'</div></div>'
      +'<div class="stat gr"><div class="stat-v">'+s.total+'</div><div class="stat-l">'+l.stat_total+'</div></div>'
      +'<div class="stat ye"><div class="stat-v">Q'+s.revTotal+'</div><div class="stat-l">'+l.stat_rev_total+'</div></div></div>';
  }else{
    h+='<div class="stats-row"><div class="stat"><div class="stat-v">'+s.today+'</div><div class="stat-l">'+l.stat_today+'</div></div>'
      +'<div class="stat gr"><div class="stat-v">'+s.total+'</div><div class="stat-l">'+l.stat_total+'</div></div></div>';
  }

  // Machine status + DOOR TOGGLE
  const doorIsOpen=STATE.doorOpen;
  h+='<div class="asec"><div class="asec-t">'+l.mach_st+'</div>'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    +'<div style="width:10px;height:10px;border-radius:50%;background:'+(CFG.suspended?'var(--yellow)':'var(--green)')+';box-shadow:0 0 8px '+(CFG.suspended?'var(--yellow)':'var(--green)')+';"></div>'
    +'<span>'+(CFG.suspended?l.susp_st:l.online)+'</span>'
    +'<span style="font-family:Share+Tech+Mono,monospace;font-size:11px;color:rgba(255,255,255,.3)">'+CFG.machineId+' '+CFG.esp32Ip+'</span>'
    +'</div>';

  if(role==='sa'||role==='ow'||role==='tc'||role==='tn'){
    // DOOR TOGGLE - same button opens/closes
    const doorLabel=doorIsOpen?l.door_close_btn:l.door_open_btn;
    const doorClass=doorIsOpen?'door-toggle is-open':'door-toggle is-closed';
    h+='<button class="'+doorClass+'" onclick="toggleDoorAdmin()">'+doorLabel+'</button>';
  }
  h+='</div>';
  if(role==='sa'||role==='ow'||role==='tc'){
    h+='<div class="agrid" style="margin-top:8px;">'
      +'<button class="abtn" onclick="openEmg()"><span class="abi">🚨</span>'+l.btn_emg+'</button>';
    if(role==='sa'||role==='ow')
      h+='<button class="abtn re" onclick="testCycle()"><span class="abi">🧪</span>'+l.btn_test+'</button>';
    h+='</div>';
  }
  h+='</div>';

  // Code generator
  if(role==='sa'||role==='ow'){
    const cl=DB.codes.slice().reverse().slice(0,10).map(c=>
      '<div class="code-i"><span class="code-v">'+c.code+'</span>'
      +'<span class="code-tp '+(c.type==='cash'?'ca':'pr')+'">'+(c.type==='cash'?l.gen_cash.split(' ')[0]:l.gen_promo)+'</span>'
      +'<span style="font-size:10px;color:rgba(255,255,255,.3)">'+c.plan+'</span>'
      +(c.used?'<span style="font-size:10px;color:var(--red)">'+l.used+'</span>':'<span style="font-size:10px;color:var(--green)">'+l.active+'</span>')
      +'</div>').join('');
    h+='<div class="asec"><div class="asec-t">'+l.codes_title+'</div>'
      +'<div class="cgen-row">'
      +'<select class="gsel" id="gen-type"><option value="cash">'+l.gen_cash+'</option><option value="promo">'+l.gen_promo+'</option></select>'
      +'<select class="gsel" id="gen-plan"><option value="basic">'+l.basic_name+' Q'+CFG.priceBasic+'</option><option value="premium">'+l.premium_name+' Q'+CFG.pricePremium+'</option></select>'
      +'<button class="btn-gen" onclick="genCode()">'+l.btn_gen+'</button></div>'
      +'<div class="codes-list">'+cl+'</div></div>';
  }

  // Suspend toggle - SA only
  if(role==='sa'){
    h+='<div class="asec"><div class="asec-t">🔒 Control</div>'
      +'<div class="tog-row"><span class="tog-lbl">'+l.susp_label+'</span>'
      +'<div class="tog '+(CFG.suspended?'':'on')+'" onclick="toggleSusp()"></div></div></div>';
  }

  // Settings - SA only
  if(role==='sa'){
    h+='<div class="asec"><div class="asec-t">'+l.cfg_title+'</div>'
      +'<div class="sgrid">'
      +'<div class="si"><label class="sl">'+l.cfg_mid+'</label><input class="sinp" id="c-mid" value="'+CFG.machineId+'"></div>'
      +'<div class="si"><label class="sl">'+l.cfg_ip+'</label><input class="sinp" id="c-ip" value="'+CFG.esp32Ip+'"></div>'
      +'<div class="si"><label class="sl">'+l.cfg_basic+'</label><input class="sinp" id="c-basic" value="'+CFG.priceBasic+'" type="number"></div>'
      +'<div class="si"><label class="sl">'+l.cfg_prem+'</label><input class="sinp" id="c-prem" value="'+CFG.pricePremium+'" type="number"></div>'
      +'<div class="si"><label class="sl">'+l.cfg_tech+'</label><input class="sinp" id="c-tech" value="'+CFG.pinTech+'" type="password"></div>'
      +'<div class="si"><label class="sl">'+l.cfg_tenant+'</label><input class="sinp" id="c-tenant" value="'+CFG.pinTenant+'" type="password"></div>'
      +'<div class="si"><label class="sl">'+l.cfg_owner+'</label><input class="sinp" id="c-owner" value="'+CFG.pinOwner+'" type="password"></div>'
      +'<div class="si"><label class="sl">'+l.cfg_infile+'</label>'
      +'<select class="sinp" id="c-infile"><option value="sandbox" '+(CFG.infileMode==='sandbox'?'selected':'')+'>'+l.cfg_sandbox+'</option>'
      +'<option value="production" '+(CFG.infileMode==='production'?'selected':'')+'>'+l.cfg_prod+'</option></select></div>'
      +'</div><button class="btn-save" onclick="saveSettings()">'+l.btn_save+'</button></div>';
  }

  // Contacts
  if((role==='sa'||role==='ow')&&DB.contacts.length>0){
    h+='<div class="asec"><div class="asec-t">'+l.contacts+' ('+DB.contacts.length+')</div>'
      +'<div class="log-list">'+DB.contacts.slice().reverse().slice(0,6).map(c=>
        '<div class="log-i"><span class="log-ic">👤</span><span class="log-m">'+c.name+' '+c.email+'</span><span class="log-t">'+c.date+'</span></div>'
      ).join('')+'</div></div>';
  }

  // Log
  h+='<div class="asec"><div class="asec-t">'+l.log_title+'</div>'
    +'<div class="log-list">'+DB.log.slice(0,18).map(e=>
      '<div class="log-i"><span class="log-t">'+e.t+'</span><span class="log-ic">'+e.ic+'</span><span class="log-m">'+e.msg+'</span></div>'
    ).join('')+(DB.log.length===0?'<div style="color:rgba(255,255,255,.3);font-size:12px;padding:8px">'+l.no_events+'</div>':'')
    +'</div></div>';

  body.innerHTML=h;
}

// DOOR TOGGLE in admin (same button for all roles)
function toggleDoorAdmin(){
  setDoor(!STATE.doorOpen);
  renderAdmin(STATE.role); // refresh button state
}

function genCode(){
  const type=document.getElementById('gen-type').value;
  const plan=document.getElementById('gen-plan').value;
  const code=DB.genCode(type,plan);
  toast(t().tk.code_gen+' '+code,'ok');
  renderAdmin(STATE.role);
}
function toggleSusp(){
  CFG.suspended=!CFG.suspended;
  DB.addLog(CFG.suspended?'🔒':'🔓',CFG.suspended?'Maquina suspendida':'Reactivada');
  document.getElementById('susp-ov').classList.toggle('on',CFG.suspended);
  renderAdmin(STATE.role);
}
function saveSettings(){
  CFG.machineId=document.getElementById('c-mid').value.trim()||CFG.machineId;
  CFG.esp32Ip=document.getElementById('c-ip').value.trim()||CFG.esp32Ip;
  CFG.priceBasic=parseFloat(document.getElementById('c-basic').value)||CFG.priceBasic;
  CFG.pricePremium=parseFloat(document.getElementById('c-prem').value)||CFG.pricePremium;
  CFG.pinTech=document.getElementById('c-tech').value.trim()||CFG.pinTech;
  CFG.pinTenant=document.getElementById('c-tenant').value.trim()||CFG.pinTenant;
  CFG.pinOwner=document.getElementById('c-owner').value.trim()||CFG.pinOwner;
  CFG.infileMode=document.getElementById('c-infile').value;
  toast(t().tk.cfg,'ok');DB.addLog('⚙️','Configuracion actualizada');renderAdmin(STATE.role);
}
function testCycle(){
  STATE.plan='basic';DB.addLog('🧪','Ciclo prueba (sin cobro)');
  cyPhIdx=0;go('s-cycle');
  document.getElementById('cyc-ph-lbl').textContent=t().test_lbl;
  runPhase();
}
function exitAdmin(){STATE.role=null;go('s-idle');}

// EMERGENCY
function openEmg(){document.getElementById('emg-modal').classList.add('on');}
function closeEmg(){document.getElementById('emg-modal').classList.remove('on');}
function emergencyOpen(){
  setDoor(true);DB.addLog('🚨','Apertura emergencia');
  closeEmg();
  if(STATE.role)renderAdmin(STATE.role);
}

// TOAST
let toastTmr;
function toast(msg,type){
  const el=document.getElementById('toast');
  el.textContent=msg;el.className='toast on '+(type||'in');
  clearTimeout(toastTmr);toastTmr=setTimeout(()=>el.classList.remove('on'),3000);
}

// INIT
applyLang();
if(CFG.suspended)document.getElementById('susp-ov').classList.add('on');
if('wakeLock' in navigator)navigator.wakeLock.request('screen').catch(()=>{});
