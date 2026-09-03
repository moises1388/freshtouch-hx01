#include "MachineConfig.h"
#include "mini_test.h"

using namespace freshtouch;

void runMachineConfigTests() {
  MachineConfig cfg;
  cfg.machineId = "HX02";
  cfg.wifi.ssid = "MiRed";
  cfg.wifi.password = "algo";
  cfg.network.mode = NetworkMode::Dhcp;
  // cfg.relays ya trae los defaults de HX01 por el inicializador de la struct.

  auto ok = validateForNormalOperation(cfg);
  FT_CHECK(ok.valid);

  MachineConfig sinWifi = cfg;
  sinWifi.wifi.ssid = "";
  FT_CHECK(!validateForNormalOperation(sinWifi).valid);

  MachineConfig sinId = cfg;
  sinId.machineId = "";
  FT_CHECK(!validateForNormalOperation(sinId).valid);

  MachineConfig staticaIncompleta = cfg;
  staticaIncompleta.network.mode = NetworkMode::Static;
  staticaIncompleta.network.staticIp = "192.168.1.50";
  // gateway/subnet vacíos -> inválida
  FT_CHECK(!validateForNormalOperation(staticaIncompleta).valid);

  MachineConfig staticaCompleta = cfg;
  staticaCompleta.network.mode = NetworkMode::Static;
  staticaCompleta.network.staticIp = "192.168.1.50";
  staticaCompleta.network.gateway = "192.168.1.1";
  staticaCompleta.network.subnet = "255.255.255.0";
  FT_CHECK(validateForNormalOperation(staticaCompleta).valid);

  FT_CHECK(isValidIPv4("192.168.1.1"));
  FT_CHECK(isValidIPv4("0.0.0.0"));
  FT_CHECK(isValidIPv4("255.255.255.255"));
  FT_CHECK(!isValidIPv4("256.1.1.1"));
  FT_CHECK(!isValidIPv4("192.168.1"));
  FT_CHECK(!isValidIPv4("192.168.1.1.1"));
  FT_CHECK(!isValidIPv4("abc.def.ghi.jkl"));
  FT_CHECK(!isValidIPv4(""));

  MachineConfig dupGpio = cfg;
  dupGpio.relays.update("secado", dupGpio.relays.gpioFor("vapor"));
  FT_CHECK(!validateForNormalOperation(dupGpio).valid);
}
