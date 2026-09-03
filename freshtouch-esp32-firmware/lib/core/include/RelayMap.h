#pragma once
// RelayMap — el mapa componente lógico -> pin GPIO físico.
//
// GPIOs por defecto: los cuatro que el propietario confirmó como los que
// usa el firmware actual de HX01/HX02/HX03 (puerta=25, vapor=33,
// secado=32, luzuv=18). Se conservan como default, NO hardcodeados en el
// resto del firmware — todo el código que enciende/apaga un relé pasa
// por este mapa, nunca escribe un número de pin literal.
//
// Deliberadamente NO se asume que HX04 (o cualquier máquina futura)
// tendrá los mismos cuatro componentes: el mapa es una lista dinámica de
// pares (nombre, pin), no una struct fija con 4 campos. Así, agregar un
// quinto actuador a una máquina futura es configuración, no un cambio de
// firmware.
//
// Sin dependencias de Arduino — se compila y se prueba igual en el
// entorno nativo (test/native/) y dentro del firmware real.

#include <array>
#include <cstddef>
#include <cstdint>
#include <string>

namespace freshtouch {

struct RelayAssignment {
  std::string component;
  uint8_t gpio;
  // Polaridad del módulo de relés — MUCHOS módulos de 4 canales baratos
  // (como el que se ve en la foto de HX02, con entradas S1-S4) son
  // "active-LOW": el relé se energiza con la señal en LOW, no en HIGH.
  // No se puede saber cuál es sin probarlo físicamente — ver
  // docs/FIRST-FLASH-HX02.md, paso de verificación de polaridad, ANTES
  // de confiar en esto para vapor/secado/puerta/UV. Default = false
  // (active-HIGH) por ser la convención más simple, NO porque se haya
  // confirmado que así es el módulo real de HX02.
  bool activeLow = false;
};

constexpr uint8_t kDefaultGpioPuerta = 25;
constexpr uint8_t kDefaultGpioVapor = 33;
constexpr uint8_t kDefaultGpioSecado = 32;
constexpr uint8_t kDefaultGpioLuzUv = 18;

// Margen para máquinas futuras con más actuadores que HX01 — no es un
// límite del protocolo, solo del tamaño fijo de este arreglo en memoria.
constexpr std::size_t kMaxRelays = 8;

class RelayMap {
 public:
  RelayMap() = default;

  // false si "component" ya existe (usar update() para eso) o si ya se
  // alcanzó kMaxRelays.
  bool add(const std::string& component, uint8_t gpio, bool activeLow = false);

  // Reemplaza el pin de un componente ya existente, SIN tocar su
  // polaridad actual; false si no existe.
  bool update(const std::string& component, uint8_t gpio);

  // Cambia solo la polaridad de un componente ya existente; false si no
  // existe.
  bool updatePolarity(const std::string& component, bool activeLow);

  // -1 si el componente no está mapeado; 0/1 en vez de bool para poder
  // distinguir "no existe" con el mismo patrón que gpioFor().
  int activeLowFor(const std::string& component) const;

  bool remove(const std::string& component);

  // -1 si el componente no está mapeado.
  int gpioFor(const std::string& component) const;

  bool has(const std::string& component) const;

  std::size_t size() const { return count_; }

  const RelayAssignment& at(std::size_t index) const;

  // Ningún GPIO puede repetirse entre dos componentes distintos — evita
  // una configuración que, por error, controle dos actuadores con el
  // mismo pin sin darse cuenta.
  bool hasDuplicateGpio() const;

  static RelayMap withHx01Defaults();

 private:
  std::array<RelayAssignment, kMaxRelays> assignments_{};
  std::size_t count_ = 0;

  int indexOf(const std::string& component) const;
};

}  // namespace freshtouch
