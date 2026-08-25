#pragma once
// NvsConfigStore — el ÚNICO archivo que sabe que MachineConfig se
// guarda en NVS (Preferences). El resto del firmware trabaja siempre
// con la struct MachineConfig (lib/core/) — si mañana se cambia el
// backend de persistencia, este es el único archivo que cambia.
//
// ⚠️ NO COMPILADO EN ESTE ENTORNO ⚠️ — depende de Preferences.h del
// núcleo Arduino-ESP32, que solo existe al compilar para la placa real.
// Ver el informe de esta fase: el registro de paquetes de PlatformIO/
// Arduino está bloqueado por política de red desde este sandbox. Antes
// de cargar esto a un ESP32, correr `pio run` (o el IDE de Arduino) y
// confirmar que compila limpio — ese es el primer paso de
// docs/FIRST-FLASH-HX02.md, no un detalle opcional.

#include <Preferences.h>

#include "MachineConfig.h"

namespace freshtouch {

class NvsConfigStore {
 public:
  // Debe llamarse una sola vez en setup(), antes de cualquier otra
  // operación.
  void begin();
  void end();

  // Si no hay nada guardado todavía (primer arranque, o tras un reset de
  // fábrica), devuelve una MachineConfig con los defaults de HX01 para
  // relés, machineId/wifi vacíos, y admin sin configurar — exactamente
  // lo que hasWifiCredentials()==false necesita para que main.cpp decida
  // entrar a modo provisioning.
  MachineConfig load();

  void save(const MachineConfig& cfg);

  // Solo el contador — se llama en cada /cycle-done, sin reescribir el
  // resto de la configuración innecesariamente.
  void incrementAndSaveTotalCycles(uint32_t& outNewValue);

  // Borra TODA la configuración guardada (Wi-Fi, machineId, admin,
  // mapa de relés vuelve a los defaults) — usado por el reset de
  // fábrica desde /admin. Nunca se llama automáticamente.
  void factoryReset();

 private:
  Preferences prefs_;
};

}  // namespace freshtouch
