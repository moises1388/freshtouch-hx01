#!/usr/bin/env node
// ⚠️ HERRAMIENTA DE DIAGNÓSTICO — NO ES PARTE DEL BUNDLE DE PRODUCCIÓN ⚠️
//
// Se ejecuta manualmente con Node desde una terminal, apuntando a un
// ESP32 v3 real en la misma red local. Nunca se referencia desde
// index.html ni desde src/main.js — no se carga en el navegador del
// cliente, no aparece en la UI de la app, y nadie puede dispararlo por
// accidente desde la pantalla de un cliente. Reutiliza exactamente el
// mismo realEsp32Adapter.js que usará main.js en modo 'real', para que
// esta prueba valide el código real y no una implementación paralela.
//
// Prueba, en orden y SIEMPRE un relé a la vez (nunca dos simultáneos):
//   1. GET /status (vía connect())
//   2. puerta  ON -> pausa -> OFF -> pausa
//   3. vapor   ON -> pausa -> OFF -> pausa
//   4. secado  ON -> pausa -> OFF -> pausa
//   5. luzuv   ON -> pausa -> OFF -> pausa
// Si el paso 1 falla, el script se detiene ahí — no tiene sentido
// accionar relés en un ESP32 que no confirmó estar disponible.
//
// Uso:
//   node scripts/esp32-smoke-test.js --address 192.168.1.20
//   ESP32_SMOKE_ADDRESS=192.168.1.20 node scripts/esp32-smoke-test.js
//
// No se asume ninguna IP por defecto — sin dirección explícita, el
// script se niega a arrancar.

import { createRealEsp32Adapter } from '../src/esp32/realEsp32Adapter.js';

const PULSE_MS = 1500; // tiempo que cada relé queda ON para poder observarlo físicamente
const PAUSE_MS = 800;  // pausa entre pasos, para que quien observa tenga tiempo de anotar

const RELAY_SEQUENCE = ['puerta', 'vapor', 'secado', 'luzuv'];

function parseAddress(argv, env) {
  const flagIdx = argv.findIndex((a) => a === '--address' || a === '-a');
  if (flagIdx !== -1 && argv[flagIdx + 1]) return argv[flagIdx + 1];
  const eqArg = argv.find((a) => a.startsWith('--address='));
  if (eqArg) return eqArg.split('=')[1];
  if (env.ESP32_SMOKE_ADDRESS) return env.ESP32_SMOKE_ADDRESS;
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${detail ? ' — ' + detail : ''}`);
}

async function testRelay(adapter, component) {
  try {
    await adapter.setRelay(component, true);
    record(`${component} ON`, true, `esperar ${PULSE_MS}ms y observar físicamente el relé/actuador`);
  } catch (err) {
    record(`${component} ON`, false, err.message);
    return; // no intentar apagar algo que no confirmó haberse encendido
  }
  await sleep(PULSE_MS);
  try {
    await adapter.setRelay(component, false);
    record(`${component} OFF`, true);
  } catch (err) {
    record(`${component} OFF`, false, err.message);
  }
  await sleep(PAUSE_MS);
}

async function main() {
  const address = parseAddress(process.argv.slice(2), process.env);
  if (!address) {
    console.error('Falta la dirección del ESP32. Uso: node scripts/esp32-smoke-test.js --address <ip>');
    process.exitCode = 1;
    return;
  }

  console.log(`=== FreshTouch ESP32 v3 — smoke test de transporte real ===`);
  console.log(`Dirección: ${address}\n`);

  const adapter = createRealEsp32Adapter({
    machineConfig: { esp32Id: 'SMOKE-TEST', esp32Address: address },
  });

  console.log('--- Paso 1: GET /status (connect) ---');
  let status;
  try {
    const res = await adapter.connect();
    status = res.status;
    record('GET /status', true);
    console.log('  machineId:      ', status.machineId);
    console.log('  ip:             ', status.ip);
    console.log('  rssi:           ', status.rssi);
    console.log('  uptimeSeconds:  ', status.uptimeSeconds);
    console.log('  firmwareVersion:', status.firmwareVersion);
    console.log('  totalCycles:    ', status.totalCycles);
    console.log('  wifiConnected:  ', status.wifiConnected);
    console.log('  relays:         ', JSON.stringify(status.relays));
  } catch (err) {
    record('GET /status', false, err.message);
    console.error('\nNo se pudo confirmar /status — se detiene la prueba sin tocar relés.');
    printSummary();
    process.exitCode = 1;
    return;
  }

  console.log('\n--- Paso 2: relés, uno a la vez (nunca dos simultáneos) ---');
  for (const component of RELAY_SEQUENCE) {
    console.log(`\n> ${component}`);
    await testRelay(adapter, component);
  }

  printSummary();
}

function printSummary() {
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;
  console.log('\n=== Resumen ===');
  for (const r of results) console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
  console.log(`\n${passCount} PASS / ${failCount} FAIL / ${results.length} total`);
  if (failCount > 0) process.exitCode = 1;
}

main();
