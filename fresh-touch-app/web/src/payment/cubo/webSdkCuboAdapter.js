// Envoltorio delgado sobre el SDK Web real de Cubo. Portado literalmente
// desde freshtouch-hx02-cubo-lab/src/cubo/webSdkCuboAdapter.js.
//
// CONFIRMADO — obtenido directamente del repositorio oficial de demo de
// Cubo: github.com/Cubo-App/cubo-pos-sdk-web-demo (clonado y leído en el
// trabajo del laboratorio: README.md, demo.html, src/app.js, llms.txt, y
// .claude/skills/cubo-sdk-help/references/*.md). Esto es código de ejemplo
// real y funcional de Cubo, no resúmenes de buscador ni suposiciones. Ver
// freshtouch-hx02-cubo-lab/CUBO-INTEGRATION.md para la procedencia
// completa y cualquier punto todavía abierto.
//
//   - El nombre global de la clase es CuboPagoSDK (window.CuboPagoSDK) —
//     NO "CuboSDK".
//   - Script: <script src="https://sdk.cubopago.com/pos/v1.11.0/cubo-pos-sdk-web.js">
//     (la versión que usa el demo.html real y ejecutable del repo de demo
//     — ver CUBO-INTEGRATION.md sobre por qué esa fuente es más confiable
//     que el README o el skill del propio repo, que están desactualizados
//     entre sí).
//   - Paquete npm: cubo-pos-sdk-web.
//   - Init: new CuboPagoSDK({ apiKey, environment, enableMsi?, msiModal?,
//     hasPrinter? }). apiKey y environment son obligatorios (lanza de
//     forma síncrona si faltan). environment es uno de los strings
//     literales 'SANDBOX' | 'PRODUCTION' — en mayúsculas, a diferencia de
//     la convención en minúsculas ('sandbox'/'production') que ya usa
//     machineConfig en esta app.
//   - Solo funciona con el modelo de terminal Cubo QPOS Cute, vía Web
//     Bluetooth. Requiere un contexto seguro (HTTPS, o http://localhost
//     para desarrollo) y Bluetooth habilitado en el dispositivo.
//   - Navegadores soportados: Chrome 56+ (Escritorio/Android), Edge 79+
//     (Escritorio), Opera 43+ (Escritorio/Android). No Safari, no Firefox
//     — ni en escritorio ni en móvil.
//   - Métodos: connect(): Promise<string> (resuelve con el nombre del
//     dispositivo conectado; requiere un gesto de usuario, es decir debe
//     llamarse desde un manejador de click), disconnect(): void,
//     startPayment(params): Promise<void> (lanza de forma síncrona en
//     errores de validación — no conectado, monto/moneda inválidos; el
//     resultado real llega después vía el evento 'transactionResult'),
//     cancelCurrentTransaction(): boolean (aborta la llamada HTTP en
//     curso — conectado a cancelPayment() de CuboCardProvider),
//     getDeviceInfo(), getPosId(), getInstallments(),
//     getInstallmentCalculation() (solo MSI, sin uso en HX02), on(),
//     off(), removeAllListeners(). Propiedades públicas: isConnected
//     (boolean), device (BluetoothDevice | null).
//   - startPayment({ amount, currencyCode, currencySymbol,
//     monthlyInstallmentId? }): amount es un STRING en centavos (ej.
//     "1250" para Q12.50/$12.50); currencyCode es el código numérico ISO
//     4217 de 4 dígitos como string ("0320" GTQ, "0840" USD, "0484" MXN);
//     currencySymbol es un string de despliegue ("Q", "$");
//     monthlyInstallmentId es solo MSI, sin uso en HX02.
//   - Eventos (ver cuboEvents.js para las listas exhaustivas de nombres):
//     'connected' ({ deviceName }), 'disconnected' (sin payload), 'status'
//     (el payload ES el string de estado mismo — no es un enum cerrado,
//     los flujos de recuperación también emiten mensajes de progreso en
//     español libre), 'loading' (boolean), 'transactionResult' (ver la
//     forma del payload documentada en cuboCardProvider.js — ese es el
//     único lugar donde esa forma se interpreta), 'error' ({ type,
//     message }), 'installmentsLoaded' (solo MSI, sin uso en HX02).
//   - El SDK incluye su propio mecanismo automático de recuperación de
//     pago (idempotency key + sondeo progresivo de estado) para fallas de
//     red ambiguas. No construir una segunda capa de reintento encima —
//     ver el manejo de transactionResult.pending en cuboCardProvider.js.
//
// TODAVÍA SIN VERIFICAR (no encontrado en el repo de demo, no adivinado
// aquí):
//   - La forma exacta de transactionResult.data en un pago exitoso — el
//     repo de demo solo lo describe como "la respuesta completa de la
//     API", sin documentar sus campos.
//   - Cualquier configuración específica de cuenta necesaria en Cubo Admin
//     más allá de generar la API key (ej. registrar el número de serie del
//     QPOS Cute).

import { log, maskSecret } from './logger.js';
import { CUBO_EVENTS, CUBO_STATUS_VALUES, CUBO_ERROR_TYPES } from './cuboEvents.js';

// Re-exportado por conveniencia para que quien use este adaptador no
// necesite un import aparte para saber qué nombres de evento/status/error
// esperar.
export { CUBO_EVENTS, CUBO_STATUS_VALUES, CUBO_ERROR_TYPES };

export function createWebSdkCuboAdapter({ machineConfig, apiKey }) {
  if (typeof window === 'undefined' || !window.CuboPagoSDK) {
    throw new Error(
      'window.CuboPagoSDK no está presente. Carga el <script> oficial del SDK Web de Cubo antes de usar este adaptador (ver index.html y freshtouch-hx02-cubo-lab/CUBO-INTEGRATION.md).'
    );
  }
  if (!apiKey) {
    throw new Error('Falta la API key de Cubo. Nunca debe hardcodearse ni comitearse al repositorio.');
  }

  // machineConfig usa minúsculas ('sandbox'/'production') por convención
  // ya establecida en esta app; el SDK real exige los strings en
  // mayúsculas.
  const environment = (machineConfig.cuboEnvironment || 'sandbox').toUpperCase();

  log(machineConfig.machineId, 'Initializing Cubo Web SDK', {
    environment,
    apiKey: maskSecret(apiKey),
  });

  const sdk = new window.CuboPagoSDK({ apiKey, environment });

  function on(event, handler) {
    sdk.on(event, handler);
    return () => sdk.off?.(event, handler);
  }

  async function connect() {
    log(machineConfig.machineId, 'POS connecting');
    return sdk.connect();
  }

  async function disconnect() {
    log(machineConfig.machineId, 'POS disconnecting');
    return sdk.disconnect();
  }

  async function startPayment({ amount, currencyCode, currencySymbol }) {
    log(machineConfig.machineId, 'Payment started', { amount, currencyCode, currencySymbol });
    return sdk.startPayment({ amount, currencyCode, currencySymbol });
  }

  // cancelCurrentTransaction() aborta la llamada HTTP en curso — método
  // real confirmado, ver el comentario de cabecera. Si además produce un
  // transactionResult/error después sigue sin verificarse; CuboCardProvider
  // no espera eso, transiciona su propio estado local de inmediato.
  function cancelCurrentTransaction() {
    return sdk.cancelCurrentTransaction();
  }

  return {
    connect,
    disconnect,
    startPayment,
    on,
    cancelCurrentTransaction,
    isConnected: () => sdk.isConnected,
  };
}
