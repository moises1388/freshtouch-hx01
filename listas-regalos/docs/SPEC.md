# listas-regalos — Especificación

> **Estado:** SPEC v0.4 (2026-09-24). Incorpora P1–P7, P2 (parcial), C2–C5, C10, P9 (anulación),
> tasa manual y el stack.
> Siguiente etapa: BUILD por fases según `PLAN.md`, **después** de trasladar la
> documentación al repositorio `listas-regalos` y verificar ese estado.
>
> **Repositorio [DECIDIDO]:** repositorio privado independiente **`listas-regalos`**, sin
> mezcla ni dependencias con Hydrox, FreshTouch, B&R o Forja; evolucionable a SaaS. Mientras
> no esté disponible, estos documentos viven temporalmente en la carpeta aislada
> `listas-regalos/` de una rama de `freshtouch-hx01` que **no debe fusionarse con main**.

Convenciones: **[DECIDIDO]** lo definió el usuario · **[PROPUESTA]** sugerencia pendiente de
aprobación · **[ABIERTO]** sin decidir. Registro de decisiones: `DECISIONES.md`.

---

## 1. Comprensión del proyecto

Una plataforma web donde un **evento** publica una **lista de regalos** que funcionan como
**metas de recaudación**, no como productos. Los invitados **declaran aportes** —totales o
parciales— a un regalo o al **fondo general** y dejan un mensaje. Un administrador verifica
**fuera del sistema** que el dinero llegó y **confirma** el aporte. Lo confirmado pertenece a
un único **fondo del evento**, que se entrega a los **beneficiarios**.

Núcleo del MVP [DECIDIDO]:

```
EVENTO → REGALOS → DECLARACIÓN DE APORTE → APORTE PENDIENTE → CONFIRMACIÓN ADMINISTRATIVA
       → CONVERSIÓN AUD/GTQ → ASIGNACIÓN AL REGALO → EXCEDENTE AL FONDO GENERAL → AUDITORÍA
```

1. **No es una tienda.** Completar una meta no compra nada.
2. **Un solo fondo por evento.** El progreso de un regalo es una vista de las *asignaciones*
   confirmadas hacia ese regalo.
3. **Moneda base AUD** para metas y contabilidad. El invitado declara en **AUD o GTQ**.
4. **El dinero real se maneja fuera del sistema** en esta versión. Destino del primer evento:
   cuenta en **Guatemala**, en **GTQ**, a nombre de la esposa del usuario. El **método** por
   el cual los invitados entregan el dinero está **[ABIERTO]**.
5. **Modelo genérico:** “Baby Shower” es solo el tipo del primer evento.

---

## 2. Requisitos funcionales

### Invitado (público)

| ID | Requisito |
|----|-----------|
| RF-01 | Ver la página del evento: título, descripción, beneficiarios, fecha, imagen. |
| RF-02 | Ver cada regalo con **meta en AUD** y `≈ Q___`, indicando que es aproximado y la fecha/hora de la tasa. |
| RF-03 | Ver por regalo: **recaudado (confirmado)**, **faltante** y, por separado, lo **PENDIENTE**. |
| RF-04 | Ver el estado del regalo: *disponible*, *con aportes*, *completado*. |
| RF-05 | Declarar un aporte por el **faltante completo** de un regalo. |
| RF-06 | Declarar un aporte **parcial** a un regalo. |
| RF-07 | Declarar un aporte libre al **fondo general**. |
| RF-08 | Elegir la **moneda: AUD o GTQ**, viendo la equivalencia en la otra moneda y el aviso de que el valor final se fija al confirmar. |
| RF-09 | Escribir un **mensaje** para los beneficiarios. |
| RF-10 | Elegir **nombre visible o anónimo**. |
| RF-11 | Si el regalo **ya está completado**, el botón sigue visible; antes de registrar se muestra: *“Este regalo ya fue completado. Tu aporte se agregará al fondo general del evento.”* y el invitado puede continuar. [DECIDIDO] C4 |
| RF-12 | Al registrar, recibir una **referencia única** y el texto de instrucciones configurado para el evento (contenido [ABIERTO] mientras no se defina el método de entrega). |
| RF-13 | Ver que su aporte quedó **PENDIENTE** de verificación. |

### Administrador del evento

| ID | Requisito |
|----|-----------|
| RF-20 | Iniciar sesión de forma segura (Supabase Auth). |
| RF-21 | Crear/editar evento: tipo, título, descripción, fecha, zona horaria, moneda base, monedas de declaración. |
| RF-22 | Registrar beneficiarios. |
| RF-23 | Configurar el **destino de fondos** del evento (4.3). Sin datos bancarios en la página pública. |
| RF-24 | Crear, editar, ordenar, ocultar y archivar regalos. |
| RF-25 | Registrar la **tasa de referencia** AUD→GTQ (manual) en un único lugar, con historial. Se usa para mostrar `≈ Q` y como valor sugerido al confirmar. |
| RF-26 | Listar aportes por estado; buscar por referencia. |
| RF-27 | **Confirmar** (solo `owner`): ingresar monto y moneda recibidos y, si la moneda no es AUD, **la tasa AUD→GTQ** (precargada con la tasa de referencia, editable). El sistema calcula AUD y la distribución y muestra una **vista previa** antes de confirmar. [DECIDIDO] tasa manual |
| RF-28 | **Rechazar** un pendiente con motivo (solo `owner`). |
| RF-29 | **Anular** un aporte confirmado con motivo (C5) — **solo el dueño del evento** (P9); opcionalmente registrar el aporte corregido referenciando al anulado. |
| RF-35 | Ver el **historial de un regalo**: confirmaciones, excedentes, anulaciones y cómo cambió su recaudado/faltante, para explicar por qué un regalo completado volvió a tener faltante (C10). |
| RF-30 | Registrar directamente un aporte recibido por otro medio (sigue el mismo cálculo). |
| RF-31 | Moderar mensajes (si son públicos — P13). |
| RF-32 | Exportar aportes, asignaciones y mensajes (CSV). |
| RF-33 | Publicar / cerrar evento. |
| RF-34 | Ver el historial de auditoría de aportes, tasas y regalos. El **historial financiero completo** es solo para `owner`. Qué ven los demás roles: [ABIERTO]. |

### Reglas de negocio

| ID | Regla | Estado |
|----|-------|--------|
| RN-01 | Todo aporte pertenece a **un evento** y declara como destino **un regalo o el fondo general**. | DECIDIDO |
| RN-02 | Estados: `PENDIENTE → CONFIRMADO`, `PENDIENTE → RECHAZADO`, `CONFIRMADO → ANULADO`. **Solo CONFIRMADO cuenta como recaudado.** | DECIDIDO P3, C5 |
| RN-03 | PENDIENTE se muestra con la etiqueta **“PENDIENTE”**; sin vencimiento en el MVP. | DECIDIDO P4 |
| RN-04 | **Excedente:** al confirmar, el `monto_aud` se asigna al regalo hasta su faltante; el resto va **automáticamente al fondo general**. | DECIDIDO P5 |
| RN-05 | La distribución se guarda como **asignaciones** trazables. | DECIDIDO P5 |
| RN-06 | La conversión se **fija al CONFIRMAR** y se guarda: moneda original, monto original, tasa, monto AUD, fecha/hora y fuente de la tasa. | DECIDIDO P6 |
| RN-07 | Los aportes confirmados no cambian si la tasa cambia después. | DECIDIDO P6 |
| RN-08 | El invitado declara en **AUD o GTQ**; metas en AUD. | DECIDIDO P7 |
| RN-09 | Un regalo está **completado** cuando Σ asignaciones vigentes = meta. | DECIDIDO |
| RN-10 | Los aportes **nunca se eliminan físicamente**. | DECIDIDO C5 |
| RN-11 | El faltante se evalúa **en el orden en que el administrador confirma**, no en el orden de declaración. Cada confirmación registra en auditoría su número de orden y el faltante existente en ese momento. | DECIDIDO C2 |
| RN-12 | Aporte a un regalo completado: se permite, con advertencia; al confirmar, todo va al fondo general como excedente. | DECIDIDO C4 |
| RN-13 | **Sin tolerancia** por tipo de cambio: se registra el AUD real resultante del monto recibido; **no se completa artificialmente** la diferencia. El regalo queda con faltante y puede completarse con otro aporte. | DECIDIDO C3 |
| RN-14 | **Anulación:** requiere motivo; guarda usuario, fecha/hora y referencia al aporte original. Las asignaciones del aporte anulado dejan de contar. | DECIDIDO C5 |
| RN-15 | Al anular, el regalo **se reabre** según el monto que deja de contar; **no se recalculan ni modifican** aportes históricos ni se mueven retroactivamente los excedentes posteriores enviados al fondo general. La auditoría registra el recaudado/faltante del regalo antes y después de la anulación. | DECIDIDO C10 |
| RN-16 | **Permisos financieros:** solo el `owner` del evento puede confirmar, rechazar y anular aportes, definir la tasa usada en una confirmación y consultar el historial financiero completo. Los demás administradores no tienen esas acciones en el MVP. | DECIDIDO P9 (MVP) |
| RN-18 | La tasa contable es **manual**: la introduce el administrador al confirmar (precargada con la de referencia). Se guarda en el aporte con fuente `manual` y fecha/hora. Sin API automática. | DECIDIDO |
| RN-17 | Anonimato: el nombre de un aporte anónimo nunca aparece en vistas públicas. Alcance frente a beneficiarios: P8. | parcialmente ABIERTO |

Ejemplo C3 [DECIDIDO]: declarado AU$100 → recibido Q500 → tasa al confirmar 1 AUD = Q5.20
→ **AU$96.15 confirmado** (500 / 5.20 = 96.1538…).

---

## 3. Requisitos no funcionales

| Área | Requisito |
|------|-----------|
| **Independencia** | Repositorio, proyecto Supabase, hosting, dominio y secretos propios. |
| **Aislamiento por evento** | Todo dato lleva `event_id`; acceso controlado con **Row Level Security** de Supabase. |
| **Aislamiento por usuario** | Roles por evento (`owner`, `admin`, `viewer`); preparado para una capa *organización* en el SaaS. |
| **Seguridad** | HTTPS; Supabase Auth; validación de montos en servidor; la clave `service_role` nunca llega al navegador; anti-spam en el formulario público; secretos fuera del repositorio. |
| **Trazabilidad** | Auditoría append-only; referencia única; asignaciones inmutables; orden de confirmación registrado. |
| **Consistencia** | Confirmar y anular son **operaciones atómicas en la base** (función Postgres en una transacción, con bloqueo de fila del regalo). |
| **Dinero** | Enteros en centavos + código ISO 4217; tasas `numeric` de alta precisión; nunca `float`; redondeo único documentado (8.3). |
| **Monedas** | Solo AUD y GTQ en el MVP; catálogo en datos para agregar otras después (sin “multi-moneda avanzada”). |
| **Proveedor de pagos** | Ninguno en el MVP. El modelo conserva un campo `metodo_registro` / `proveedor = manual` para no cerrar la puerta. |
| **Móvil primero**, **español**, **UTC en base**, **datos mínimos de invitados**, **servicios administrados de bajo costo**. |

---

## 4. Modelo conceptual de datos

```
Usuario ──< MiembroEvento >── Evento ──< Beneficiario
                                │
                                ├── DestinoFondos
                                ├──< Regalo (meta en AUD)
                                ├──< Aporte ──< Asignacion >── Regalo | FondoGeneral
                                │      ├──< TransicionAporte
                                │      └── corrige_aporte_id → Aporte (anulado)
                                └── Fondo (derivado)

TasaCambio (histórica)           RegistroAuditoria (append-only)
```

### 4.1 Aporte

| Grupo | Campos |
|-------|--------|
| Identidad | `id`, `referencia`, `evento_id` |
| Destino declarado | `regalo_id` (null = fondo general), `modalidad` (`completo` \| `parcial` \| `fondo_general`) |
| Declarado | `monto_declarado`, `moneda_declarada` (AUD \| GTQ), `equivalente_aud_estimado`, `tasa_estimacion_id` — informativo |
| Confirmado (P6) | `monto_original`, `moneda_original`, `tasa_valor`, `tasa_par`, `tasa_fecha_hora`, `tasa_fuente` (`manual` \| `sin conversión`), `tasa_referencia_id` (tasa sugerida en ese momento, si la hubo), `monto_aud`, `orden_confirmacion` (secuencia por evento, C2), `confirmado_en`, `confirmado_por` |
| Rechazo | `motivo_rechazo`, `rechazado_en`, `rechazado_por` |
| Anulación (C5) | `motivo_anulacion`, `anulado_en`, `anulado_por` |
| Corrección | `corrige_aporte_id` (si este aporte reemplaza a uno anulado) |
| Invitado | `nombre_aportante`, `contacto` (opcional), `visibilidad_nombre`, `mensaje`, `mensaje_visible` |
| Estado | `estado` (`PENDIENTE` \| `CONFIRMADO` \| `RECHAZADO` \| `ANULADO`), `metodo_registro` (`formulario` \| `admin`) |
| Otros | `creado_en`, `ip_hash` |

Si `moneda_original = AUD`: `tasa_valor = 1`, `tasa_fuente = "sin conversión"`.

### 4.2 Asignacion

`id, aporte_id, evento_id, destino_tipo (regalo | fondo_general), regalo_id, monto_aud,
motivo (directo | excedente), faltante_antes, creado_en`.

- Invariante: Σ asignaciones de un aporte = `monto_aud` del aporte.
- Solo cuentan las asignaciones de aportes en estado `CONFIRMADO` (las de un `ANULADO` se
  conservan como historial, no se borran).

### 4.3 DestinoFondos

- Primer evento [DECIDIDO]: país **Guatemala**, moneda **GTQ**, titular: esposa del usuario.
- `monedas_recepcion = [GTQ]` para el primer evento.
- `instrucciones_publicas`: **[ABIERTO]** hasta definir el método de entrega; mientras tanto
  texto genérico. Ningún número de cuenta en el repositorio ni en datos semilla.
- Consecuencia: aunque el invitado declare en AUD, lo recibido será normalmente GTQ y se
  convierte al confirmar (caso C3).

### 4.4 Otras entidades

**Evento**, **Usuario**, **MiembroEvento**, **Beneficiario**, **Regalo** (`meta_aud` en
centavos; recaudado/faltante derivados), **TasaCambio** (`par, valor, fuente,
vigente_desde, registrada_por`; nunca se sobrescribe), **TransicionAporte**,
**RegistroAuditoria** (`actor, accion, entidad, entidad_id, antes, despues, fecha`).

---

## 5. Flujo del invitado

```
Enlace → Página del evento
  → Regalo: AU$800 / ≈ Q___ · Recaudado AU$525 · Faltan AU$275 · PENDIENTE ≈ AU$100
  → Elige: completo | parcial | fondo general
       (si el regalo está completado → advertencia C4 → puede continuar)
  → Formulario: moneda (AUD | GTQ) · monto · nombre · ¿anónimo? · mensaje · contacto opc.
       · "Q1,000 ≈ AU$192.31 (tasa del DD/MM HH:MM). El valor final se fija al confirmar."
  → Resumen → Registrar → PENDIENTE + referencia
  → Instrucciones configuradas (genéricas mientras el método esté ABIERTO)
  → Agradecimiento
```

## 6. Flujo del administrador

```
1. Inicia sesión
2. Evento, beneficiarios, destino de fondos, tasa, regalos → Publicar
3. Verificación (fuera del sistema) → Pendientes:
     Confirmar → monto y moneda recibidos → vista previa (tasa, AUD, distribución)
               → confirma (atómico, recibe número de orden)
     Rechazar → motivo
4. Corrección: Anular (motivo) → opcional: registrar aporte corregido que lo referencia
5. Mensajes, tasa, exportación, cierre
```

---

## 7. Flujo de los aportes

```
               ┌────────► RECHAZADO
PENDIENTE ─────┤
               └────────► CONFIRMADO ────────► ANULADO
```

**Confirmar** (función atómica en Postgres):

1. Verificar estado `PENDIENTE` y permisos.
2. Tomar la tasa **introducida por el administrador** (precargada con la de referencia) → snapshot (valor, par, fecha/hora, fuente `manual`).
3. `monto_aud = redondear(monto_original / tasa)` (o igual si es AUD).
4. Bloquear el regalo; calcular faltante con asignaciones vigentes.
5. Asignación directa = `min(monto_aud, faltante)`; excedente → fondo general.
6. Asignar `orden_confirmacion` (secuencia del evento); estado `CONFIRMADO`.
7. Registrar transición y auditoría (incluye orden y faltante previo).

**Anular** (función atómica): verificar `CONFIRMADO` y rol **owner**; guardar motivo, usuario y
fecha/hora; estado `ANULADO`; auditoría con recaudado/faltante del regalo antes y después.
No modifica otros aportes ni mueve excedentes posteriores (RN-15, C10).

**Historial del regalo (C10):** se reconstruye de asignaciones + transiciones ordenadas en el
tiempo. Ejemplo: “#1 confirmado AU$500 → #2 confirmado AU$300 → completado → #3 confirmado
AU$100 (excedente al fondo) → #2 anulado (motivo) → faltan AU$300”.

**Totales derivados** (solo aportes `CONFIRMADO`): recaudado por regalo, faltante (≥ 0),
fondo total, fondo general. Pendientes: suma de estimaciones, mostrada como “PENDIENTE ≈”.

---

## 8. Manejo de AUD y GTQ

1. AUD es base; las metas solo existen en AUD.
2. Un único servicio de conversión con la tabla `TasaCambio`; ninguna tasa en el código.
3. Tasa **de referencia** (manual, con historial; se usa para “≈” y como sugerencia) y tasa
   **contable** (introducida por el administrador al confirmar, guardada en el aporte).
4. Historial: una tasa nueva se agrega; nunca modifica aportes confirmados.

**8.2 Convención [PROPUESTA]:** `1 AUD = X GTQ`. GTQ→AUD: `/ X`; AUD→GTQ: `× X`.

**8.3 Redondeo [PROPUESTA]:** una sola vez al centavo, *half-up*, en la contabilización
(Q350/5.20 = AU$67.31; Q500/5.20 = AU$96.15). Visualización GTQ a quetzal entero con “≈”.
Las asignaciones usan el `monto_aud` ya redondeado.

**8.4 Fuente de la tasa [DECIDIDO]:** manual en el MVP. Sin API automática; podrá agregarse
después como otra fuente sin cambiar el modelo.

**8.5 [Decisión técnica menor, reversible]:** introducir una tasa distinta al confirmar **no**
cambia automáticamente la tasa de referencia mostrada al público; el administrador la
actualiza en su propia pantalla si lo desea.

---

## 9. Qué se almacena

**Se almacena:** eventos, miembros, beneficiarios, destino de fondos (sin números de cuenta
mientras no se decida), regalos, aportes (declarado, confirmado, rechazo, anulación),
asignaciones, transiciones, tasas, mensajes, auditoría.
**Se deriva:** recaudado, faltante, completado, fondos, pendientes, conversiones visuales.
**No se almacena:** datos de tarjeta o credenciales bancarias, IP en claro, documentos de
identidad. Comprobantes: [ABIERTO] (depende del método de entrega).

---

## 10. Fuera del MVP [DECIDIDO]

- Pagos reales y transferencias: Stripe, PayPal, Mercado Pago, bancos, cualquier proveedor.
- Método de entrega del dinero (se definirá después).
- Telegram, WhatsApp API, IA, automatizaciones, scraping de tiendas, compras automáticas.
- Multi-moneda avanzada (solo AUD y GTQ; tasa manual).
- Vencimiento de pendientes; tolerancia por tipo de cambio.
- SaaS/autoservicio, cuentas de invitado, notificaciones, multi-idioma en UI, desembolsos
  automáticos, reembolsos.

---

## 11. Riesgos antes de integrar pagos

Sin cambios: regulación de intermediación/remesas y prevención de lavado (Guatemala y
Australia), disponibilidad de procesadores por país, comisiones y diferencial cambiario,
contracargos, PCI, conciliación, comerciante legal en el SaaS, y diferencia entre el AUD
contable y lo que realmente reciban los beneficiarios en Australia al convertir desde GTQ.

---

## 12. Arquitectura [DECIDIDO: Next.js + Supabase]

| Capa | Tecnología / ubicación |
|------|------------------------|
| Web (página pública y panel) | Next.js (App Router), TypeScript |
| Dominio puro | `src/domain` — TypeScript sin dependencias de Next ni Supabase |
| Casos de uso | `src/application` |
| Base de datos | Supabase PostgreSQL; migraciones versionadas en `supabase/migrations` |
| Autenticación | Supabase Auth (administradores) |
| Autorización | Row Level Security por `event_id` y rol |
| Operaciones atómicas | Funciones Postgres (`confirmar_aporte`, `anular_aporte`) invocadas vía RPC |
| Archivos | Supabase Storage (solo si se necesitan imágenes) |
| Pagos | Ninguno |

Nota de diseño: las reglas de dinero existen en el dominio TypeScript (probadas) y la
confirmación atómica en Postgres. Para evitar que diverjan, las pruebas de la Fase 2 deben
ejecutar los mismos casos de aceptación contra ambas. [PROPUESTA]

Hosting de Next.js: [ABIERTO] (no bloquea las Fases 0–2).

---

## 13. Estructura del repositorio [PROPUESTA]

```
/
├── README.md
├── docs/  SPEC.md · PLAN.md · DECISIONES.md · adr/
├── src/
│   ├── domain/  money/ · fx/ · contributions/ · gifts/ · events/
│   ├── application/
│   ├── infrastructure/  supabase/ (clientes, repositorios)
│   └── app/  (rutas Next.js: /e/[slug], /admin)
├── supabase/  migrations/ · seed.sql (datos ficticios)
├── tests/  domain/ · integration/ · e2e/
├── .env.example
└── .github/workflows/ci.yml
```

---

## 14. Conflictos y su estado

| # | Tema | Estado |
|---|------|--------|
| C1 | Distribución de aportes en GTQ solo se conoce al confirmar | Resuelto: estimación al declarar, cálculo al confirmar |
| C2 | Orden de asignación | **DECIDIDO:** orden de confirmación, registrado en auditoría |
| C3 | Faltante residual por tipo de cambio | **DECIDIDO:** sin tolerancia; se registra el monto real |
| C4 | Aportes a regalos completados | **DECIDIDO:** botón visible + advertencia; va al fondo general |
| C5 | Corrección de errores | **DECIDIDO:** estado ANULADO con motivo, usuario, fecha/hora, referencia |
| C6 | Pendientes en GTQ | Resuelto: “PENDIENTE ≈ AU$X” |
| C7 | Pendientes que exceden la meta | Resuelto: permitido; P5 resuelve al confirmar |
| C8 | Moneda declarada vs recibida | Resuelto por P2: se recibe GTQ; modelo separa declarado/recibido |
| C9 | Creación del repositorio | Pendiente: el usuario lo crea manualmente |
| C10 | Anulación de un aporte que completaba un regalo | **DECIDIDO:** el regalo se reabre; excedentes posteriores no se mueven; auditoría e historial lo explican |

---

## 15. Preguntas abiertas

- **Método de entrega del dinero** (P2 restante) — bloquea solo la publicación real.
- **P8** anonimato frente a beneficiarios · **P9-resto** qué pueden hacer/ver `admin` y
  `viewer` fuera de las acciones financieras (p. ej. editar regalos, moderar mensajes) ·
  **P10** acceso a la página y visibilidad de montos individuales · **P11** idioma ·
  **P13** mensajes públicos/privados · **P14** fecha del evento · **P15** contenido de la
  lista · **P16** aporte mínimo.
- Hosting de Next.js.
