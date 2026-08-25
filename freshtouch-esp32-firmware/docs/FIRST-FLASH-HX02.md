# Primera prueba física en HX02 — guía paso a paso

No te saltes el orden. Cada paso existe porque revierte algo que, si sale
mal, es más difícil de arreglar después.

## 0. Antes de tocar nada: respaldo del firmware actual (no destructivo)

Si HX02 ya tiene algo cargado (el propietario indicó que sí), hacer una copia
de seguridad ANTES de escribir nada nuevo — así, si algo sale mal, se puede
volver exactamente a donde estaba:

```bash
pip install esptool
esptool.py --port /dev/ttyUSB0 read_flash 0 0x400000 hx02-backup-antes-de-v3.bin
```

(`read_flash` **solo lee**, nunca escribe — es seguro.) Guarda ese archivo en
un lugar seguro, con fecha. Si además quieres analizarlo antes de decidir
seguir: `strings hx02-backup-antes-de-v3.bin | grep -iE "vapor|secado|luz|puerta|relay|http|ssid"`
— a veces revela strings del firmware anterior, útil como referencia
adicional (nunca reemplaza la inspección física de abajo).

## 1. Confirmar que el firmware nuevo compila — desde una máquina con internet normal

Este firmware se escribió en un entorno sin acceso al registro de paquetes
de PlatformIO (ver README.md) — **nunca se compiló de verdad contra el
toolchain de ESP32**. Este paso no es opcional:

```bash
cd freshtouch-esp32-firmware
pio run
```

Si hay errores de compilación, son esperables (código escrito sin poder
verificarlo) — repórtamelos exactamente como aparecen y los corrijo antes de
seguir. No flashees nada hasta que esto termine limpio.

## 2. Verificación física de GPIO — SIN asumir nada de la foto

Con el ESP32 **desconectado de la corriente** (o al menos del lado de los
relés/actuadores):

1. Localizar en la placa adaptadora de 30 pines la serigrafía de cada pin
   (normalmente impresa junto al header).
2. Seguir cada cable desde las entradas S1/S2/S3/S4 del módulo de 4 relés
   hasta el pin GPIO correspondiente en el adaptador. Anotar la
   correspondencia real (ej. "S1 → GPIO26").
3. Del otro lado del módulo de relés (las salidas, no las entradas): seguir
   cada cable hasta el actuador físico real (¿a qué está conectado el relé
   que corresponde a S1? ¿vapor, secado, puerta, algo más?).
4. Compara esto contra los defaults de este firmware (`puerta=25, vapor=33,
   secado=32, luzuv=18`, ver README.md). Si no coinciden, **no los cambies
   en el firmware todavía** — anótalos y dímelos; ajusto `RelayMap` con los
   valores reales antes de que confíes en ningún comando.

## 3. Verificación de polaridad — el paso que más fácil se salta y más daño puede hacer

No se sabe si el módulo de relés es active-HIGH o active-LOW (ver
`lib/core/include/RelayMap.h`). Con el ESP32 ya flasheado (paso 5) pero
**con los actuadores reales desconectados del módulo de relés todavía**
(o al menos sabiendo cuál es seguro tocar):

1. Desde `/admin` (ver paso 7), usa "Probar" en un solo relé.
2. Observa/escucha el módulo de relés: la mayoría hacen un clic audible y
   tienen un LED que se enciende cuando el relé se energiza.
3. Si el LED/clic ocurre cuando esperabas que estuviera "apagado" (o
   viceversa), la polaridad está invertida — dímelo y cambio
   `activeLow` a `true` para ese componente antes de que el firmware
   controle algo real.

**No conectes un actuador real (electroimán de puerta, válvula de vapor) a
un relé cuya polaridad no hayas confirmado.**

## 4. Flashear

```bash
pio run --target upload --upload-port /dev/ttyUSB0
```

## 5. Primer arranque — modo provisioning

El ESP32 arranca sin Wi-Fi configurado, así que entra solo a modo AP. Con un
teléfono:

1. Buscar la red Wi-Fi `FreshTouch-Setup-XXXX` y conectarse.
2. Debería aparecer automáticamente un aviso de "iniciar sesión en la red"
   (portal cautivo) — si no, abrir un navegador a `http://192.168.4.1`.
3. Completar: `machineId` (ej. `HX02`), SSID/contraseña de tu red real,
   modo de red (DHCP es lo más simple para la primera prueba), y una
   contraseña de administrador (guárdala, la necesitas para `/admin`).
4. Enviar — el dispositivo se reinicia solo y se conecta a tu red real.

## 6. Confirmar que `/status` responde

Encuentra la IP del dispositivo (router, o la app de tu router) y:

```bash
curl http://<IP-de-HX02>/status
```

Debe devolver el JSON descrito en `docs/PROTOCOL.md` — confirma
`wifiConnected: true` y que `machineId` sea el que escribiste.

## 7. Probar cada relé desde `/admin`, ANTES de conectar la app

```
http://<IP-de-HX02>/admin
```

Entra con la contraseña que configuraste. Para cada componente, usa
"Probar" **de a uno por vez**, observando físicamente qué actuador
responde — esto es lo que confirma (o corrige) el mapa GPIO→relé→actuador
del paso 2, ahora con evidencia eléctrica real, no solo visual.

## 8. Confirmar compatibilidad del endpoint viejo

```bash
curl "http://<IP-de-HX02>/relay?comp=vapor&state=1"
curl "http://<IP-de-HX02>/relay?comp=vapor&state=0"
```

Debe comportarse exactamente igual que el botón "Probar" de `/admin` —
es el mismo código por debajo (`handleRelayCommand`, `lib/core/`).

## 9. Recién después de todo esto

Con el protocolo confirmado en hardware real, el siguiente paso es
implementar `realEsp32Adapter.js` en `fresh-touch-app/web/src/esp32/` para
que la app hable con este firmware — eso es un cambio de código nuevo,
separado, que espera tu autorización explícita después de ver los
resultados de esta prueba.
