#include "RelayMap.h"
#include "mini_test.h"

using namespace freshtouch;

void runRelayMapTests() {
  // Los 4 GPIO confirmados por el propietario deben quedar exactamente
  // así por defecto — esto es lo más crítico de todo el firmware: si
  // esto cambia sin querer, HX01/HX02/HX03 dejan de funcionar igual.
  RelayMap defaults = RelayMap::withHx01Defaults();
  FT_CHECK_EQ(defaults.gpioFor("puerta"), 25);
  FT_CHECK_EQ(defaults.gpioFor("vapor"), 33);
  FT_CHECK_EQ(defaults.gpioFor("secado"), 32);
  FT_CHECK_EQ(defaults.gpioFor("luzuv"), 18);
  FT_CHECK_EQ(defaults.size(), static_cast<std::size_t>(4));
  FT_CHECK(!defaults.hasDuplicateGpio());

  FT_CHECK_EQ(defaults.gpioFor("noexiste"), -1);
  FT_CHECK(!defaults.has("noexiste"));

  RelayMap map;
  FT_CHECK(map.add("aroma", 4));
  FT_CHECK(map.has("aroma"));
  FT_CHECK(!map.add("aroma", 5));  // ya existe, add() no reemplaza
  FT_CHECK_EQ(map.gpioFor("aroma"), 4);

  FT_CHECK(map.update("aroma", 12));
  FT_CHECK_EQ(map.gpioFor("aroma"), 12);
  FT_CHECK(!map.update("noexiste", 1));

  FT_CHECK(map.remove("aroma"));
  FT_CHECK(!map.has("aroma"));
  FT_CHECK(!map.remove("aroma"));  // ya no existe

  RelayMap dup;
  dup.add("a", 5);
  dup.add("b", 5);
  FT_CHECK(dup.hasDuplicateGpio());

  RelayMap full;
  for (int i = 0; i < static_cast<int>(kMaxRelays); ++i) {
    FT_CHECK(full.add("c" + std::to_string(i), static_cast<uint8_t>(i)));
  }
  FT_CHECK(!full.add("uno-de-mas", 99));  // se llenó

  // Polaridad: default false (active-HIGH) hasta que se confirme físicamente
  // el módulo real de HX02 — ver docs/FIRST-FLASH-HX02.md.
  RelayMap pol;
  pol.add("puerta", 25);
  FT_CHECK_EQ(pol.activeLowFor("puerta"), 0);
  FT_CHECK(pol.updatePolarity("puerta", true));
  FT_CHECK_EQ(pol.activeLowFor("puerta"), 1);
  FT_CHECK_EQ(pol.activeLowFor("no-existe"), -1);
  // update() de GPIO no debe resetear la polaridad ya configurada.
  FT_CHECK(pol.update("puerta", 26));
  FT_CHECK_EQ(pol.gpioFor("puerta"), 26);
  FT_CHECK_EQ(pol.activeLowFor("puerta"), 1);
}
