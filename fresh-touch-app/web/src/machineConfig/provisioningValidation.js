// Validación de la pantalla de Provisioning — capa "amigable" que corre
// ANTES de llegar a MachineConfigStore.save(). MachineConfigContract
// (assertValidMachineConfig) sigue siendo el guardián final y ya rechaza
// campos faltantes/secretos colados; esto agrega mensajes por campo y
// reglas de formato razonables para impedir guardar algo "obviamente
// inválido" (precio negativo, environment desconocido, etc.).
//
// Deliberadamente NO valida formatos específicos de Cubo (patrón real de
// POS ID/Serial) — eso no está confirmado con Cubo todavía. Cuando
// paymentProvider es 'cubo' solo exige que POS ID/Serial no estén vacíos.

const PAYMENT_PROVIDERS = Object.freeze(['mock', 'cubo']);
const CUBO_ENVIRONMENTS = Object.freeze(['sandbox', 'production']);
const MACHINE_ID_PATTERN = /^[A-Za-z0-9_-]{2,32}$/;
const ESP32_ADDRESS_PATTERN = /^[A-Za-z0-9.-]+$/;

function isBlank(value) {
  return value === undefined || value === null || String(value).trim().length === 0;
}

function validateDraft(draft) {
  const errors = {};

  if (isBlank(draft?.machineId) || !MACHINE_ID_PATTERN.test(draft.machineId.trim())) {
    errors.machineId = 'Requerido. Solo letras, números, "-" y "_", entre 2 y 32 caracteres.';
  }
  if (isBlank(draft?.machineName)) errors.machineName = 'Requerido.';
  if (isBlank(draft?.ownerId)) errors.ownerId = 'Requerido.';
  if (isBlank(draft?.tenantId)) errors.tenantId = 'Requerido.';
  if (isBlank(draft?.location)) errors.location = 'Requerido.';

  if (isBlank(draft?.esp32Id)) errors.esp32Id = 'Requerido.';
  if (isBlank(draft?.esp32Address) || !ESP32_ADDRESS_PATTERN.test(draft.esp32Address.trim())) {
    errors.esp32Address = 'Requerido. Debe ser una IP (ej. 192.168.1.20) o nombre de host válido.';
  }

  const basic = Number(draft?.prices?.basic);
  if (!Number.isFinite(basic) || basic <= 0) {
    errors['prices.basic'] = 'Debe ser un número mayor que 0.';
  }
  const premium = Number(draft?.prices?.premium);
  if (!Number.isFinite(premium) || premium <= 0) {
    errors['prices.premium'] = 'Debe ser un número mayor que 0.';
  }

  if (!PAYMENT_PROVIDERS.includes(draft?.paymentProvider)) {
    errors.paymentProvider = `Debe ser uno de: ${PAYMENT_PROVIDERS.join(', ')}.`;
  }
  if (!CUBO_ENVIRONMENTS.includes(draft?.cuboEnvironment)) {
    errors.cuboEnvironment = `Debe ser uno de: ${CUBO_ENVIRONMENTS.join(', ')}.`;
  }

  if (draft?.paymentProvider === 'cubo') {
    if (isBlank(draft?.cuboPosId)) errors.cuboPosId = 'Requerido cuando el proveedor de pago es Cubo.';
    if (isBlank(draft?.cuboPosSerial)) errors.cuboPosSerial = 'Requerido cuando el proveedor de pago es Cubo.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export { validateDraft, PAYMENT_PROVIDERS, CUBO_ENVIRONMENTS };
