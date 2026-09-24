# ADR-0002 — Representación del dinero, tasa y redondeo

- **Estado:** Aceptado (decisión técnica menor y reversible, documentada en SPEC §8)
- **Decisión:**
  - Montos como enteros en unidades menores (centavos AUD, centavos GTQ) + código ISO 4217.
    En Postgres: `bigint`; en TypeScript: `bigint` o entero seguro validado.
  - Tasa como decimal exacto (`numeric(18,8)` en Postgres; cadena decimal en TypeScript),
    convención **1 AUD = X GTQ**.
  - Conversión GTQ→AUD: `aud = gtq / X`, redondeada **una sola vez** al centavo, *half-up*.
  - Visualización GTQ: quetzal entero con “≈”.
  - Nunca `float` para dinero o tasas.
- **Casos de referencia:** Q350 / 5.20 = AU$67.31 · Q500 / 5.20 = AU$96.15.
