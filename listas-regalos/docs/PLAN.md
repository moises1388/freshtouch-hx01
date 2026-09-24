# listas-regalos — PLAN propuesto

> **Estado:** APROBADO v0.2 (2026-09-24). Basado en `SPEC.md` v0.3.
> BUILD solo por fases y solo después de: repositorio `listas-regalos` verificado +
> documentación trasladada en un commit separado + revisión del usuario.

## Principios del plan

1. **Dominio primero.** Las reglas de dinero (conversión, redondeo, confirmación, P5) se
   construyen y prueban como código puro antes de base de datos o pantallas.
2. **Cada fase termina verificable** (criterio de terminado + pruebas) y se revisa antes de
   pasar a la siguiente: BUILD → VERIFY → REVIEW por fase.
3. **Nada depende de P2.** Todo lo relacionado con la cuenta y el método de pago se
   concentra en `DestinoFondos` y en el proveedor `manual`; P2 solo bloquea la
   **publicación real**, no el desarrollo.
4. **Datos ficticios** en todo el desarrollo; ningún dato bancario real en el repositorio.

---

## Puertas de decisión

| Puerta | Decisiones | Estado |
|--------|------------|--------|
| **G0** | Repositorio `listas-regalos` creado y verificado · stack | Stack DECIDIDO (Next.js + Supabase); repositorio pendiente |
| **G1** | C2 · C3 · C5 · C10 | DECIDIDAS |
| **G2** | C4 · P8 anonimato · P10 acceso · P13 mensajes · P16 mínimo | C4 DECIDIDA; resto ABIERTO — bloquea Fase 4 |
| **G3** | P9 administradores | Acciones financieras = solo `owner` (DECIDIDO). Resto de permisos de `admin`/`viewer`: ABIERTO (no bloquea el núcleo) |
| **G4** | Método de entrega del dinero · P14 fecha · P15 contenido · P11 idioma · hosting | ABIERTO — bloquea Fase 6 |

Tasa: manual, introducida al confirmar (DECIDIDO).

---

## Fases

### Fase 0 — Fundamentos del repositorio (tras G0)

- Trasladar `SPEC.md`, `PLAN.md`, `DECISIONES.md` al nuevo repositorio; borrar la rama
  temporal en `freshtouch-hx01`.
- README, estructura de carpetas (SPEC §13), `.env.example`, licencia/privacidad (decidir).
- Herramientas: TypeScript estricto, linter, formateador, runner de pruebas.
- CI: lint + tipos + pruebas en cada push.
- ADR-0001 con el stack elegido.

**Terminado cuando:** CI verde con una prueba trivial; repositorio sin referencias a otros
proyectos.

### Fase 1 — Dominio puro (sin base de datos ni UI)

- `Money` (entero en centavos + moneda), catálogo de monedas (AUD, GTQ).
- `convertir()` con la convención **1 AUD = X GTQ** y redondeo half-up al centavo (SPEC 8.2–8.3).
- Máquina de estados: PENDIENTE → CONFIRMADO | RECHAZADO; CONFIRMADO → ANULADO.
- `confirmarAporte()` puro: recibe aporte, monto recibido, tasa y faltante actual → devuelve
  snapshot de tasa, `monto_aud` y **asignaciones** (directa + excedente, P5).
- Cálculo derivado: recaudado, faltante, completado, fondo total, fondo general, pendientes.

**Pruebas mínimas (casos de aceptación):**

| Caso | Entrada | Esperado |
|------|---------|----------|
| P6 | Q350, tasa 5.20 | AU$67.31, snapshot con tasa, fecha/hora y fuente |
| P5 | meta 800, recaudado 780, aporte AU$100 | AU$20 regalo (directo) + AU$80 fondo (excedente) |
| Exacto | faltante 275, aporte AU$275 | AU$275 regalo, 0 excedente, regalo completado |
| Fondo general | aporte AU$50 sin regalo | AU$50 fondo general (directo) |
| C4 regalo completo | faltante 0, aporte AU$40 | AU$40 fondo general (excedente) |
| Inmutabilidad | cambia la tasa después | aportes confirmados sin cambios |
| Invariante | cualquier confirmación | Σ asignaciones = monto_aud; faltante nunca negativo |
| Pendiente | aporte PENDIENTE | no suma a recaudado; sí aparece en pendientes |
| C3 | declarado AU$100, recibido Q500, tasa 5.20 | AU$96.15 confirmado; faltante residual AU$3.85; sin completar artificialmente |
| C2 | A declara antes que B; B se confirma primero | B llena el faltante; excedente de A al fondo; orden 1 = B, 2 = A |
| C5 | anular aporte confirmado | estado ANULADO con motivo/usuario/fecha; sus asignaciones dejan de contar; nada se borra |
| C10 | anular aporte que completaba el regalo | regalo reabierto; excedentes posteriores permanecen en el fondo |

**Terminado cuando:** todas las pruebas pasan; cobertura completa de `domain/`.

### Fase 2 — Persistencia y aislamiento

- Proyecto Supabase propio (desarrollo); migraciones en `supabase/migrations`.
- Esquema: evento, miembro, beneficiario, destino de fondos, regalo, aporte,
  asignación, transición, intento de pago, tasa, auditoría.
- Aislamiento por evento en la base (RLS o equivalente según stack).
- Funciones Postgres atómicas `confirmar_aporte` y `anular_aporte` (bloqueo de fila del regalo, secuencia de orden por evento).
- RLS por `event_id` y rol; clave `service_role` solo en servidor.
- Los casos de aceptación de Fase 1 se ejecutan también contra las funciones SQL (evitar divergencia).
- Auditoría append-only; referencias únicas; datos semilla ficticios.

**Terminado cuando:** pruebas de integración cubren: confirmaciones concurrentes sobre el
mismo regalo no exceden la meta; un usuario sin rol no lee otro evento; nada se borra.

### Fase 3 — Panel de administración

> Permisos financieros [DECIDIDO]: solo `owner` confirma, rechaza, anula, define la tasa
> de una confirmación y ve el historial financiero completo. Para el resto de acciones de
> `admin`/`viewer` [ABIERTO] se aplica la opción más restrictiva y reversible: **solo
> `owner` escribe**; `admin` y `viewer` tienen lectura no financiera hasta que se decida.

- Autenticación de administradores y roles por evento.
- CRUD de evento, beneficiarios, regalos, **destino de fondos** (texto genérico por ahora).
- Tasa vigente (manual) con historial.
- Bandeja de aportes: filtrar por estado, buscar por referencia.
- Confirmar (con vista previa de tasa, AUD y distribución) / Rechazar / registro directo.
- Exportación CSV.

**Terminado cuando:** un administrador puede montar el evento ficticio completo y confirmar
aportes en AUD y GTQ viendo la distribución correcta.

### Fase 4 — Página pública del evento (tras G2)

- Página del evento y lista de regalos: AUD, `≈ Q`, recaudado, faltante, **PENDIENTE**,
  estado.
- Formulario de aporte: modalidad, moneda AUD/GTQ con equivalencia en vivo, nombre/anónimo,
  mensaje, contacto opcional.
- Pantalla de referencia + instrucciones configuradas + agradecimiento.
- Anti-spam (límite de tasa + captcha ligero), idempotencia de envío.
- Móvil primero; accesibilidad básica.

**Terminado cuando:** un invitado registra en AUD y en GTQ desde el teléfono y el aporte
aparece como PENDIENTE en la página y en el panel.

### Fase 5 — VERIFY y REVIEW integral

- Pruebas de extremo a extremo del ciclo completo (registro → pendiente → confirmación →
  progreso → excedente → completado).
- Revisión de seguridad (autenticación, aislamiento, validación de montos, secretos).
- Prueba de aceptación del usuario en un entorno de pruebas con datos ficticios.

**Terminado cuando:** el usuario aprueba la prueba de aceptación.

### Fase 6 — Preparación del evento real (tras G4)

- Configurar `DestinoFondos` (Guatemala, GTQ) con el método de entrega que se decida (sin integrar pagos).
- Cargar la lista real, tasa real, textos, dominio y hosting de producción.
- Publicar y compartir el enlace.

---

## Qué no incluye este plan

Pagos reales, transferencias, Stripe, PayPal, Mercado Pago, bancos, Telegram, WhatsApp API,
IA, automatizaciones, scraping de tiendas, compras automáticas, multi-moneda avanzada,
vencimiento de pendientes, tolerancia cambiaria, SaaS/autoservicio, notificaciones.

## Riesgos del plan

| Riesgo | Mitigación |
|--------|-----------|
| P2 se resuelve tarde y requiere cambios de modelo | Declarado/recibido separados y tasas por cualquier par desde Fase 1–2. |
| Fecha del evento cercana (P14 desconocida) | Fases 1–4 son el mínimo publicable; si hay poco tiempo, se recorta Fase 3 (exportación) y moderación. |
| Errores de redondeo o dinero | Dominio aislado con casos de aceptación explícitos antes de UI. |
| Dependencia de un proveedor (stack B) | Dominio y casos de uso sin imports del proveedor; adaptadores en `infrastructure/`. |
