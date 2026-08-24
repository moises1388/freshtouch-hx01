# Arquitectura — FreshTouch App HX02+

## Capas y su dirección de dependencia

```
                    ui/
                     │
                     ▼
              operationState/
                     │
        ┌────────────┼────────────┬───────────────┐
        ▼            ▼            ▼               ▼
    payment/      esp32/    machineConfig/   nativeBridge/
```

`ui/` nunca importa directamente de `payment/`, `esp32/` ni `nativeBridge/`
— solo conoce `operationState/` (para saber qué pantalla mostrar) y recibe
sus datos ya resueltos desde `main.js`, el único archivo que conoce a todos
los módulos a la vez. `web/tests/isolation.test.js` hace cumplir esto
automáticamente, no es solo una convención de nombres de carpeta.

`admin/` es la excepción intencional: consulta `nativeBridge/` directamente
(vía `adminSession.js`), porque autenticar al administrador es, por
diseño, una operación que siempre debe resolver el componente nativo — no
tiene sentido que pase por `operationState/`.

## Contratos vs. mocks

Cada módulo con lógica de negocio real futura (`payment/`, `esp32/`,
`machineConfig/`, `nativeBridge/`, `admin/`) tiene dos archivos:

- `xContract.js` — la forma que cualquier implementación debe cumplir.
  Verificada en runtime con `assertImplementsXContract()`, no solo
  documentada en un comentario.
- `mockX.js` — una implementación de prueba, marcada `⚠️ MOCK / NOT
  PRODUCTION ⚠️` en su primera línea de comentario, que cumple el contrato
  sin hacer nada real.

Los contratos no se inventaron para esta fase — reproducen formas ya
reales:

| Contrato | Reproduce la forma de |
|---|---|
| `PaymentContract` | `freshtouch-hx02-cubo-lab/src/payment/paymentProvider.js`, ya construido y probado con hardware real (QPOS Cute) |
| `ESP32Contract` | Las llamadas ya en producción en `app.js` de HX01 (`relay(comp,on)`, notificación de fin de ciclo), con una adición nueva (`testConnection()`) para las necesidades de provisioning que HX01 no tiene |
| `MachineConfigContract` | El esquema ya usado en `machine.config.json` del lab de HX02 |

## operationState — por qué es un módulo aparte de paymentStateMachine

`operationState/operationStateMachine.js` modela **la sesión de la UI**
(qué pantalla ve el cliente). Es un problema distinto del que resuelve la
máquina de estados de pago del lab de Cubo — esa modela el detalle interno
de un intento de pago específico. `operationState` es "cliente
seleccionando servicio, esperando pago, en ciclo de lavado"; la del lab de
Cubo es "conectando POS, esperando tarjeta, procesando, aprobado/
rechazado". Se comunican (un resultado de pago dispara una transición de
operationState) pero nunca se fusionan en una sola máquina de estados —
mezclar ambas responsabilidades fue explícitamente lo que esta fase debía
evitar.

## nativeBridge — la frontera con Android

Es el único punto de la capa web que "sabe" que algún día habrá un
componente nativo. Hoy (`mockNativeBridge.js`) no hace nada real; en Fase 6
esta misma interfaz la implementará un cliente HTTP hacia
`http://127.0.0.1:<puerto>` donde corra el componente nativo (Android
Keystore, autenticación de administrador, diagnóstico real) — diseño ya
acordado en una investigación arquitectónica anterior. Ningún otro módulo
de `web/` necesitará cambiar cuando eso pase.

## Decisiones pendientes (no resueltas en esta fase)

- El asset visual del casco (`img02.png`/`img03.png`) tiene el texto "HX01"
  visible dentro de la propia imagen — no es un dato de configuración, está
  "quemado" en el archivo. Para HX03/HX04/etc. hará falta decidir si se
  encarga un set de imágenes neutro (sin el nombre de una máquina
  específica) o si se acepta reutilizar el mismo arte para todas.
- El layout de la pantalla idle es una adaptación fiel en colores/
  tipografía/logo, pero no una réplica pixel-por-pixel del `index.html`
  original de HX01 (que tiene más de 300 líneas de marcado específico) —
  se priorizó la arquitectura modular sobre la réplica exacta. Si hace
  falta fidelidad visual mayor, es un ajuste de CSS/HTML dentro de `ui/`,
  no un cambio de arquitectura.
- `main.js` hoy expone `window.FreshTouchApp` para que `index.html` lo
  invoque desde atributos `onclick` (mismo patrón que ya usa `app.js` de
  HX01) — funciona bien para Fase 1 sin necesitar un bundler, pero es una
  decisión a revisar si el proyecto crece y se vuelve difícil de mantener
  sin un sistema de build.
