// Placeholder — NO es un archivo real de secretos, y este firmware no
// lo incluye ni lo lee en ningún lado del código.
//
// El diseño de este firmware NO necesita un archivo de secretos
// compilado: el SSID/contraseña de Wi-Fi y la contraseña de admin se
// introducen en tiempo de ejecución a través del portal de provisioning
// (ver docs/PROVISIONING.md) y se guardan en NVS del propio
// dispositivo — nunca en el código fuente ni en este repositorio.
//
// Este archivo existe solo como convención/documentación, igual que
// machines/HX02/secrets.example.json en freshtouch-hx02-cubo-lab: si en
// el futuro alguien agrega un atajo de "pre-sembrar" credenciales para
// pruebas de desarrollo repetidas (para no tener que pasar por el
// portal cada vez que se borra la NVS durante pruebas), la copia real
// debe llamarse `secrets.local.h`, vivir en este mismo directorio, y
// está excluida por .gitignore — NUNCA debe terminar en un commit.

// #define FT_DEV_WIFI_SSID "solo-para-pruebas-locales"
// #define FT_DEV_WIFI_PASS "solo-para-pruebas-locales"
