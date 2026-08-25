#include "RelayCommand.h"
#include "mini_test.h"

using namespace freshtouch;

void runRelayCommandTests() {
  RelayMap relays = RelayMap::withHx01Defaults();

  // Compatibilidad exacta: GET /relay?comp=vapor&state=1 debe seguir
  // aceptándose tal cual — este es el endpoint que NO se puede romper.
  {
    auto r = handleRelayCommand({{"comp", "vapor"}, {"state", "1"}}, relays);
    FT_CHECK_EQ(r.httpStatus, 200);
    FT_CHECK(r.applied);
    FT_CHECK_EQ(r.component, std::string("vapor"));
    FT_CHECK_EQ(r.state, true);
  }
  {
    auto r = handleRelayCommand({{"comp", "puerta"}, {"state", "0"}}, relays);
    FT_CHECK_EQ(r.httpStatus, 200);
    FT_CHECK(r.applied);
    FT_CHECK_EQ(r.state, false);
  }

  // Componente desconocido -> rechazado, nunca se aplica un GPIO al azar.
  {
    auto r = handleRelayCommand({{"comp", "no-existe"}, {"state", "1"}}, relays);
    FT_CHECK_EQ(r.httpStatus, 404);
    FT_CHECK(!r.applied);
  }

  // state fuera de {0,1} -> rechazado (ni "true", ni "2", ni vacío).
  for (const std::string badState : {"true", "2", "", "on"}) {
    auto r = handleRelayCommand({{"comp", "vapor"}, {"state", badState}}, relays);
    FT_CHECK_EQ(r.httpStatus, 400);
    FT_CHECK(!r.applied);
  }

  // Falta un parámetro -> rechazado.
  {
    auto r = handleRelayCommand({{"comp", "vapor"}}, relays);
    FT_CHECK_EQ(r.httpStatus, 400);
    FT_CHECK(!r.applied);
  }
  {
    auto r = handleRelayCommand({{"state", "1"}}, relays);
    FT_CHECK_EQ(r.httpStatus, 400);
    FT_CHECK(!r.applied);
  }

  // Con un mapa de relés distinto (ej. una HX04 con "aroma" agregado),
  // el mismo código sigue funcionando sin cambios.
  RelayMap custom = RelayMap::withHx01Defaults();
  custom.add("aroma", 14);
  auto r = handleRelayCommand({{"comp", "aroma"}, {"state", "1"}}, custom);
  FT_CHECK_EQ(r.httpStatus, 200);
  FT_CHECK(r.applied);
}
