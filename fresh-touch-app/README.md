# FreshTouch App — HX02+ (Fase 1)

Base nueva y aislada de la aplicación FreshTouch para HX02 y máquinas
futuras (HX03, HX04, HX05...). Conserva la experiencia visual de FreshTouch
(logo, fotos de cascos, animaciones, selección Básico/Premium) sobre una
arquitectura modular nueva, pensada para que agregar una máquina sea
configuración, no código.

## Aislamiento

- **HX01 no fue tocado.** `app.js`, `config.js`, `index.html`, `styles.css`,
  `freshtouch_app.html` e `img/`, en la raíz del repositorio, siguen siendo
  la app de producción — ningún archivo de ahí fue editado; solo se leyeron
  como referencia y se copiaron sus imágenes/CSS a esta carpeta nueva.
- **`freshtouch-hx02-cubo-lab/` no fue tocado.** El `PaymentProvider`/
  `CuboCardProvider`/`paymentStateMachine.js` reales, ya probados con
  hardware, siguen ahí, sin cambios. Esta fase reproduce su misma forma de
  contrato, pero no importa ni copia su código.
- **`freshtouch-core/` no fue tocado.** El sistema remoto de autorización y
  reportes queda completamente fuera del alcance de esta fase.
- Verificado automáticamente: `web/tests/isolation.test.js` escanea todo
  `web/` en busca de identificadores propios de HX01, del lab de Cubo, o de
  FreshTouch CORE, y falla si encuentra alguno.

## Qué es esta fase (y qué no es)

Es la base modular + la interfaz visual portada, funcionando con **mocks
explícitos** para todo lo que todavía no está integrado de verdad: pago
(Cubo), ESP32, y el puente nativo de Android. Cada mock está marcado
`⚠️ MOCK / NOT PRODUCTION ⚠️` en su propio archivo — ninguno pretende ser
una integración real.

No es: una app Android, no tiene Keystore, no tiene watchdog, no habla con
Cubo ni con ESP32 reales, no se conecta a FreshTouch CORE. Todo eso llega en
fases posteriores (ver `docs/ROADMAP.md`).

## Estructura

Ver `docs/ARCHITECTURE.md` para el detalle de cada módulo y sus contratos.

```
fresh-touch-app/
├── web/            — código web, agnóstico del contenedor (TWA/Capacitor/navegador)
├── native/          — reservado, vacío (Fase 6/7)
├── config/            — plantilla de configuración de máquina (sin secretos)
└── docs/               — arquitectura y roadmap de fases
```

## Cómo correrlo

```bash
cd fresh-touch-app/web
npm test              # node --test tests/*.test.js — lógica pura, sin navegador
npm run serve          # sirve en http://localhost:8090 para probar en un navegador real
```
