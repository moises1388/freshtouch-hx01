# Registro de decisiones

| ID | Fecha | Tema | Decisión | Estado |
|----|-------|------|----------|--------|
| P1 | 2026-09-24 | Repositorio | Repositorio privado independiente `listas-regalos`, sin mezcla ni dependencias con Hydrox, FreshTouch, B&R o Forja; evolucionable a SaaS. Creación manual por el usuario. | DECIDIDO |
| P2 | 2026-09-24 | Destino de fondos | Cuenta en Guatemala, en GTQ, a nombre de la esposa del usuario. Método de entrega de los invitados: por definir. Sin integración de pagos ni transferencias. | DECIDIDO (método ABIERTO) |
| P3 | 2026-09-24 | Registro de aportes | Invitado declara → PENDIENTE → admin verifica → CONFIRMADO. Solo confirmados cuentan. | DECIDIDO |
| P4 | 2026-09-24 | Pendientes | Etiqueta “PENDIENTE”. Sin vencimiento ni reglas adicionales. | DECIDIDO |
| P5 | 2026-09-24 | Excedentes | Excedente sobre el faltante → fondo general automáticamente, con trazabilidad. | DECIDIDO |
| P6 | 2026-09-24 | Conversión | Tasa fijada al CONFIRMAR; se guardan moneda/monto originales, tasa, AUD, fecha/hora y fuente. Históricos inmutables. | DECIDIDO (MVP) |
| P7 | 2026-09-24 | Moneda del aporte | AUD o GTQ; metas en AUD. | DECIDIDO (MVP) |
| C2 | 2026-09-24 | Orden de asignación | Orden de confirmación del administrador; registrado en auditoría. | DECIDIDO |
| C3 | 2026-09-24 | Diferencia cambiaria | Sin tolerancia. Se registra el AUD real recibido; no se completa artificialmente. | DECIDIDO |
| C4 | 2026-09-24 | Regalo completado | Botón visible + advertencia “Este regalo ya fue completado. Tu aporte se agregará al fondo general del evento.” | DECIDIDO |
| C5 | 2026-09-24 | Anulación | Estado ANULADO con motivo, usuario, fecha/hora y referencia al aporte original. Nunca eliminar. | DECIDIDO |
| P12 | 2026-09-24 | Stack | Next.js + Supabase (PostgreSQL, Auth, RLS, Storage si se necesita). | DECIDIDO |
| ALC | 2026-09-24 | Alcance | Sin pagos reales, transferencias, Stripe, PayPal, Mercado Pago, bancos, Telegram, WhatsApp API, IA, automatizaciones, scraping, compras automáticas ni multi-moneda avanzada. | DECIDIDO |
| PLAN | 2026-09-24 | Plan | PLAN aprobado con estas decisiones. BUILD solo por fases, después de trasladar la documentación y verificar el repositorio. | DECIDIDO |
| C10 | — | Anulación y excedentes posteriores | Propuesta: no recalcular aportes posteriores. | PROPUESTA |
