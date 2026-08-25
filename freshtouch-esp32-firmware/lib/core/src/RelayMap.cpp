#include "RelayMap.h"

namespace freshtouch {

int RelayMap::indexOf(const std::string& component) const {
  for (std::size_t i = 0; i < count_; ++i) {
    if (assignments_[i].component == component) return static_cast<int>(i);
  }
  return -1;
}

bool RelayMap::add(const std::string& component, uint8_t gpio, bool activeLow) {
  if (indexOf(component) >= 0) return false;
  if (count_ >= kMaxRelays) return false;
  assignments_[count_] = RelayAssignment{component, gpio, activeLow};
  ++count_;
  return true;
}

bool RelayMap::update(const std::string& component, uint8_t gpio) {
  int idx = indexOf(component);
  if (idx < 0) return false;
  assignments_[static_cast<std::size_t>(idx)].gpio = gpio;
  return true;
}

bool RelayMap::updatePolarity(const std::string& component, bool activeLow) {
  int idx = indexOf(component);
  if (idx < 0) return false;
  assignments_[static_cast<std::size_t>(idx)].activeLow = activeLow;
  return true;
}

int RelayMap::activeLowFor(const std::string& component) const {
  int idx = indexOf(component);
  if (idx < 0) return -1;
  return assignments_[static_cast<std::size_t>(idx)].activeLow ? 1 : 0;
}

bool RelayMap::remove(const std::string& component) {
  int idx = indexOf(component);
  if (idx < 0) return false;
  for (std::size_t i = static_cast<std::size_t>(idx); i + 1 < count_; ++i) {
    assignments_[i] = assignments_[i + 1];
  }
  --count_;
  return true;
}

int RelayMap::gpioFor(const std::string& component) const {
  int idx = indexOf(component);
  if (idx < 0) return -1;
  return assignments_[static_cast<std::size_t>(idx)].gpio;
}

bool RelayMap::has(const std::string& component) const {
  return indexOf(component) >= 0;
}

const RelayAssignment& RelayMap::at(std::size_t index) const {
  return assignments_[index];
}

bool RelayMap::hasDuplicateGpio() const {
  for (std::size_t i = 0; i < count_; ++i) {
    for (std::size_t j = i + 1; j < count_; ++j) {
      if (assignments_[i].gpio == assignments_[j].gpio) return true;
    }
  }
  return false;
}

RelayMap RelayMap::withHx01Defaults() {
  RelayMap map;
  map.add("puerta", kDefaultGpioPuerta);
  map.add("vapor", kDefaultGpioVapor);
  map.add("secado", kDefaultGpioSecado);
  map.add("luzuv", kDefaultGpioLuzUv);
  return map;
}

}  // namespace freshtouch
