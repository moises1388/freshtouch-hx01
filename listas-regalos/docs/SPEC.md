# listas-regalos — Especificación

> **Estado:** SPEC v0.2 (2026-09-24). Incorpora las decisiones P1, P3, P4, P5, P6 y P7.
> No hay código todavía. Siguiente etapa: PLAN (ver `PLAN.md`).
>
> **Repositorio [DECIDIDO]:** el proyecto vive en un repositorio independiente llamado
> **`listas-regalos`**, sin mezcla ni dependencias con Hydrox, FreshTouch, B&R o Forja, y
> preparado para evolucionar como producto/SaaS independiente. Mientras ese repositorio se
> crea, estos documentos están temporalmente en la carpeta aislada `listas-regalos/` de una
> rama de `freshtouch-hx01` que **no debe fusionarse**. Al existir el repositorio nuevo se
> copian allí y se borra esta rama.

Convenciones: **[DECIDIDO]** lo definió el usuario · **[PROPUESTA]** sugerencia pendiente de
aprobación · **[ABIERTO]** alternativas sin elegir.

Registro de decisiones: ver `DECISIONES.md`.

---

## 1. Comprensión del proyecto

Una plataforma web donde un **evento** publica una **lista de regalos** que funcionan como
**metas de recaudación**, no como productos a la venta. Los invitados **registran aportes**
—totales o parciales— a un regalo o al **fondo general** y dejan un mensaje. Un
administrador **verifica que el dinero llegó** y **confirma** el aporte. Todo lo confirmado
pertenece a un único **fondo del evento**, que después se entrega a los **beneficiarios**.

1. **No es una tienda.** Completar una meta no compra nada.
2. **Un solo fondo por evento.** El progreso de cada regalo es una vista de las
   *asignaciones* confirmadas hacia ese regalo, no una cuenta separada.
3. **Moneda base AUD.** Las metas se expresan y calculan en AUD. El invitado puede
   registrar su aporte en **AUD o GTQ**.
4. **Sin pagos en línea en el MVP.** El sistema registra aportes **PENDIENTES** y un
   administrador los **CONFIRMA** tras verificar la recepción del dinero.
5. **Destino de fondos configurable.** La cuenta y el método real de transferencia aún no
   están definidos (P2 [ABIERTO]); el sistema no asume ninguno.
6. **Modelo genérico:** `EVENTO → REGALOS/METAS → APORTES → ASIGNACIONES → FONDO →
   BENEFICIARIOS`. “Baby Shower” es solo el tipo del primer evento.

---

## 2. Requisitos funcionales

### Invitado (público)

| ID | Requisito |
|----|-----------|
| RF-01 | Ver la página del evento: título, descripción, beneficiarios, fecha, imagen. |
| RF-02 | Ver la lista de regalos con **meta en AUD** (`AU$800`) y debajo `≈ Q___`, indicando que es aproximado y la fecha/hora de la tasa usada. |
| RF-03 | Ver por regalo: **recaudado (confirmado)**, **faltante** y, por separado, lo **PENDIENTE**. |
| RF-04 | Ver el estado del regalo: *disponible*, *con aportes*, *completado*. |
| RF-05 | Registrar un aporte por el **faltante completo** de un regalo. |
| RF-06 | Registrar un aporte **parcial** a un regalo. |
| RF-07 | Registrar un aporte libre al **fondo general**. |
| RF-08 | Elegir la **moneda del aporte: AUD o GTQ**, viendo siempre la equivalencia en la otra moneda. |
| RF-09 | Escribir un **mensaje** para los beneficiarios. |
| RF-10 | Elegir **nombre visible o anónimo**. |
| RF-11 | Al registrar, recibir una **referencia única** y las **instrucciones de pago configuradas** para el evento (contenido [ABIERTO] hasta P2). |
| RF-12 | Ver una confirmación de que su aporte quedó **PENDIENTE** de verificación. |

### Administrador del evento

| ID | Requisito |
|----|-----------|
| RF-20 | Iniciar sesión de forma segura. |
| RF-21 | Crear/editar evento: tipo, título, descripción, fecha, zona horaria, moneda base, monedas aceptadas para aportes. |
| RF-22 | Registrar beneficiarios. |
| RF-23 | **Configurar el destino de fondos** del evento (ver 4.3): texto de instrucciones, monedas en que se puede recibir. Sin datos bancarios predeterminados. |
| RF-24 | Crear, editar, ordenar, ocultar y archivar regalos. |
| RF-25 | Registrar/actualizar la **tasa de cambio vigente** en un único lugar. |
| RF-26 | Listar aportes por estado; buscar por referencia. |
| RF-27 | **Confirmar** un aporte: indicar **monto y moneda realmente recibidos**; el sistema fija la tasa y calcula AUD y la distribución (P5, P6). Mostrar la vista previa de la distribución antes de confirmar. |
| RF-28 | **Rechazar** un aporte pendiente con motivo. |
| RF-29 | Registrar directamente un aporte recibido por fuera del formulario (queda confirmado con el mismo cálculo). |
| RF-30 | Moderar mensajes (si son públicos — P13). |
| RF-31 | Exportar aportes, asignaciones y mensajes (CSV). |
| RF-32 | Publicar / cerrar evento (cerrado = no acepta nuevos aportes). |
| RF-33 | Ver el historial de auditoría de cada aporte y de cada tasa. |

### Reglas de negocio

| ID | Regla | Estado |
|----|-------|--------|
| RN-01 | Todo aporte pertenece a **un evento** y declara como destino **un regalo o el fondo general**. | [DECIDIDO] |
| RN-02 | Estados del aporte: `PENDIENTE → CONFIRMADO` o `PENDIENTE → RECHAZADO`. **Solo CONFIRMADO cuenta como recaudado.** | [DECIDIDO] P3 |
| RN-03 | Los PENDIENTES se muestran claramente con la etiqueta **“PENDIENTE”**. **No vencen** automáticamente en el MVP. | [DECIDIDO] P4 |
| RN-04 | **Excedente:** al confirmar un aporte a un regalo, el monto en AUD se asigna al regalo hasta completar su faltante; el resto se asigna **automáticamente al fondo general**. Nada se pierde ni se rechaza. | [DECIDIDO] P5 |
| RN-05 | La distribución de RN-04 se **guarda como asignaciones** trazables (ver 4.2). | [DECIDIDO] P5 |
| RN-06 | La conversión que define el valor en AUD se **fija al CONFIRMAR** el aporte y se guarda con él: moneda original, monto original, tasa, monto AUD, fecha/hora de la tasa, fuente de la tasa. | [DECIDIDO] P6 |
| RN-07 | Los aportes confirmados **no cambian** cuando cambia la tasa después. | [DECIDIDO] P6 |
| RN-08 | El invitado puede registrar en **AUD o GTQ**; las metas siguen en AUD. | [DECIDIDO] P7 |
| RN-09 | Un regalo está **completado** cuando la suma de sus asignaciones confirmadas = meta. | [DECIDIDO] |
| RN-10 | Los aportes y asignaciones **nunca se borran**. | [PROPUESTA] |
| RN-11 | El faltante se evalúa **en el momento de confirmar**, en orden de confirmación (no de registro). Ver conflicto C2. | [PROPUESTA] |
| RN-12 | Registrar aportes a un regalo **completado**: ver conflicto C4. | [ABIERTO] |
| RN-13 | Anonimato: el nombre de un aporte anónimo nunca aparece en vistas públicas. Alcance frente a beneficiarios: P8. | parcialmente [ABIERTO] |

---

## 3. Requisitos no funcionales

| Área | Requisito |
|------|-----------|
| **Independencia** | Repositorio, cuentas de servicio, base de datos, dominio y secretos propios; nada compartido con otros proyectos. |
| **Aislamiento por evento** | Todo dato lleva `event_id`; acceso filtrado en la base (p. ej. Row Level Security), no solo en la interfaz. |
| **Aislamiento por usuario** | Roles por evento (`owner`, `admin`, `viewer`); preparado para agregar la capa *cuenta/organización* del SaaS. |
| **Seguridad** | HTTPS; autenticación de administradores sin contraseñas débiles; validación de montos en servidor; anti-spam en el formulario público; secretos fuera del repositorio. |
| **Trazabilidad** | Auditoría append-only; referencia única por aporte; asignaciones inmutables. |
| **Consistencia** | La confirmación (tasa + conversión + asignaciones + cambio de estado) ocurre en **una sola transacción**, con bloqueo del regalo para que dos confirmaciones simultáneas no sobrepasen la meta. |
| **Dinero** | Enteros en unidades menores + código ISO 4217; tasas en decimal de alta precisión; nunca `float`; redondeo único y documentado (8.3). |
| **Multimoneda** | Agregar una moneda = datos (catálogo + tasa), no código. |
| **Proveedor de pagos intercambiable** | Interfaz `PaymentProvider`. MVP: solo el proveedor **manual** (confirmación del administrador). Ningún proveedor real. |
| **Móvil primero** | Invitados llegan por WhatsApp; páginas ligeras. |
| **Idioma** | Español en el MVP; textos externalizados (P11). |
| **Zonas horarias** | UTC en la base; se muestra en la zona del evento o del visitante. |
| **Privacidad** | Datos mínimos de invitados; nunca datos de tarjeta; IP solo como hash. |
| **Costo / operación** | Servicios administrados, capa gratuita o bajo costo. |

---

## 4. Modelo conceptual de datos

```
Usuario ──< MiembroEvento >── Evento ──< Beneficiario
                                │
                                ├── DestinoFondos (configurable, P2)
                                ├──< Regalo (meta en AUD)
                                ├──< Aporte ──< Asignacion >── Regalo | FondoGeneral
                                │       ├──< TransicionAporte
                                │       └──< IntentoPago (proveedor "manual" en MVP)
                                └── Fondo (derivado: Σ asignaciones confirmadas)

TasaCambio (histórica, con fuente)        RegistroAuditoria (append-only)
```

### 4.1 Aporte

Guarda **dos momentos**: lo que el invitado **declaró** al registrar y lo que el
administrador **confirmó**.

| Grupo | Campos |
|-------|--------|
| Identidad | `id`, `referencia` (código corto legible), `evento_id` |
| Destino declarado | `regalo_id` (null = fondo general), `modalidad` (`completo` \| `parcial` \| `fondo_general`) |
| Declarado (registro) | `monto_declarado`, `moneda_declarada` (AUD \| GTQ), `equivalente_aud_estimado`, `tasa_estimacion_id` — **solo informativo**, no cuenta para nada |
| Confirmado (P6) | `monto_original`, `moneda_original` (lo realmente recibido), `tasa_valor`, `tasa_par` (p. ej. AUD/GTQ), `tasa_fecha_hora`, `tasa_fuente`, `tasa_id`, `monto_aud` |
| Invitado | `nombre_aportante`, `contacto` (opcional), `visibilidad_nombre` (`publico` \| `anonimo`), `mensaje`, `mensaje_visible` |
| Estado | `estado` (`PENDIENTE` \| `CONFIRMADO` \| `RECHAZADO`), `metodo_registro` (`formulario` \| `admin`) |
| Trazabilidad | `creado_en`, `confirmado_en`, `confirmado_por`, `motivo_rechazo`, `ip_hash` |

Si la moneda original es AUD: `tasa_valor = 1`, `tasa_fuente = "sin conversión"`.

### 4.2 Asignacion (nueva — por P5)

Cómo se repartió el `monto_aud` de un aporte confirmado.

| Campo | Descripción |
|-------|-------------|
| `id`, `aporte_id`, `evento_id` | |
| `destino_tipo` | `regalo` \| `fondo_general` |
| `regalo_id` | si aplica |
| `monto_aud` | en centavos |
| `motivo` | `directo` (lo pedido) \| `excedente` (sobrante de un regalo) |
| `faltante_antes` | faltante del regalo al momento de confirmar (evidencia del cálculo) |
| `creado_en` | |

Invariante: `Σ asignaciones.monto_aud = aporte.monto_aud`.

Ejemplo P5 (meta AU$800, faltan AU$20, confirmado AU$100):

| destino | monto | motivo | faltante_antes |
|---------|-------|--------|----------------|
| regalo: Cochecito | AU$20.00 | directo | AU$20.00 |
| fondo general | AU$80.00 | excedente | — |

### 4.3 DestinoFondos (nuevo — por P2 [ABIERTO])

Configuración por evento, **sin valores predeterminados**:

- `instrucciones_publicas` (texto que ve el invitado tras registrar)
- `monedas_recepcion` (en qué monedas puede llegar el dinero)
- `titular_visible`, `datos_privados` (solo administradores; qué campos exactos: P2)
- `activo`

Hasta resolver P2 la página muestra un texto genérico (“Te enviaremos las instrucciones”) y
la plataforma no publica datos bancarios.

### 4.4 Otras entidades

- **Evento** — `id, slug, tipo, titulo, descripcion, fecha, zona_horaria, moneda_base (AUD),
  monedas_aporte ([AUD, GTQ]), estado (borrador | publicado | cerrado | archivado),
  aporte_minimo (P16), mostrar_total_fondo`.
- **Usuario**, **MiembroEvento** (`rol`), **Beneficiario** — sin cambios respecto a v0.1.
- **Regalo** — `meta_aud` en centavos; recaudado/faltante **se derivan** de asignaciones.
- **TasaCambio** — `par (base/cotizada), valor, fuente, vigente_desde, registrada_por,
  alcance (global | evento)`. Nunca se sobrescribe.
- **TransicionAporte**, **IntentoPago** (`proveedor = manual`), **RegistroAuditoria**.

---

## 5. Flujo del invitado

```
Enlace → Página del evento
  → Regalo: AU$800 / ≈ Q___ · Recaudado AU$525 · Faltan AU$275 · PENDIENTE AU$100
  → Elige: completo | parcial | fondo general
  → Formulario: moneda (AUD | GTQ) · monto · nombre · ¿anónimo? · mensaje · contacto opc.
       · Muestra equivalencia: "Q1,000 ≈ AU$192.31 (tasa del DD/MM HH:MM)"
       · Aviso: "El valor final en AUD se fija cuando confirmemos la recepción"
  → Resumen → Registrar → Aporte PENDIENTE + referencia
  → Instrucciones configuradas del evento (P2)
  → Página de agradecimiento: "Tu aporte está PENDIENTE de verificación"
```

## 6. Flujo del administrador

```
1. Inicia sesión
2. Crea evento, beneficiarios, destino de fondos (P2), tasa vigente, regalos
3. Publica y comparte el enlace
4. Ciclo de verificación:
     Pendientes → verifica ingreso por referencia (fuera del sistema)
       → Confirmar: ingresa monto y moneda recibidos
            → el sistema muestra: tasa vigente, AUD equivalente,
              distribución (regalo / excedente al fondo)
            → Confirma → queda fijo (transacción única)
       → o Rechazar con motivo
5. Modera mensajes, actualiza la tasa cuando corresponda
6. Cierra el evento, exporta, registra la entrega a beneficiarios
```

---

## 7. Flujo de los aportes

```
REGISTRO (invitado)                      CONFIRMACIÓN (administrador, transacción única)
─────────────────                        ───────────────────────────────────────────────
monto_declarado + moneda                 monto_original + moneda_original (lo recibido)
estimación AUD (informativa)             tasa vigente → snapshot (valor, fecha, fuente)
estado = PENDIENTE                       monto_aud = convertir(original)
                                         bloquear regalo → faltante actual
                                         asignación directa = min(monto_aud, faltante)
                                         excedente → asignación al fondo general
                                         estado = CONFIRMADO + auditoría
```

Estados: `PENDIENTE → CONFIRMADO` | `PENDIENTE → RECHAZADO`. Sin vencimiento (P4).
Corrección de un confirmado por error: ver conflicto C5.

**Totales derivados**

- Recaudado de un regalo = Σ asignaciones a ese regalo (de aportes confirmados).
- Faltante = meta − recaudado (nunca negativo).
- Fondo total = Σ `monto_aud` de aportes confirmados.
- Fondo general = Σ asignaciones al fondo general (directas + excedentes).
- Pendiente de un regalo = Σ estimaciones AUD de pendientes declarados a ese regalo
  (etiqueta “PENDIENTE”, valor aproximado si fue declarado en GTQ).

---

## 8. Manejo de AUD y GTQ

### 8.1 Principios

1. AUD es la moneda base; las metas solo existen en AUD.
2. Un único servicio `convertir(monto, de, a) → {monto, tasa}` usando la tabla `TasaCambio`.
   Ninguna tasa escrita en código ni repetida.
3. **Dos usos de la tasa:**
   - *Visualización y estimación* (páginas, formulario): tasa vigente, marcada con “≈”.
   - *Contabilización* (confirmación): tasa vigente **al confirmar**, guardada como snapshot
     en el aporte. [DECIDIDO] P6.
4. Historial: una tasa nueva se agrega; nunca modifica aportes confirmados.

### 8.2 Convención de la tasa [PROPUESTA]

Se guarda como **1 AUD = X GTQ** (como lo expresa el usuario). Conversiones:

- GTQ → AUD: `aud = gtq / X`
- AUD → GTQ: `gtq = aud × X`

Ejemplo P6: Q350 / 5.20 = 67.3077 → **AU$67.31**.

### 8.3 Redondeo [PROPUESTA]

- Contabilización: se redondea **una sola vez** al centavo, *half-up* (67.3077 → 67.31).
- Visualización en GTQ: redondeo a quetzal entero, siempre con “≈”.
- Las asignaciones se calculan sobre el `monto_aud` ya redondeado (sin nuevos redondeos).

### 8.4 Fuente de la tasa — [ABIERTO]

Manual, automática (API) o híbrida (sección 12 de la v0.1 se mantiene). El modelo guarda
`fuente` en cualquier caso. Para el MVP basta con **manual** si no se decide otra cosa; la
decisión puede tomarse durante PLAN sin afectar el modelo.

---

## 9. Qué se almacena

**Se almacena:** eventos, miembros, beneficiarios, destino de fondos, regalos, aportes (con
declarado y confirmado), **asignaciones**, transiciones, tasas históricas, mensajes,
auditoría.

**Se deriva:** recaudado, faltante, completado, fondo total, fondo general, pendientes,
conversiones de visualización.

**No se almacena:** datos de tarjeta o credenciales bancarias, IP en claro, documentos de
identidad. Comprobantes de depósito: [ABIERTO] (depende de P2).

---

## 10. Fuera del MVP

- Pagos en línea y cualquier proveedor real (tarjeta, PayPal, Stripe, locales).
- Método de transferencia específico y datos bancarios concretos (P2).
- Vencimiento de pendientes y reglas adicionales (P4).
- Compra de productos / tiendas; desembolso automático; reembolsos.
- Registro autoservicio de organizadores / SaaS / cobros de comisión.
- Cuentas de invitado; notificaciones automáticas; apps nativas; multi-idioma en UI.
- Tasa automática por API (salvo que se decida en PLAN).

---

## 11. Riesgos antes de integrar pagos

Sin cambios respecto a v0.1: regulación de intermediación/remesas y prevención de lavado
(Guatemala y Australia), disponibilidad de procesadores por país, comisiones y diferencial
cambiario, contracargos, alcance PCI, conciliación, quién es el comerciante legal en el
SaaS. Se suma:

- **Diferencia entre AUD contabilizado y AUD real recibido:** con P6 el AUD se fija con la
  tasa de referencia al confirmar; lo que los beneficiarios reciban en Australia dependerá
  de la tasa y comisiones del envío real. El sistema debe comunicar que los montos AUD son
  **contables**, no garantizados (y el desembolso real se registra aparte).

---

## 12. Arquitectura — [ABIERTO] P12

Capas y puntos de extensión (sin cambios): dominio puro · aplicación (casos de uso) ·
infraestructura (`Repositorio`, `PaymentProvider` [manual], `RateProvider` [manual]) · web.

Opciones de stack siguen abiertas: **A** Next.js + Postgres administrado + ORM; **B** Supabase
(Auth + Postgres + RLS) + frontend; **C** estático + Sheets/Make (no recomendada). Es la
decisión que bloquea el inicio de BUILD (ver `PLAN.md`, Fase 0).

---

## 13. Estructura del repositorio `listas-regalos` [PROPUESTA]

```
/
├── README.md
├── docs/
│   ├── SPEC.md · PLAN.md · DECISIONES.md
│   └── adr/                        (una decisión técnica por archivo)
├── src/
│   ├── domain/
│   │   ├── money/                  Money, Currency, redondeo
│   │   ├── fx/                     convertir(), snapshot de tasa
│   │   ├── contributions/          estados, confirmación, asignación (P5)
│   │   ├── gifts/                  progreso derivado
│   │   └── events/
│   ├── application/                registrarAporte, confirmarAporte, rechazarAporte…
│   ├── infrastructure/
│   │   ├── db/                     esquema, migraciones, repositorios
│   │   ├── payments/manual/
│   │   └── rates/manual/
│   └── web/                        página pública + panel admin
├── db/seed/                        evento ficticio para desarrollo
├── tests/ (domain/, application/, e2e/)
├── .env.example
└── .github/workflows/ci.yml
```

---

## 14. Conflictos y ajustes que producen las decisiones

| # | Conflicto | Tratamiento en esta SPEC |
|---|-----------|--------------------------|
| **C1** | **P5 + P6:** la distribución regalo/excedente depende del monto en AUD, y en un aporte en GTQ ese monto **solo se conoce al confirmar**. El invitado no puede saber con certeza cuánto irá al regalo y cuánto al fondo. | La distribución se calcula **en la confirmación**. Al registrar solo se muestra una estimación con aviso. |
| **C2** | **Orden de los aportes:** si A registra primero pero B se confirma primero, B completa la meta y el excedente de A va al fondo general. | Se aplica el **orden de confirmación** (RN-11). [PROPUESTA] — confirmar si es aceptable. |
| **C3** | **“Regalar completo” en GTQ:** el invitado paga el faltante estimado en quetzales; si la tasa cambia antes de confirmar, puede quedar **un pequeño faltante** (p. ej. AU$0.40) o un pequeño excedente. El excedente ya está resuelto por P5; el faltante no. | [ABIERTO] Opciones: (a) aceptar el faltante residual (la meta queda abierta por centavos); (b) tolerancia configurable (p. ej. ≤ AU$1 marca el regalo como completado sin inventar dinero: la meta se considera cumplida pero el recaudado real queda registrado); (c) el administrador decide al confirmar. |
| **C4** | **Aportes a regalos completados:** con P5, cualquier aporte a un regalo completo iría 100 % al fondo general. | [ABIERTO] Opciones: (a) ocultar el botón y sugerir el fondo general; (b) permitirlo con aviso “irá al fondo general”. |
| **C5** | **Corrección de errores:** P3/P4 solo definen PENDIENTE, CONFIRMADO, RECHAZADO. Si el administrador confirma con un monto equivocado, no hay forma de corregir sin borrar (y RN-10 lo prohíbe). | [ABIERTO] Propuesta mínima: estado **ANULADO** (solo `owner`, con motivo) que revierte las asignaciones de ese aporte y permite registrar uno correcto; **no** se recalculan aportes posteriores. Alternativa: no incluirlo y corregir en la base con auditoría manual. |
| **C6** | **PENDIENTE visible (P4) + GTQ (P7):** el monto pendiente de un aporte en GTQ no tiene valor AUD fijo. | Se muestra como “PENDIENTE ≈ AU$X” usando la tasa vigente; no afecta recaudado. |
| **C7** | **Pendientes que exceden la meta:** con varios pendientes, la suma puede superar el faltante; sin vencimiento (P4) se acumulan. | Se permite; P5 resuelve el exceso al confirmar. El administrador rechaza manualmente los que nunca lleguen. |
| **C8** | **P2 abierto vs P6/P7:** P6 habla de “moneda original”, pero lo que se recibe depende de la cuenta. Si la cuenta es en USD o el invitado declaró AUD y deposita GTQ, la moneda recibida difiere de la declarada, y podría requerirse una tasa distinta de AUD/GTQ. | El modelo separa **declarado** y **recibido** y la tabla de tasas acepta cualquier par. Qué monedas se reciben queda en `DestinoFondos.monedas_recepcion` — [ABIERTO] P2. |
| **C9** | **P1 vs entorno de trabajo:** la integración de GitHub de esta sesión no tiene permiso para crear repositorios (error 403). | El usuario debe crear `listas-regalos` manualmente; después se agrega a la sesión y se trasladan los documentos. |

---

## 15. Preguntas abiertas

**Siguen abiertas**

- **P2.** Cuenta de destino y método real de transferencia (determina instrucciones,
  monedas de recepción y datos a guardar; C8).
- **P8.** Anonimato: ¿solo público o también frente a los beneficiarios?
- **P9.** Administradores y permisos.
- **P10.** Acceso a la página (pública / enlace no listado / código) y si se muestran montos
  individuales.
- **P11.** Idioma(s).
- **P12.** Stack (A o B). **Bloquea BUILD.**
- **P13.** Mensajes públicos o privados; moderación.
- **P14.** Fecha del Baby Shower y fecha de publicación.
- **P15.** Contenido de la lista (quién la arma, imágenes, datos visibles de la familia).
- **P16.** Aporte mínimo.
- **Fuente de la tasa** (manual / API / híbrida) — 8.4.

**Nuevas por los conflictos:** C2 (orden de confirmación), C3 (faltante residual), C4
(aportes a regalos completados), C5 (anulación).
