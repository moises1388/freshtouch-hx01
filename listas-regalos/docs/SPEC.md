# Plataforma de listas de regalos con aportes parciales — Especificación inicial

> **Estado:** DEFINE / SPEC (borrador v0.1, 2026-09-24). No hay código todavía.
> **Etapa siguiente:** resolver las preguntas de la sección 14 → PLAN → BUILD → VERIFY → REVIEW.
>
> **Separación de Hydrox:** este proyecto NO forma parte de FreshTouch ni de ningún otro
> proyecto de Hydrox. Este documento vive temporalmente en la carpeta aislada
> `listas-regalos/` de la rama `claude/gift-list-contributions-platform-6ccswd` solo porque
> es el repositorio disponible en esta sesión. **No debe fusionarse con `main` de
> freshtouch-hx01.** Lo que se propone es moverlo a un repositorio propio antes de escribir
> código (ver pregunta P1).

Convenciones del documento:

- **[DECIDIDO]** = lo definió el usuario.
- **[PROPUESTA]** = sugerencia que todavía requiere aprobación.
- **[ABIERTO]** = hay alternativas; se presentan sin elegir.

---

## 1. Comprensión del proyecto

Una plataforma web donde un **evento** publica una **lista de regalos** que funcionan como
**metas de recaudación**, no como productos a la venta. Los invitados **aportan dinero**
—total o parcial— a un regalo o a un **fondo general**, y dejan un mensaje. Todo lo
recaudado pertenece a un único **fondo del evento**, que después se entrega a los
**beneficiarios** para que compren lo que realmente necesiten.

Puntos clave que entiendo:

1. **No es una tienda.** “Cochecito — AU$800” es una meta de referencia. Completarla no
   compra nada ni obliga a comprar ese artículo. El regalo es una *etiqueta de intención*
   sobre dinero que va al mismo fondo.
2. **Un solo fondo por evento.** La suma de aportes a regalos + aportes al fondo general =
   total del fondo. El progreso de cada regalo es una *vista* de los aportes etiquetados con
   ese regalo, no una cuenta separada.
3. **Moneda base AUD** porque los beneficiarios viven en Australia y los precios son
   australianos. **GTQ es moneda de visualización** porque la mayoría de invitados está en
   Guatemala. Más adelante: invitados de cualquier país (más monedas de visualización).
4. **Primer evento real:** Baby Shower de la hija del usuario (Australia). El dinero del MVP
   se deposita en una cuenta bancaria de la esposa del usuario. **No hay pagos en línea en el
   MVP.**
5. **Visión a futuro:** plataforma reutilizable (bodas, cumpleaños, graduaciones, etc.) y
   posiblemente SaaS. Por eso el modelo es genérico: `EVENTO → REGALOS/METAS → APORTES →
   FONDO → BENEFICIARIOS`, sin nada específico de Baby Shower en el núcleo (el “tipo de
   evento” es solo un atributo/plantilla visual).

Consecuencia importante: sin pagos en línea, el sistema **registra promesas de aporte**
y alguien **confirma manualmente** que el dinero llegó. Esa confirmación es lo que da
trazabilidad y lo que determina qué cuenta como “recaudado” (ver sección 7).

---

## 2. Requisitos funcionales

### Invitado (público)

| ID | Requisito |
|----|-----------|
| RF-01 | Ver la página del evento: título, descripción, beneficiarios, fecha, imagen. |
| RF-02 | Ver la lista de regalos con nombre, imagen, descripción y **meta en AUD** (`AU$800`). |
| RF-03 | Ver debajo de cada monto la conversión aproximada a **GTQ** (`≈ Q___`), con indicación de que es aproximada y la fecha de la tasa. |
| RF-04 | Ver por regalo: **recaudado**, **faltante** y estado (*disponible*, *con aportes*, *completado*). |
| RF-05 | Aportar el **valor completo** (faltante) de un regalo. |
| RF-06 | Aportar **una parte** de un regalo (monto libre, con mínimo configurable). |
| RF-07 | Aportar una **cantidad libre al fondo general**. |
| RF-08 | Escribir un **mensaje** para los futuros padres / beneficiarios. |
| RF-09 | Elegir si el aporte aparece **con su nombre o como anónimo**. |
| RF-10 | Recibir **instrucciones de pago** (MVP: datos bancarios / depósito) y una **referencia única** del aporte. |
| RF-11 | Ver una confirmación de “aporte registrado, pendiente de verificación”. |
| RF-12 | Ver el total del fondo del evento (si el administrador decide mostrarlo — [ABIERTO]). |

### Administrador del evento

| ID | Requisito |
|----|-----------|
| RF-20 | Iniciar sesión de forma segura. |
| RF-21 | Crear/editar un evento (tipo, título, descripción, fecha, zona horaria, imagen, moneda base, monedas de visualización). |
| RF-22 | Registrar beneficiarios (nombres a mostrar; datos de cuenta de destino solo visibles para administradores). |
| RF-23 | Crear, editar, ordenar, ocultar y archivar regalos (nombre, descripción, imagen, meta, enlace de referencia opcional). |
| RF-24 | Configurar la **tasa de cambio** en un único lugar (manual o automática — [ABIERTO]). |
| RF-25 | Ver todos los aportes con estado, filtrar y buscar por referencia. |
| RF-26 | **Confirmar** o **rechazar** un aporte pendiente indicando monto realmente recibido y nota. |
| RF-27 | Registrar manualmente un aporte recibido fuera de la plataforma (p. ej. efectivo). |
| RF-28 | Moderar mensajes (ocultar/mostrar) si los mensajes son públicos. |
| RF-29 | Exportar aportes y mensajes (CSV) para conciliación y agradecimientos. |
| RF-30 | Publicar / despublicar / cerrar el evento (cerrado = no acepta más aportes). |
| RF-31 | Ver historial (auditoría) de cambios de cada aporte y de la tasa de cambio. |

### Reglas de negocio

| ID | Regla |
|----|-------|
| RN-01 | Todo aporte pertenece a **exactamente un evento** y va **a un regalo o al fondo general**. |
| RN-02 | “Recaudado” de un regalo = suma de aportes **confirmados** a ese regalo, en moneda base. (Si los pendientes se muestran aparte: [ABIERTO], P4.) |
| RN-03 | Un regalo pasa a **completado** cuando recaudado ≥ meta. El dinero sigue en el fondo. |
| RN-04 | Qué pasa con un aporte que excede lo que falta: [ABIERTO], P5. |
| RN-05 | Los aportes **nunca se borran**; cambian de estado y cada cambio queda auditado. |
| RN-06 | Cada aporte guarda la **tasa usada** en su conversión (snapshot). Cambiar la tasa después no altera aportes ya registrados. |
| RN-07 | Anonimato: el nombre de un aporte anónimo nunca se expone en la vista pública. Alcance frente a administradores/beneficiarios: [ABIERTO], P8. |

---

## 3. Requisitos no funcionales

| Área | Requisito |
|------|-----------|
| **Aislamiento por evento** | Toda consulta de datos se filtra por `event_id`; un administrador solo ve eventos donde tiene rol. Reforzado en la base de datos (p. ej. Row Level Security), no solo en la interfaz. |
| **Aislamiento por usuario** | Roles por evento (`owner`, `admin`, `viewer`). Diseñado para que un futuro SaaS agregue una capa de *cuenta/organización* sin reescribir. |
| **Seguridad** | HTTPS; autenticación de administradores sin contraseñas débiles (enlace mágico o proveedor OAuth — [ABIERTO]); datos bancarios de destino nunca en la página pública salvo lo que se decida mostrar como instrucciones; protección anti-spam en el formulario público (límite de tasa + captcha ligero); validación de montos en el servidor; secretos fuera del repositorio. |
| **Trazabilidad** | Registro de auditoría *append-only* (quién, qué, cuándo, antes/después) para aportes, tasas y regalos. Referencia única legible por aporte (p. ej. `BS-7K3Q`). |
| **Dinero** | Montos como **enteros en unidades menores** (centavos) + código de moneda ISO 4217. Nunca `float`. Tasas como decimal de alta precisión. Redondeo explícito y documentado. |
| **Multimoneda** | Moneda base por evento; lista de monedas de visualización por evento; un único servicio de conversión. Agregar una moneda = datos, no código. |
| **Proveedor de pagos intercambiable** | Interfaz `PaymentProvider`. El MVP implementa “transferencia manual”; Stripe/PayPal/procesador local serían otras implementaciones. |
| **Móvil primero** | Los invitados llegarán mayormente por WhatsApp desde el teléfono. Página ligera, rápida en redes móviles. |
| **Idioma** | Español en el MVP; textos externalizados para agregar inglés sin reescribir (ver P11). |
| **Zonas horarias** | Todo en UTC en la base; se muestra en la zona del evento (Australia) o del visitante según contexto. |
| **Privacidad** | Minimizar datos personales de invitados (nombre + opcional contacto). Política de privacidad simple. Nada de datos de tarjeta en el sistema, nunca. |
| **Disponibilidad** | Evento de corta duración con picos (cuando se comparte el enlace). Hosting administrado, sin servidores propios que mantener. |
| **Costo** | MVP en capas gratuitas / de bajo costo de proveedores administrados. |
| **Accesibilidad** | Contraste, tamaños de fuente legibles, navegable por teclado, textos alternativos en imágenes. |

---

## 4. Modelo conceptual de datos

```
Usuario ──< MiembroEvento >── Evento ──< Beneficiario
                                 │
                                 ├──< Regalo (meta)
                                 │        │
                                 ├──< Aporte >───┘ (regalo opcional: null = fondo general)
                                 │        │
                                 │        ├──< TransicionAporte (historial de estados)
                                 │        └──< IntentoPago (proveedor, referencia externa)
                                 │
                                 ├── Fondo (vista/derivado: suma de aportes confirmados)
                                 └──< Desembolso (futuro: fondo → beneficiario)

TasaCambio (global o por evento; con vigencia)       RegistroAuditoria (append-only)
```

### Entidades

**Usuario** — persona que administra eventos. `id, email, nombre, creado_en`.
*(Invitados NO necesitan cuenta en el MVP.)*

**Evento** — `id, slug, tipo (baby_shower | boda | cumpleaños | …), titulo, descripcion,
fecha, zona_horaria, moneda_base (AUD), monedas_visualizacion ([GTQ]), estado
(borrador | publicado | cerrado | archivado), visibilidad (ver P10), aporte_minimo,
politica_excedente (ver P5), mostrar_total_fondo (bool), creado_por, creado_en`.

**MiembroEvento** — `evento_id, usuario_id, rol (owner | admin | viewer)`. Base del aislamiento.

**Beneficiario** — `id, evento_id, nombre_publico, relacion (opcional)`.
Datos de cuenta de destino: entidad separada `CuentaDestino` con acceso restringido
(`evento_id, titular, banco, pais, moneda, numero (cifrado o solo últimos dígitos),
instrucciones_publicas`).

**Regalo** — `id, evento_id, nombre, descripcion, imagen_url, enlace_referencia (opcional),
meta_monto (centavos), meta_moneda (= moneda base), orden, estado (activo | oculto |
archivado), creado_en`. *Recaudado y faltante NO se almacenan como fuente de verdad;
se calculan (ver sección 9).*

**Aporte** (la entidad central)

| Campo | Descripción |
|-------|-------------|
| `id`, `referencia` | Identificador interno + código corto legible para el depósito. |
| `evento_id` | Obligatorio. |
| `regalo_id` | Opcional; `null` = fondo general. |
| `modalidad` | `completo` \| `parcial` \| `fondo_general` (intención declarada). |
| `monto_declarado`, `moneda_declarada` | Lo que el invitado dijo que aportaría, en la moneda en que lo ingresó. |
| `monto_base_declarado` | Conversión a moneda base (AUD) al momento de registrar. |
| `tasa_id` / `tasa_valor` | Snapshot de la tasa usada. |
| `monto_recibido`, `moneda_recibida` | Lo que realmente llegó (lo llena quien confirma). |
| `monto_base_confirmado` | Valor en AUD que cuenta para el progreso (regla de cálculo: P6). |
| `nombre_aportante` | Nombre ingresado. |
| `contacto` | Opcional (email/teléfono) — para agradecer o aclarar. |
| `visibilidad_nombre` | `publico` \| `anonimo`. |
| `mensaje`, `mensaje_visible` | Mensaje y estado de moderación. |
| `estado` | Ver máquina de estados (sección 7). |
| `metodo_pago` | MVP: `transferencia_manual`, `efectivo`, `otro`. |
| `creado_en`, `confirmado_en`, `confirmado_por` | Trazabilidad. |
| `ip_hash`, `user_agent` | Anti-abuso (hash, no IP en claro). |

**TransicionAporte** — `aporte_id, de_estado, a_estado, actor, nota, fecha`.

**IntentoPago** — `id, aporte_id, proveedor, referencia_externa, estado_proveedor,
monto, moneda, payload_crudo, creado_en`. En el MVP se crea con proveedor `manual`; existe
desde el inicio para que integrar un proveedor real no cambie el modelo.

**TasaCambio** — `id, moneda_origen, moneda_destino, valor (decimal), fuente (manual |
nombre_api), vigente_desde, registrada_por, alcance (global | evento_id)`.
Histórica: nunca se sobrescribe, se agrega una nueva.

**Desembolso** *(fuera del MVP, pero reservado)* — entrega del fondo a beneficiarios:
`evento_id, monto, moneda, fecha, comprobante, nota`.

**RegistroAuditoria** — `actor, accion, entidad, entidad_id, antes, despues, fecha`.

---

## 5. Flujo completo del invitado

```
Enlace (WhatsApp) → Página del evento
   → Ve regalos: AU$800 / ≈ Q____ / barra de progreso / "Faltan AU$275"
   → Elige:
        a) "Regalar completo"   (monto = faltante)
        b) "Aportar una parte"  (monto libre ≥ mínimo, ≤ faltante según P5)
        c) "Aportar al fondo general" (monto libre)
   → Formulario:
        monto (moneda de ingreso: P7) · nombre · ¿mostrar nombre o anónimo? ·
        mensaje (opcional) · contacto (opcional) · aceptar aviso
   → Pantalla de resumen: "Vas a aportar AU$100 (≈ Q___) al Cochecito"
   → Confirmar → se registra Aporte en estado PENDIENTE
   → Pantalla de instrucciones:
        datos para depositar/transferir · monto sugerido en la moneda de la cuenta ·
        REFERENCIA ÚNICA a incluir · qué pasa después
   → (Opcional) enviar comprobante: [ABIERTO] — foto de boleta / solo referencia
   → Cuando el administrador confirma: el aporte cuenta en el progreso
        y (si hay contacto y se decide) se notifica al invitado.
```

Casos a cubrir: regalo completado mientras el invitado llenaba el formulario; invitado que
registra y nunca deposita (expira: P4); doble envío del formulario (idempotencia);
monto depositado distinto al declarado.

---

## 6. Flujo del administrador del evento

```
1. Inicia sesión
2. Crea evento (borrador): datos, fecha, zona horaria, moneda base AUD, visualización GTQ
3. Registra beneficiarios y la cuenta de destino (+ instrucciones públicas de depósito)
4. Configura la tasa AUD→GTQ (único lugar)
5. Carga regalos (nombre, imagen, meta en AUD, orden)
6. Vista previa → Publicar → Comparte el enlace
7. Operación diaria:
     - Revisa aportes PENDIENTES
     - Concilia con el estado de cuenta bancario por REFERENCIA
     - Confirma (con monto recibido) / Rechaza / Marca expirado
     - Modera mensajes
     - Actualiza la tasa si corresponde
8. Cierre: cierra el evento → exporta aportes y mensajes → registra entrega del fondo
```

Pregunta de roles: ¿quién administra? (usuario, esposa, hija/yerno) — P9.

---

## 7. Flujo de los aportes

### Máquina de estados

```
                 ┌──────────────► RECHAZADO   (no llegó el dinero / error / fraude)
                 │
REGISTRADO ──► PENDIENTE ──► CONFIRMADO ──► (REEMBOLSADO: futuro, con pagos reales)
                 │
                 └──────────────► EXPIRADO    (no se recibió en N días — P4)
```

- **PENDIENTE**: el invitado declaró su intención; aún no hay dinero verificado.
- **CONFIRMADO**: un administrador verificó el ingreso. **Solo esto suma a “recaudado”.**
- Cada transición crea una `TransicionAporte` y un registro de auditoría.

### Alternativas para el MVP (sin pagos en línea) — [ABIERTO] P3

| Opción | Cómo funciona | Ventajas | Desventajas |
|--------|---------------|----------|-------------|
| **A. Promesa + confirmación manual** | Invitado registra aporte → deposita con referencia → admin confirma. | Trazable, progreso real, sin fraude de montos. | Trabajo manual de conciliación; progreso se actualiza con retraso. |
| **B. Promesa cuenta de inmediato** | Se suma al progreso al registrarse. | Sensación inmediata, cero trabajo. | Progreso puede ser falso; bromas o errores inflan metas. |
| **C. Solo el admin registra** | Invitados depositan y avisan por WhatsApp; admin registra. | Muy simple. | Se pierden mensajes/anonimato del invitado; mucho trabajo manual. |

Variante de A: mostrar **dos cifras** (confirmado + “en camino”) para dar sensación
inmediata sin mentir.

### Fondo

`Total del fondo = Σ monto_base_confirmado de aportes CONFIRMADOS del evento`
(regalos + fondo general). El desglose por regalo es informativo: el dinero no está
“apartado” por regalo.

---

## 8. Manejo de AUD y GTQ

### Principios [PROPUESTA]

1. **La moneda base del evento (AUD) es la verdad.** Las metas se guardan solo en AUD.
2. **Otras monedas son derivadas** mediante un único servicio:
   `convertir(monto, de, a, fecha?) → { monto, tasa_id }`.
   Ningún componente conoce una tasa escrita a mano.
3. **Una sola fuente de tasas** (tabla `TasaCambio`), con historial y vigencia.
4. **Snapshot por aporte:** cada aporte guarda la tasa con la que se convirtió.
5. **“≈” siempre visible** en montos convertidos, con texto “Tasa de referencia del
   DD/MM/AAAA. El monto final depende de tu banco.”
6. **Redondeo:** AUD con 2 decimales; GTQ mostrado redondeado a quetzal entero (o hacia
   arriba al múltiplo de 5/10 — [ABIERTO]). El redondeo es solo de visualización.

Ejemplo (tasa **ficticia** de 5.00 GTQ por AUD, solo para ilustrar):

```
Cochecito                AU$800.00
                          ≈ Q4,000
Recaudado AU$525 · Faltan AU$275 (≈ Q1,375)
```

### Fuente de la tasa — [ABIERTO] P6

| Opción | Descripción | Ventajas | Desventajas |
|--------|-------------|----------|-------------|
| **Manual** | El admin ingresa AUD→GTQ en el panel. | Simple, controlado, sin dependencias. | Se desactualiza si nadie la mueve. |
| **Automática (API)** | Job diario consulta un proveedor de tasas; se guarda con fuente. | Siempre al día. | Dependencia externa; AUD→GTQ suele ser tasa cruzada vía USD; diferencias con lo que cobra el banco. |
| **Híbrida** | Automática con posibilidad de fijar manualmente (override). | Flexible. | Un poco más de lógica. |

Nota: el Banco de Guatemala publica el tipo de cambio de referencia USD/GTQ; AUD/GTQ
requeriría cruzar con USD/AUD. Hay que investigar qué fuente usar.

### Pregunta crítica: ¿en qué moneda se deposita? — P2 / P7

El dinero llega a la cuenta de la esposa. Si esa cuenta es en **GTQ en Guatemala**, el
invitado deposita quetzales y hay que decidir **cuántos AUD “valen”** para el progreso:

- (i) tasa del momento del registro (snapshot) — predecible para el invitado;
- (ii) tasa del momento de la confirmación;
- (iii) AUD realmente obtenidos cuando se envíe el dinero a Australia (exacto, pero se
  conoce tarde y mezcla comisiones de envío).

Esto afecta directamente el “recaudado” y el “faltan”. Debe decidirse antes de programar.

---

## 9. Qué información debe almacenarse

**Sí se almacena**

- Eventos, beneficiarios, regalos, miembros y roles.
- Aportes completos (sección 4), incluidos monto declarado, monto recibido, tasa snapshot,
  estados e historial.
- Mensajes y su estado de moderación.
- Tasas de cambio históricas con fuente y autor.
- Auditoría append-only.
- Datos de cuenta de destino con acceso restringido (idealmente solo lo necesario para
  mostrar instrucciones).

**Se calcula (no se guarda como verdad)**

- Recaudado / faltante / estado “completado” de cada regalo.
- Total del fondo.
- Conversiones a monedas de visualización para mostrar.
  *(Puede cachearse por rendimiento, pero la fuente es la suma de aportes.)*

**NO se almacena**

- Datos de tarjeta, contraseñas bancarias, credenciales de pago — nunca.
- IP en claro (solo hash para anti-abuso).
- Documentos de identidad de invitados.
- Comprobantes de depósito: [ABIERTO] — útiles para conciliar, pero son datos sensibles.

---

## 10. Fuera del MVP

- Pagos en línea (tarjeta, PayPal, Stripe, procesadores locales).
- Compra automática de productos / integración con tiendas australianas.
- Desembolso automático del fondo a beneficiarios (se registra a mano, si acaso).
- Registro autoservicio de organizadores / SaaS / planes / cobro de comisión.
- Panel multi-evento sofisticado (el **modelo** sí soporta varios eventos; la interfaz del
  MVP puede asumir uno).
- Cuentas de invitado / inicio de sesión de invitados.
- Reembolsos automatizados.
- Notificaciones automáticas por email/WhatsApp (salvo que se decida lo contrario).
- Múltiples idiomas en la interfaz (preparado, no traducido) — salvo P11.
- Apps nativas.
- Plantillas visuales por tipo de evento más allá de una.

---

## 11. Riesgos a investigar antes de integrar pagos

**Legales / regulatorios**

- Recibir dinero de terceros para entregarlo a otros puede considerarse **intermediación
  de pagos o remesas**. Revisar la regulación aplicable en Guatemala (incluida la normativa
  de prevención de lavado de dinero — IVE/SIB) y en Australia (AUSTRAC) antes de que la
  plataforma cobre por cuenta de terceros, sobre todo como SaaS.
- Implicaciones fiscales de recibir “regalos” en dinero en cada país.
- Términos y condiciones y política de privacidad (Australian Privacy Act si hay usuarios
  australianos; prácticas de datos en Guatemala).

**Proveedores de pago**

- Disponibilidad por país: muchos procesadores internacionales (p. ej. Stripe) **no
  aceptan comercios con sede en Guatemala** — verificar. Alternativas a evaluar: cuenta de
  comercio en Australia (¿a nombre de quién?), PayPal (restricciones para recibir en
  Guatemala), procesadores y links de pago locales guatemaltecos, pasarelas bancarias.
- Comisiones por transacción + conversión de moneda + envío internacional (el fondo real
  que reciben los padres será menor que lo aportado).
- Contracargos y fraude con tarjeta en regalos (difícil de disputar).
- Pagos marcados como “bienes/servicios” vs “amigos y familia”.

**Técnicos / operativos**

- Nunca tocar datos de tarjeta (usar checkout alojado del proveedor → alcance PCI mínimo).
- Webhooks idempotentes y verificación de firmas.
- Conciliación entre lo que dice el proveedor y lo que llega a la cuenta.
- Quién es el “comerciante” legal en cada evento cuando sea SaaS (el organizador o la
  plataforma).

---

## 12. Propuesta de arquitectura tecnológica — [ABIERTO] P12

Capas lógicas, independientes de la tecnología elegida:

```
┌──────────────── Interfaz ────────────────┐
│ Página pública del evento │ Panel admin  │
└───────────────┬──────────────────────────┘
                │
┌───────────────▼──────── Dominio (puro, sin framework) ─────────┐
│ Evento · Regalo · Aporte (estados) · Dinero · Conversión       │
│ Reglas: progreso, excedentes, anonimato, validaciones          │
└──────┬───────────────────┬───────────────────┬─────────────────┘
       │                   │                   │
┌──────▼──────┐   ┌────────▼────────┐  ┌───────▼─────────┐
│ Repositorio │   │ PaymentProvider │  │ RateProvider    │
│ (Postgres)  │   │ manual │ futuro │  │ manual │ API    │
└─────────────┘   └─────────────────┘  └─────────────────┘
```

Las interfaces `PaymentProvider` y `RateProvider` son los puntos de extensión que permiten
cambiar de proveedor sin tocar el dominio.

### Alternativas de stack

| | **A. Next.js + Postgres administrado (Supabase o Neon) + ORM** | **B. Supabase como backend (Auth + Postgres + RLS + Storage) + frontend (Next.js/SvelteKit)** | **C. Sitio estático + Google Sheets / Make** |
|---|---|---|---|
| Esfuerzo MVP | Medio | Bajo–medio | Bajo |
| Aislamiento por evento | En código + opcional RLS | **RLS nativo en la base** | Débil (hojas compartidas) |
| Autenticación admin | Librería (Auth.js u otra) | Incluida | Manual / inexistente |
| Trazabilidad / integridad | Fuerte (transacciones SQL) | Fuerte | Débil (edición libre de celdas) |
| Camino a SaaS | Bueno | Bueno (algo de acoplamiento al proveedor) | Malo: requeriría rehacer |
| Hosting | Vercel / Netlify | Supabase + Vercel/Netlify | Netlify + Make |
| Costo inicial | Capa gratuita | Capa gratuita | Casi cero |

Observaciones:

- **C** es parecido a cómo se han hecho otros proyectos (Make + Sheets). Sirve para un
  evento único, pero choca con los requisitos de seguridad, trazabilidad y SaaS. No lo
  recomendaría para este proyecto.
- **A** y **B** comparten lo esencial (Postgres, TypeScript). **B** da autenticación y
  aislamiento en la base “gratis”, a cambio de depender más de Supabase. **A** es más
  portable.
- En ambos: TypeScript, validación con esquemas (p. ej. Zod), migraciones versionadas,
  pruebas del dominio con un runner estándar (Vitest).

Recomendación tentativa (a confirmar): **A o B con Postgres + TypeScript**, eligiendo entre
ellas según la preferencia de hosting y de dependencia de proveedor.

---

## 13. Estructura inicial del repositorio [PROPUESTA]

En un **repositorio nuevo e independiente** (nombre por definir — P1):

```
/
├── README.md
├── docs/
│   ├── SPEC.md                 ← este documento
│   ├── PLAN.md                 ← siguiente etapa
│   └── decisiones/             ← ADRs: una decisión por archivo (moneda, pagos, stack…)
│       └── 0001-plantilla.md
├── src/
│   ├── domain/                 ← lógica pura, sin framework ni base de datos
│   │   ├── money/              (Money, redondeo, conversión)
│   │   ├── events/
│   │   ├── gifts/
│   │   └── contributions/      (estados, reglas de progreso y excedente)
│   ├── application/            ← casos de uso (registrar aporte, confirmar aporte…)
│   ├── infrastructure/
│   │   ├── db/                 (repositorios, migraciones)
│   │   ├── payments/           (PaymentProvider: manual/)
│   │   └── rates/              (RateProvider: manual/, api/)
│   └── web/                    ← páginas públicas y panel admin (framework elegido)
├── db/
│   ├── migrations/
│   └── seed/                   (evento de ejemplo con datos ficticios)
├── tests/
│   ├── domain/
│   └── e2e/
├── .env.example                ← sin secretos reales
└── .github/workflows/ci.yml    ← lint + tipos + pruebas
```

Todo en inglés en el código (nombres de variables/entidades) y español en la interfaz y
documentación — [ABIERTO], puede ser todo en español si se prefiere.

---

## 14. Preguntas a resolver antes de programar

### Bloqueantes (cambian el modelo o el flujo)

- **P1. Repositorio.** Esta sesión está sobre `freshtouch-hx01` (Hydrox). ¿Creamos un
  repositorio nuevo e independiente? ¿Nombre? ¿Cuenta de GitHub personal o de Hydrox?
- **P2. Cuenta de destino.** La cuenta de tu esposa, ¿es en Guatemala (GTQ o USD) o en
  Australia (AUD)? ¿Por qué medios depositarán los invitados (transferencia, depósito en
  agencia, efectivo en mano)?
- **P3. Registro de aportes en el MVP.** ¿Opción A (promesa + confirmación manual), B
  (cuenta de inmediato) o C (solo el admin registra)? Ver sección 7.
- **P4. Pendientes.** ¿Se muestran como “en camino” en el progreso? ¿Expiran si no se
  confirman en N días?
- **P5. Excedentes.** Si faltan AU$20 y alguien aporta AU$100: ¿se limita al faltante,
  el excedente pasa al fondo general, o se permite superar la meta? ¿Se puede aportar a un
  regalo ya completado?
- **P6. Tasa.** ¿Manual, automática o híbrida? ¿Y qué tasa define el valor en AUD de un
  depósito en GTQ (registro, confirmación o conversión real)? Sección 8.
- **P7. Moneda de ingreso.** ¿El invitado escribe el monto en AUD, en GTQ, o puede elegir?

### Importantes (afectan privacidad y experiencia)

- **P8. Anonimato.** “Anónimo” ¿es solo para el público o también para los futuros padres?
  (El administrador probablemente necesita saber quién depositó para conciliar.)
- **P9. Administradores.** ¿Quiénes? ¿Tú, tu esposa, tu hija y su pareja? ¿Todos con los
  mismos permisos?
- **P10. Acceso a la página.** ¿Enlace público, enlace no listado (difícil de adivinar) o
  con código de acceso? ¿Se muestran montos individuales públicamente o solo totales?
- **P11. Idioma.** ¿Solo español, o también inglés para invitados en Australia desde el
  primer evento?
- **P12. Stack.** ¿Opción A o B de la sección 12? ¿Preferencia de hosting (tienes cuenta de
  Netlify)?
- **P13. Mensajes.** ¿Públicos en la página o privados para los padres? ¿Moderación previa?

### Para planificar

- **P14. Fecha.** ¿Cuándo es el Baby Shower y cuándo debe estar publicada la página?
- **P15. Contenido.** ¿Quién arma la lista de regalos (nombres, metas en AUD, imágenes)?
  ¿Qué datos de la familia/bebé se pueden mostrar públicamente?
- **P16. Mínimo.** ¿Hay un aporte mínimo?
