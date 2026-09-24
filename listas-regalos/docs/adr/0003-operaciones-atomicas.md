# ADR-0003 — Confirmar y anular como funciones atómicas en Postgres

- **Estado:** Aceptado (decisión técnica; deriva de C2, C5, C10 y del requisito de consistencia)
- **Contexto:** dos confirmaciones simultáneas sobre el mismo regalo no deben superar la meta
  (P5); el orden de confirmación define la asignación (C2); anular no debe tocar otros
  aportes (C10).
- **Decisión:** `confirmar_aporte` y `anular_aporte` como funciones Postgres
  (`security definer` con verificación explícita de rol) que, en una transacción:
  bloquean la fila del regalo, calculan el faltante con asignaciones vigentes, insertan
  asignaciones, asignan `orden_confirmacion` por evento, cambian el estado y escriben
  transición + auditoría.
- **Riesgo:** duplicar reglas entre TypeScript (dominio) y SQL. **Mitigación:** los mismos
  casos de aceptación se ejecutan contra ambas implementaciones.
