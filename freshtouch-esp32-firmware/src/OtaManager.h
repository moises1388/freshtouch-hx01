#pragma once
// OtaManager — punto de enganche preparado, deliberadamente SIN
// implementar. La autorización pide explícitamente: "Preparar soporte
// para actualización OTA de firmware, pero NO hacerlo destructivo ni
// implementarlo de manera insegura. Primero crear la arquitectura y
// documentarla." — eso es lo que esto es: el lugar donde OTA se
// conectará a main.cpp el día que se implemente, sin tener que tocar el
// flujo principal otra vez. Ver docs/OTA-ARCHITECTURE.md para el diseño
// completo (firma de binarios, particiones A/B, rollback automático).
//
// begin() no hace nada. Intencional.

namespace freshtouch {

class OtaManager {
 public:
  void begin() {
    // Intencionalmente vacío — ver docs/OTA-ARCHITECTURE.md.
  }

  void tick() {
    // Intencionalmente vacío.
  }
};

}  // namespace freshtouch
