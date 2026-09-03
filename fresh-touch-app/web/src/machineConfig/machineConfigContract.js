// MachineConfigContract — el esquema que hace que "agregar una máquina
// nueva sea configuración, no código". Ni una API key ni ningún secreto
// vive aquí — eso es responsabilidad exclusiva de nativeBridge (Keystore,
// Fase 6).
//
// Mismos campos ya acordados en la autorización de esta fase, y
// compatibles con el esquema que ya usa machine.config.json en
// freshtouch-hx02-cubo-lab/machines/HX02/ (mismos nombres para
// cuboEnvironment/cuboPosId/cuboPosSerial — no se inventó un esquema
// paralelo distinto).

const REQUIRED_FIELDS = Object.freeze([
  'machineId', 'machineName', 'ownerId', 'tenantId', 'location',
  'esp32Id', 'esp32Address',
  'prices', // { basic: number, premium: number }
  'paymentProvider', // 'cubo' — único valor soportado en producción
  'cuboEnvironment', // 'production' — único valor soportado; NUNCA junto a un secreto en este objeto
  'cuboPosId',
  'cuboPosSerial',
]);

function assertValidMachineConfig(config) {
  const missing = REQUIRED_FIELDS.filter((f) => config?.[f] === undefined);
  if (missing.length > 0) {
    throw new Error(`[MachineConfigContract] Configuración incompleta — faltan campos: ${missing.join(', ')}`);
  }
  if (typeof config.prices?.basic !== 'number' || typeof config.prices?.premium !== 'number') {
    throw new Error('[MachineConfigContract] "prices.basic" y "prices.premium" deben ser números.');
  }
  // Red de seguridad explícita: si alguna vez alguien intenta meter un
  // secreto directo en el objeto de configuración (por error, copiando
  // machine.config.json del lab tal cual, que sí puede llevar
  // cuboApiKey en un secrets.local.json separado), esto debe fallar
  // fuerte, no silenciosamente aceptar el archivo.
  const forbiddenKeys = ['cuboApiKey', 'apiKey', 'secret', 'token', 'password'];
  const found = forbiddenKeys.filter((k) => k in config);
  if (found.length > 0) {
    throw new Error(
      `[MachineConfigContract] Este objeto no debe contener secretos (${found.join(', ')}). ` +
      'Los secretos van exclusivamente en nativeBridge (Android Keystore), nunca en machine config.'
    );
  }
  return true;
}

export { REQUIRED_FIELDS, assertValidMachineConfig };
