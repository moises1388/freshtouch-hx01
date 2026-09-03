import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');

function listJsFiles(root, exclude = []) {
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.js$/.test(entry.name)) files.push(full);
    }
  })(root);
  return files.filter((f) => !exclude.includes(path.resolve(f)));
}

test('ningún archivo de web/ hace referencia a identificadores operativos de HX01, del lab de Cubo, o de FreshTouch CORE', () => {
  // Mismos términos "propios y únicos" ya usados en las pruebas de
  // aislamiento de freshtouch-core y del lab de HX02 — no se inventa un
  // criterio nuevo.
  const forbidden = [
    // HX01
    'esp32Ip', 'relayVapor', 'relaySec', 'relayUV', 'relayPuerta',
    'makeCuboWebhook', 'makePollWebhook', 'makeVentasWebhook',
    'api-payment-a.cubopago.com', 'pinSA', 'pinOwner', 'pinTech', 'pinTenant',
    // lab de Cubo / HX02 — identificadores de código real, no nombres de
    // archivo (esos sí es legítimo mencionarlos en comentarios para
    // explicar la separación, como ya se hace en varios archivos de esta
    // fase — lo que este chequeo busca es acoplamiento real, no prosa).
    //
    // NOTA: 'CuboPagoSDK' y 'sdk.cubopago.com' se sacaron de esta lista a
    // partir de la integración real del PaymentProvider de Cubo (payment/
    // cubo/webSdkCuboAdapter.js, e index.html) — antes de esa fase estaban
    // prohibidos porque cualquier mención era acoplamiento accidental con
    // el lab; ahora son exactamente el SDK real que esta fase autorizó
    // integrar, portado (no copiado a ciegas) desde el lab ya validado con
    // hardware real. 'api-payment-sandbox.cubopago.com' sigue prohibido:
    // ese es un endpoint REST distinto que este proyecto nunca ha
    // necesitado referenciar directamente (ver CUBO-INTEGRATION.md del lab).
    'api-payment-sandbox.cubopago.com',
    // FreshTouch CORE
    'authorized_user_machine', 'AuditEvent', 'assertExpectedEnvironment',
  ];
  const selfPath = path.resolve(__dirname, 'isolation.test.js');
  const files = listJsFiles(WEB_ROOT, [selfPath]);
  assert.ok(files.length > 0, 'no se encontraron archivos .js para escanear');

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const term of forbidden) {
      assert.ok(
        !content.includes(term),
        `${path.relative(WEB_ROOT, file)} hace referencia a "${term}" — fresh-touch-app/web debe ser independiente de HX01, del lab de Cubo, y de FreshTouch CORE`
      );
    }
  }
});

test('ningún archivo de web/src importa algo fuera de fresh-touch-app/', () => {
  const files = listJsFiles(path.join(WEB_ROOT, 'src'));
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const imports = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const imp of imports) {
      if (imp.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), imp);
        assert.ok(
          resolved.startsWith(WEB_ROOT),
          `${path.relative(WEB_ROOT, file)} importa "${imp}", que resuelve fuera de fresh-touch-app/web/`
        );
      }
    }
  }
});

test('capas: ui/ no importa directamente payment/, esp32/, ni nativeBridge/ (solo a través de operationState o del propio main.js)', () => {
  const uiFiles = listJsFiles(path.join(WEB_ROOT, 'src', 'ui'));
  const forbiddenImportSubstrings = ['/payment/', '/esp32/', '/nativeBridge/'];
  for (const file of uiFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const term of forbiddenImportSubstrings) {
      assert.ok(
        !content.includes(term),
        `${path.relative(WEB_ROOT, file)} (capa ui/) no debe importar directamente de "${term}" — la separación pedida en esta fase es real, no solo de carpetas`
      );
    }
  }
});

test('payment/ nunca importa nada de esp32/ — el enlace PAYMENT_SUCCESS -> ESP32 permanece desconectado en esta fase', () => {
  // Arquitectura exigida en la autorización de integración de Cubo real:
  // PaymentProvider y ESP32 son dos ramas separadas que cuelgan de
  // operationState, ninguna llama a la otra. requestCycle() en
  // cuboCardProvider.js consume la autorización localmente y nunca debe
  // volver a importar esp32/ — si algún día lo hace, este chequeo debe
  // fallar y forzar una decisión explícita, no dejarlo colarse.
  const paymentFiles = listJsFiles(path.join(WEB_ROOT, 'src', 'payment'));
  for (const file of paymentFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('/esp32/'),
      `${path.relative(WEB_ROOT, file)} (capa payment/) no debe importar de "/esp32/" — ese enlace queda bloqueado hasta la prueba física del firmware v3`
    );
  }
});

test('esp32/ nunca importa nada de payment/ — el transporte real (Etapa 1) no sabe nada de Cubo', () => {
  const esp32Files = listJsFiles(path.join(WEB_ROOT, 'src', 'esp32'));
  for (const file of esp32Files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('/payment/'),
      `${path.relative(WEB_ROOT, file)} (capa esp32/) no debe importar de "/payment/" — esp32HttpClient.js y realEsp32Adapter.js son transporte puro, sin conocer Cubo`
    );
  }
});
