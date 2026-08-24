# Roadmap de fases — FreshTouch App HX02+

Definido en la autorización de Fase 1. Cada fase se ejecuta solo con
autorización explícita, una a la vez.

- [x] **Fase 1** — Base de la nueva aplicación + UI FreshTouch reutilizada + arquitectura modular.
- [ ] **Fase 2** — Machine Configuration + provisioning local (reemplaza `mockMachineConfig.js` por carga/edición real).
- [ ] **Fase 3** — ESP32 Controller real (reemplaza `mockEsp32Controller.js`).
- [ ] **Fase 4** — PaymentProvider integrado con la UI, inicialmente con mock más elaborado.
- [ ] **Fase 5** — Integración real de Cubo (conecta el `CuboCardProvider` ya construido en `freshtouch-hx02-cubo-lab/`), una vez resuelto el diagnóstico del 401 en Sandbox.
- [ ] **Fase 6** — Admin real + Native Bridge + Android Keystore (reemplaza `mockNativeBridge.js` y `mockAdminAuth.js`).
- [ ] **Fase 7** — TWA/Android + Device Owner + modo kiosco.
- [ ] **Fase 8** — Integración con FreshTouch CORE (Telegram, Sheets, sincronización, reporting).

No avanzar de fase sin autorización explícita — regla vigente desde Fase 1.
