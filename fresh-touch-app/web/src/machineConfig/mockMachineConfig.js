// ⚠️ MOCK / NOT PRODUCTION ⚠️
//
// Fase 2 reemplaza esto por carga real (provisioning local, o lectura de
// lo que el componente nativo tenga guardado). Por ahora es un objeto
// fijo en memoria, con forma HX02, para poder probar la UI end-to-end.

const MOCK_HX02_CONFIG = Object.freeze({
  machineId: 'HX02',
  machineName: 'FreshTouch HX02',
  ownerId: 'MOCK-OWNER-HX02',
  tenantId: 'MOCK-TENANT-HX02',
  location: 'MOCK — pendiente de confirmar con el propietario',
  esp32Id: 'MOCK-ESP32-HX02',
  esp32Address: '0.0.0.0', // MOCK — nunca se usa para conectar nada real en Fase 1
  prices: { basic: 20, premium: 35 },
  paymentProvider: 'mock',
  cuboEnvironment: 'sandbox',
  cuboPosId: 'MOCK-POS-ID',
  cuboPosSerial: 'MOCK-POS-SERIAL',
});

function loadMockMachineConfig() {
  return { ...MOCK_HX02_CONFIG };
}

export { loadMockMachineConfig, MOCK_HX02_CONFIG };
