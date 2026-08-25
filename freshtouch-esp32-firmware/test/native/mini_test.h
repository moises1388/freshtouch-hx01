#pragma once
// Arnés de pruebas mínimo, sin dependencias externas (nada que
// descargar) — suficiente para lo que hay que probar aquí. Cada archivo
// test_*.cpp expone una función runXxxTests() que el runner llama.

#include <iostream>
#include <string>

inline int g_testsRun = 0;
inline int g_testsFailed = 0;

#define FT_CHECK(cond)                                                                 \
  do {                                                                                  \
    ++g_testsRun;                                                                       \
    if (!(cond)) {                                                                      \
      ++g_testsFailed;                                                                  \
      std::cerr << "FAIL " << __FILE__ << ":" << __LINE__ << "  " << #cond << "\n";     \
    }                                                                                   \
  } while (0)

#define FT_CHECK_EQ(a, b)                                                               \
  do {                                                                                  \
    ++g_testsRun;                                                                       \
    auto ft_a = (a);                                                                    \
    auto ft_b = (b);                                                                    \
    if (!(ft_a == ft_b)) {                                                              \
      ++g_testsFailed;                                                                  \
      std::cerr << "FAIL " << __FILE__ << ":" << __LINE__ << "  " << #a << " == " << #b \
                << "  (got \"" << ft_a << "\" vs \"" << ft_b << "\")\n";                \
    }                                                                                   \
  } while (0)
