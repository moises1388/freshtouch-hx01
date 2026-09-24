# ADR-0001 — Stack: Next.js + Supabase

- **Estado:** Aceptado (decisión del usuario, P12, 2026-09-24)
- **Contexto:** MVP de listas de regalos con aislamiento por evento, autenticación de
  administradores, trazabilidad y camino a SaaS.
- **Decisión:** Next.js (App Router, TypeScript) + Supabase (PostgreSQL, Auth, Row Level
  Security; Storage solo si se necesitan imágenes).
- **Consecuencias:**
  - El dominio (`src/domain`) no importa Next ni Supabase, para poder cambiar de proveedor.
  - La autorización se aplica en la base (RLS), no solo en la interfaz.
  - La clave `service_role` nunca se expone al navegador.
  - Sin proveedor de pagos.
