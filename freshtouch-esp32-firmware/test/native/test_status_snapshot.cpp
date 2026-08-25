#include "StatusSnapshot.h"
#include "mini_test.h"

using namespace freshtouch;

void runStatusSnapshotTests() {
  StatusSnapshot s;
  s.machineId = "HX02";
  s.ip = "192.168.1.50";
  s.rssi = -55;
  s.uptimeSeconds = 3661;
  s.firmwareVersion = "3.0.0";
  s.totalCycles = 42;
  s.wifiConnected = true;
  s.relays.push_back({"vapor", 33, false});
  s.relays.push_back({"puerta", 25, true});

  std::string json = buildStatusJson(s);

  FT_CHECK(json.find("\"machineId\":\"HX02\"") != std::string::npos);
  FT_CHECK(json.find("\"ip\":\"192.168.1.50\"") != std::string::npos);
  FT_CHECK(json.find("\"rssi\":-55") != std::string::npos);
  FT_CHECK(json.find("\"uptimeSeconds\":3661") != std::string::npos);
  FT_CHECK(json.find("\"firmwareVersion\":\"3.0.0\"") != std::string::npos);
  FT_CHECK(json.find("\"totalCycles\":42") != std::string::npos);
  FT_CHECK(json.find("\"wifiConnected\":true") != std::string::npos);
  FT_CHECK(json.find("\"component\":\"vapor\"") != std::string::npos);
  FT_CHECK(json.find("\"gpio\":33") != std::string::npos);
  FT_CHECK(json.find("\"on\":false") != std::string::npos);
  FT_CHECK(json.find("\"on\":true") != std::string::npos);

  // JSON balanceado (chequeo mínimo, no un parser completo).
  int braces = 0;
  for (char c : json) {
    if (c == '{') ++braces;
    if (c == '}') --braces;
  }
  FT_CHECK_EQ(braces, 0);

  StatusSnapshot empty;
  std::string emptyJson = buildStatusJson(empty);
  FT_CHECK(emptyJson.find("\"relays\":[]") != std::string::npos);
}
