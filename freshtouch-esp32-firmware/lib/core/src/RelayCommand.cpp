#include "RelayCommand.h"

namespace freshtouch {

RelayCommandResult handleRelayCommand(const std::map<std::string, std::string>& queryParams,
                                       const RelayMap& relays) {
  RelayCommandResult result;

  auto compIt = queryParams.find("comp");
  auto stateIt = queryParams.find("state");

  if (compIt == queryParams.end() || stateIt == queryParams.end()) {
    result.httpStatus = 400;
    result.body = "missing comp or state";
    return result;
  }

  const std::string& comp = compIt->second;
  const std::string& stateStr = stateIt->second;

  if (!relays.has(comp)) {
    result.httpStatus = 404;
    result.body = "unknown component: " + comp;
    return result;
  }

  if (stateStr != "0" && stateStr != "1") {
    result.httpStatus = 400;
    result.body = "state must be 0 or 1";
    return result;
  }

  result.httpStatus = 200;
  result.applied = true;
  result.component = comp;
  result.state = (stateStr == "1");
  result.body = "ok";
  return result;
}

}  // namespace freshtouch
