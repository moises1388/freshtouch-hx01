#include "WifiRetryPolicy.h"

namespace freshtouch {

WifiRetryPolicy::WifiRetryPolicy(uint32_t maxRetryWindowMs, uint32_t retryIntervalMs)
    : maxRetryWindowMs_(maxRetryWindowMs), retryIntervalMs_(retryIntervalMs) {}

void WifiRetryPolicy::onDisconnected(uint32_t nowMs) {
  if (connected_) {
    // Recién se cae — arranca la ventana de reintento ahora.
    disconnectedAtMs_ = nowMs;
    lastRetryAtMs_ = nowMs;
  }
  connected_ = false;
}

void WifiRetryPolicy::onConnected() {
  connected_ = true;
}

bool WifiRetryPolicy::shouldRetryNow(uint32_t nowMs) const {
  if (connected_) return false;
  return (nowMs - lastRetryAtMs_) >= retryIntervalMs_;
}

void WifiRetryPolicy::markRetryAttempted(uint32_t nowMs) {
  lastRetryAtMs_ = nowMs;
}

WifiConnState WifiRetryPolicy::evaluate(uint32_t nowMs) const {
  if (connected_) return WifiConnState::Connected;
  if ((nowMs - disconnectedAtMs_) >= maxRetryWindowMs_) {
    return WifiConnState::ProvisioningRequired;
  }
  return WifiConnState::RetryWait;
}

}  // namespace freshtouch
