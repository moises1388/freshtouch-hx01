import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');

function listJsFiles(root) {
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.js$/.test(entry.name)) files.push(full);
    }
  })(root);
  return files;
}

test('el formulario de provisioning no existe como marcado estático en index.html — solo se genera desde JS tras autenticación de admin', () => {
  const html = fs.readFileSync(path.join(WEB_ROOT, 'index.html'), 'utf8');
  assert.ok(
    !html.includes('prov-machineId') && !html.includes('Provisioning'),
    'index.html no debe contener marcado de provisioning: eso probaría que puede aparecer sin pasar por el PIN de admin'
  );
});

test('#adm-body arranca vacío en index.html — el panel de admin (y provisioning dentro de él) solo se llena vía renderAdminBody(), nunca por defecto', () => {
  const html = fs.readFileSync(path.join(WEB_ROOT, 'index.html'), 'utf8');
  const match = html.match(/<div class="adm-body" id="adm-body">([\s\S]*?)<\/div>/);
  assert.ok(match, 'no se encontró el contenedor #adm-body en index.html');
  assert.equal(match[1].trim(), '', '#adm-body debe estar vacío en el HTML fuente');
});

test('ningún archivo de src/ fuera de machineConfigStore.js accede a localStorage directamente — la UI y el resto de la app deben pasar por MachineConfigStore', () => {
  const storePath = path.resolve(WEB_ROOT, 'src', 'machineConfig', 'machineConfigStore.js');
  const files = listJsFiles(path.join(WEB_ROOT, 'src')).filter((f) => f !== storePath);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('localStorage'),
      `${path.relative(WEB_ROOT, file)} referencia "localStorage" directamente — la persistencia debe quedar encapsulada detrás de machineConfigStore.js`
    );
  }
});

test('las funciones de provisioning solo se exponen a través de los globals __fta* del panel de admin, no como onclick directo en pantallas de cliente', () => {
  const html = fs.readFileSync(path.join(WEB_ROOT, 'index.html'), 'utf8');
  const clientOnclicks = [...html.matchAll(/onclick="([^"]*)"/g)].map((m) => m[1]);
  for (const handler of clientOnclicks) {
    assert.ok(
      !handler.includes('SaveProvisioning') && !handler.includes('RestoreProvisioning') && !handler.includes('SimSetSecret') && !handler.includes('SimClearSecret'),
      `index.html invoca "${handler}" directamente — las acciones de provisioning solo deben dispararse desde dentro del panel de admin ya autenticado`
    );
  }
});
