# Test Plan

## Automated (run: `npm test`, no dependencies, 39 tests today)

### Payment state machine — `tests/paymentStateMachine.test.js`
- Happy path IDLE → ... → PAYMENT_SUCCESS reaches `canStartCycle() === true`.
- Declined, cancelled, and timeout paths reach their respective terminal
  states and never `PAYMENT_SUCCESS`.
- Invalid transitions throw instead of silently changing state.
- Terminal non-success states can `RESET` back to `IDLE`.
- `canStartCycle(state)` is exhaustively checked against every state in the
  machine — true for exactly one (`PAYMENT_SUCCESS`), false for all others.

### Security rule — `tests/security.test.js`
Directly tests the brief's non-negotiable rule. `requestCycleStart()` is
called once per state and must refuse for every one of:

`IDLE`, `SERVICE_SELECTED`, `PAYMENT_METHOD_SELECTED`, `CONNECTING_POS`,
`POS_CONNECTED`, `WAITING_FOR_CARD`, `PROCESSING_PAYMENT`,
`PAYMENT_DECLINED`, `PAYMENT_CANCELLED`, `PAYMENT_ERROR`,
`PAYMENT_TIMEOUT`

and only pass the guard (reaching the "ESP32 not implemented yet" stub, not
a refusal) for `PAYMENT_SUCCESS`.

### Mock Cubo adapter — `tests/mockCuboAdapter.test.js`
POS lifecycle:
- `connect()` emits `connected`, flips `isConnected()` to true.
- `disconnect()` emits `disconnected`, flips it back to false.
- `startPayment()` before `connect()` rejects (POS not connected / not
  found case).

Payment outcomes — one test per outcome, asserting the emitted
`transactionResult.status` matches:
`SUCCESS`, `DECLINED`, `CANCELLED`, `ERROR`, `TIMEOUT`.

Data hygiene:
- A `SUCCESS` result's keys never include anything matching
  `card|pan|cvv|pin`.

## Manual — lab UI (`lab/lab.html`, simulated mode, no hardware needed)

- [ ] Page loads over `http://localhost:<port>/lab/lab.html` with no
      console errors.
- [ ] Machine config for HX02 loads; BASIC/PREMIUM buttons show the
      configured prices.
- [ ] Selecting a service highlights it and advances the payment status
      display.
- [ ] "CONNECT POS" transitions POS status to Connected and payment status
      to `POS_CONNECTED`.
- [ ] "TEST PAYMENT" with simulated outcome `SUCCESS` shows transaction
      ID, reference ID, authorization code, read type and timestamp, and
      the log panel shows the ESP32 guard passing (not-implemented stub).
- [ ] "TEST PAYMENT" with each of `DECLINED` / `CANCELLED` / `ERROR` /
      `TIMEOUT` shows the matching transaction status and the log panel
      shows the ESP32 guard **refusing** — never the not-implemented stub.
- [ ] "RESET" clears the result panel and returns payment status to
      `IDLE`.
- [ ] No card number, CVV, PIN, or API key ever appears in the on-screen
      log panel or the browser console.

## Manual — real hardware (cannot be performed from this environment; checklist for whoever has the tablet + POS + credentials)

POS:
- [ ] POS powered off — lab reports a connection failure, not a false
      "connected".
- [ ] Tablet Bluetooth off — `Bluetooth` status shows OFF/unavailable
      before attempting connect.
- [ ] POS powered on, in range, Bluetooth on — POS is found and reaches
      `CONNECTED`.
- [ ] POS out of range / not discoverable — connect attempt fails
      cleanly, state machine reaches `PAYMENT_ERROR`, no crash.
- [ ] Disconnect mid-session (POS powered off after connecting) —
      `disconnected` event observed, UI reflects it.

Payment (real card, sandbox environment, small test amount):
- [ ] Successful tap/insert/swipe → `transactionResult.status === SUCCESS`
      → screen shows transaction ID, reference ID, auth code.
- [ ] Declined card → `DECLINED`, no cycle-start attempt.
- [ ] Customer cancels on the POS screen → `CANCELLED`, no cycle-start
      attempt.
- [ ] No response from POS within a reasonable window → `TIMEOUT`, no
      cycle-start attempt.
- [ ] Network/Bluetooth error mid-transaction → `ERROR`, no cycle-start
      attempt.
- [ ] Unsupported card → SDK's specific error surfaces without crashing
      the page.

Before this checklist can run, confirm the UNVERIFIED items in
`CUBO-INTEGRATION.md` (exact event names/payloads) against the live docs —
otherwise `webSdkCuboAdapter.js`'s event wiring may not match reality and
this checklist would be testing guesses.
