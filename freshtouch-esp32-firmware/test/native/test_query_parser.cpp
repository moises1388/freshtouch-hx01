#include "QueryParser.h"
#include "mini_test.h"

using namespace freshtouch;

void runQueryParserTests() {
  auto q1 = parseQueryString("comp=vapor&state=1");
  FT_CHECK_EQ(q1.size(), static_cast<std::size_t>(2));
  FT_CHECK_EQ(q1["comp"], std::string("vapor"));
  FT_CHECK_EQ(q1["state"], std::string("1"));

  auto q2 = parseQueryString("");
  FT_CHECK_EQ(q2.size(), static_cast<std::size_t>(0));

  auto q3 = parseQueryString("tipo=basic");
  FT_CHECK_EQ(q3["tipo"], std::string("basic"));

  auto q4 = parseQueryString("flag");
  FT_CHECK_EQ(q4["flag"], std::string(""));

  // Un SSID con espacios y símbolos, tal como llegaría desde el
  // formulario de provisioning.
  auto q5 = parseQueryString("ssid=Mi+Red+Wifi&pass=abc%40123");
  FT_CHECK_EQ(q5["ssid"], std::string("Mi Red Wifi"));
  FT_CHECK_EQ(q5["pass"], std::string("abc@123"));
}
