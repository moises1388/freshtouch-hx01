# Cubo Web SDK Integration — Research Findings

Primary source:
[developers.cubopago.com/sdks/web-sdk](https://developers.cubopago.com/sdks/web-sdk).

## How this was researched, and its limits

This session's own direct access is blocked: `WebFetch` to
`developers.cubopago.com` and `www.cubopago.com` returns `EGRESS_BLOCKED`,
and a direct `curl` through this environment's egress proxy confirms it's a
policy-level `403` on both hosts — not a fixable client/TLS issue. An
initial pass (2026-08-15) was built from web-search-engine cached summaries
of the docs page, which was enough to plan an architecture around but left
several items unconfirmed.

**Update (2026-08-15, later same day):** the machine owner opened
`https://developers.cubopago.com/sdks/web-sdk` directly in their own
browser and reported its contents back verbatim. The items below marked
CONFIRMED under "events" and "status values" come from that owner-verified
read of the live page, not from this session's own fetch (still blocked).
Everything else keeps its original sourcing. Payload field shapes that
weren't part of what the owner reported are still marked UNVERIFIED below —
they were deliberately not guessed.

## CONFIRMED

- The Web SDK works **only with the Cubo QPOS Cute** terminal model.
- An **API Key generated in Cubo Admin** is required to perform payments.
  Sandbox access itself is requested through Cubo's contact center; keys
  are then generated from Cubo Admin.
- The application **must be served over HTTPS**; `http://localhost` is
  allowed for development only.
- The device running the app needs **Bluetooth available and enabled**.
- Supported browsers: **Chrome (Desktop/Android), Edge (Desktop), Opera
  (Desktop/Android)**. (Not Safari, not Firefox.) The HX02 tablet must run
  one of the supported browsers — Chrome for Android is the natural choice.
- Methods: **`connect()`**, **`disconnect()`**, **`startPayment()`**,
  **`on()`**. `connect()` / `disconnect()` manage the Bluetooth link to the
  reader directly from the browser.
- `startPayment({ amount, currencyCode, currencySymbol })`:
  - `amount`: charge amount **in cents**, e.g. Q20.00 → `2000`, Q35.00 →
    `3500`.
  - `currencyCode`: ISO 4217 **numeric** code — **GTQ = `"0320"`** for
    Guatemala (also seen: `"0840"` for USD).
  - `currencySymbol`: display symbol, e.g. `"Q"` or `"$"`.
- **Events, subscribed via `on()`:** `connected`, `disconnected`,
  `loading`, `transactionResult`, `error`, `status`.
- **Status values** (carried by the `status` event): `searching`,
  `connecting`, `connected`, `disconnected`, `waiting_for_card`,
  `processing_payment`, `payment_success`, `payment_failed`,
  `transaction_terminated`.

  Note the apparent overlap: `connected`/`disconnected` show up both as
  their own discrete events *and* as values the `status` event can carry.
  The exact relationship between the two (does `status` fire in parallel
  with the discrete events, or only for states that have no dedicated
  event?) isn't specified by what was reported — treat both as real and
  worth listening to, without assuming how they interleave until a real
  device is observed.

## UNVERIFIED — must be confirmed before touching real hardware

Now narrower than before: event and status *names* are confirmed above.
What's still open is their exact *payload shape*, and SDK distribution
details nobody has reported yet:

- **The exact payload field names** inside `transactionResult` (transaction
  ID, reference ID, authorization code, card read type) — not specified by
  what was verified. The lab UI and mock adapter still use
  `transactionId`, `referenceId`, `authorizationCode`, `readType` as
  working assumptions only, clearly not to be treated as documented fact.
- **The exact payload fields of the `error` event** — not specified.
  `mockCuboAdapter.js`'s `{ code, message }` shape is a placeholder, not a
  confirmed contract.
- **The exact payload of the `status` event** (is the state in a `state`
  field, a `status` field, something else? is there a timestamp, a
  message?) — not specified.
- The SDK's distribution: script tag URL / npm package name, and how it
  attaches to the page (`window.CuboSDK` is still a guess in
  `webSdkCuboAdapter.js`, marked as such).
- The exact initialization call signature (still assumed
  `new window.CuboSDK({ apiKey, environment })`).
- Error codes and their meanings.
- Sandbox vs. production behavioral differences beyond the `environment`
  flag's existing.

**Action needed:** the same owner (or anyone with normal browser access)
pulling up the official SDK repository/demo referenced from that docs page,
or running one real `connect()`/`startPayment()` call against sandbox and
recording the raw event payloads, is what would close these out. Until
then `src/cubo/webSdkCuboAdapter.js` keeps its payload-shape assumptions
clearly flagged as assumptions, not facts.

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
| `SANDBOX_ENABLED` | Pending — known channel: request sandbox access through Cubo's contact center, then generate the key in Cubo Admin |
| `PRODUCTION_APPROVED` | Not applicable yet — Phase 1 only |
| `CUBO_CONTACT` | Pending — need the actual contact center channel (phone/email/form) |
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

One layer up, `src/payment/cuboCardProvider.js` wraps this adapter plus the
payment state machine into the `PaymentProvider` shape shared with (future)
other payment methods — see
`.claude/skills/hydrox-payment-architecture/SKILL.md` for that architecture.
It does not change anything documented above; it only adds wiring on top.

## ESP32 (Phase 2, not started)

Per the brief, no ESP32 transport was assumed or implemented. HX01's
firmware/protocol (HTTP GET to a local IP, seen in HX01's `app.js` for
reference only — not copied, not modified) is a different machine's
integration and isn't reused here. `src/esp32/esp32Interface.js` only
enforces the one rule that's already certain — "only PAYMENT_SUCCESS may
request a cycle" — and otherwise throws `Esp32NotImplementedError`. The
actual HX02 protocol (GPIO/IP/WebSocket/MQTT/etc.) is an open question for
a later phase, once HX02's existing hardware (if any) has been inspected.
