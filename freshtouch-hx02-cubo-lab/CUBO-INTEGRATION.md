# Cubo Web SDK Integration — Research Findings

Researched 2026-08-15. Primary source:
[developers.cubopago.com/sdks/web-sdk](https://developers.cubopago.com/sdks/web-sdk).

## How this was researched, and its limits

Direct `WebFetch` to `developers.cubopago.com` and `www.cubopago.com` is
**blocked by this environment's network egress proxy** (`EGRESS_BLOCKED`).
What follows was gathered through web search, which returned
search-engine-cached summaries of the official docs page rather than the
raw page itself. That's good enough to plan an architecture around, but
**it is not a substitute for a human opening the real docs page in an
ordinary browser** before wiring this lab to a real device. Every claim
below is marked CONFIRMED (backed by the search results, attributable to
the docs page) or UNVERIFIED (assumed, or not obtainable from what was
reachable). Nothing here was invented as if it were confirmed.

## CONFIRMED

- The Web SDK works **only with the Cubo QPOS Cute** terminal model.
- An **API Key generated in Cubo Admin** is required to perform payments.
- The application **must be served over HTTPS**; `http://localhost` is
  allowed for development only.
- The device running the app needs **Bluetooth available and enabled**.
- The SDK is **not compatible with Safari** (macOS/iOS) **or Firefox** —
  practically, this means the HX02 tablet must run Chrome (or another
  Chromium-based browser).
- `connect()` / `disconnect()` manage the Bluetooth link to the reader
  directly from the browser.
- `startPayment({ amount, currencyCode, currencySymbol })`:
  - `amount`: charge amount **in cents** (e.g. `"1250"` for $12.50 / Q12.50).
  - `currencyCode`: ISO 4217 **numeric** code, e.g. `"0840"` for USD,
    `"0320"` for GTQ.
  - `currencySymbol`: display symbol, e.g. `"$"` or `"Q"`.
- Events are subscribed via an `on()` method. A **`status`** event reports
  changes in the general connection/payment state.

## UNVERIFIED — must be confirmed before touching real hardware

- **Whether `connected` / `disconnected` / `transactionResult` / `error`
  exist as separate named events** (as this lab's brief assumed and as
  `src/cubo/mockCuboAdapter.js` and `src/cubo/webSdkCuboAdapter.js`
  currently model them), **or** whether every state change — including
  these — is instead delivered through the single `status` event with a
  `state`/`status` field. This is the single biggest open question before
  wiring `webSdkCuboAdapter.js` for real.
- The exact payload field names for a successful transaction (transaction
  ID, reference ID, authorization code, card read type). The lab UI and
  mock adapter assume `transactionId`, `referenceId`, `authorizationCode`,
  `readType` — these are working assumptions, not documented facts.
- The SDK's distribution: script tag URL / npm package name, and how it
  attaches to the page (`window.CuboSDK` is a guess in
  `webSdkCuboAdapter.js`, marked as such).
- The exact initialization call signature (assumed
  `new window.CuboSDK({ apiKey, environment })`).
- Error codes and their meanings.
- Sandbox vs. production behavioral differences beyond the `environment`
  flag's existence.

**Action needed:** someone with normal internet access should open
`https://developers.cubopago.com/sdks/web-sdk` in a browser, note the exact
event names/payloads and script URL, and update
`src/cubo/webSdkCuboAdapter.js` accordingly (the file has inline comments
marking exactly which lines are guesses).

## HTTPS / localhost

The brief asked to investigate how FreshTouch HX02 is currently served.
Findings:

1. **HX02 doesn't have a deployed app yet** — this lab is the first HX02
   code to exist. There's nothing running in production to inspect.
2. **HX01** (the sibling machine, for context only — not modified) has no
   CI/deploy config, `CNAME`, or hosting manifest checked into its repo, so
   its hosting setup isn't discoverable from the repository alone. It may
   be served by GitHub Pages configured outside the repo, a static host, or
   opened directly as local files — undetermined from here.
3. **For this lab today**: serve `freshtouch-hx02-cubo-lab/` over
   `http://localhost:<port>` (e.g. `python3 -m http.server`). Per Cubo's
   documented requirement, `localhost` satisfies the secure-context rule
   for development, so this is sufficient for all Phase 1 testing —
   including with a real tablet, as long as the tablet's browser loads the
   page from `localhost` on that same device (not from another machine's
   IP over plain HTTP).
4. **For a real tablet in the field** (not localhost), HTTPS is required.
   Recommended, in order of effort: (a) a static host that provides HTTPS
   automatically (GitHub Pages, Netlify, Vercel) if HX02 will be served
   remotely; (b) a local HTTPS dev certificate (e.g. via `mkcert`) if HX02
   must run fully offline from a local server. No insecure workaround
   (e.g. disabling the secure-context requirement) was implemented or is
   recommended — the SDK requires a real secure context outside of
   `localhost`, so there's no way around this trade-off.
5. This decision needs to be made deliberately once it's known how HX02
   will actually be deployed (offline kiosk vs. hosted) — not assumed here.

## Pending information from Cubo

These fields are required before any real (even sandbox) test can run, and
none were invented:

| Field | Status |
|---|---|
| `CUBO_ACCOUNT` | Pending |
| `CUBO_MERCHANT_ID` | Pending |
| `CUBO_API_KEY_SANDBOX` | Pending |
| `CUBO_API_KEY_PRODUCTION` | Pending — do not request until sandbox is proven |
| `POS_MODEL` | Assumed QPOS Cute per the brief; confirm serial when hardware is assigned |
| `POS_SERIAL` | Pending |
| `POS_ID` | Pending |
| `SANDBOX_ENABLED` | Pending confirmation from Cubo |
| `PRODUCTION_APPROVED` | Not applicable yet — Phase 1 only |
| `CUBO_CONTACT` | Pending |
| `CUBO_REQUIREMENTS` | Pending — ask Cubo directly whether a merchant/KYC step is needed before sandbox keys are issued |

Track these in `machines/HX02/machine.config.json` (non-secret fields) and
`machines/HX02/secrets.local.json` (gitignored, secret fields — copy from
`secrets.example.json`). Never fill placeholders with fictitious values "to
make it work" — the mock adapter exists specifically so the rest of the
system can be built and tested without real credentials.

## Architecture: the adapter interface

`src/cubo/cuboAdapter.js` exposes one factory,
`createCuboAdapter({ mode: 'mock' | 'web-sdk', machineConfig, apiKey })`,
returning `{ connect, disconnect, startPayment, on }` either way. The rest
of the app (state machine, UI, ESP32 guard) only ever talks to that shape,
so swapping the mock for the real SDK — once the UNVERIFIED items above are
resolved — should not require touching anything outside
`src/cubo/webSdkCuboAdapter.js`.

## ESP32 (Phase 2, not started)

Per the brief, no ESP32 transport was assumed or implemented. HX01's
firmware/protocol (HTTP GET to a local IP, seen in HX01's `app.js` for
reference only — not copied, not modified) is a different machine's
integration and isn't reused here. `src/esp32/esp32Interface.js` only
enforces the one rule that's already certain — "only PAYMENT_SUCCESS may
request a cycle" — and otherwise throws `Esp32NotImplementedError`. The
actual HX02 protocol (GPIO/IP/WebSocket/MQTT/etc.) is an open question for
a later phase, once HX02's existing hardware (if any) has been inspected.
