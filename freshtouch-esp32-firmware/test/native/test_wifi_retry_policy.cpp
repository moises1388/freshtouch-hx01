#include "WifiRetryPolicy.h"
#include "mini_test.h"

using namespace freshtouch;

void runWifiRetryPolicyTests() {
  WifiRetryPolicy policy(/*maxRetryWindowMs=*/10000, /*retryIntervalMs=*/2000);

  // Arranca conectado (optimista) hasta el primer onDisconnected().
  FT_CHECK(policy.evaluate(0) == WifiConnState::Connected);

  policy.onDisconnected(1000);
  FT_CHECK(policy.evaluate(1000) == WifiConnState::RetryWait);
  FT_CHECK(!policy.shouldRetryNow(1500));  // todavía no pasó retryIntervalMs
  FT_CHECK(policy.shouldRetryNow(3100));   // 1000 + 2000 = 3000, ya pasó

  policy.markRetryAttempted(3100);
  FT_CHECK(!policy.shouldRetryNow(4000));
  FT_CHECK(policy.shouldRetryNow(5200));

  // Todavía dentro de la ventana de 10s desde que se cayó (1000..11000).
  FT_CHECK(policy.evaluate(9000) == WifiConnState::RetryWait);
  // Se agota la ventana -> hay que volver a modo provisioning.
  FT_CHECK(policy.evaluate(11500) == WifiConnState::ProvisioningRequired);

  // Reconectar limpia todo.
  policy.onConnected();
  FT_CHECK(policy.evaluate(20000) == WifiConnState::Connected);

  // Una nueva caída arranca una ventana nueva desde ese momento, no
  // arrastra el tiempo de la caída anterior.
  policy.onDisconnected(20000);
  FT_CHECK(policy.evaluate(20000 + 9999) == WifiConnState::RetryWait);
  FT_CHECK(policy.evaluate(20000 + 10001) == WifiConnState::ProvisioningRequired);
}
