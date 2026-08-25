#include "mini_test.h"

void runSha256Tests();
void runRelayMapTests();
void runWifiRetryPolicyTests();
void runQueryParserTests();
void runAdminAuthTests();
void runMachineConfigTests();
void runStatusSnapshotTests();
void runRelayCommandTests();

int main() {
  runSha256Tests();
  runRelayMapTests();
  runWifiRetryPolicyTests();
  runQueryParserTests();
  runAdminAuthTests();
  runMachineConfigTests();
  runStatusSnapshotTests();
  runRelayCommandTests();

  std::cout << (g_testsRun - g_testsFailed) << "/" << g_testsRun << " checks OK\n";
  if (g_testsFailed > 0) {
    std::cout << g_testsFailed << " FAILED\n";
    return 1;
  }
  return 0;
}
