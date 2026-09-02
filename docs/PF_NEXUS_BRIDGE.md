# PF NEXUS — bridge & payment configuration

## Execution flow (design)

```text
PF NEXUS Safety Engine  ->  PF NEXUS Bridge (pyMt5Bridge)  ->  MetaTrader 5 terminal  ->  HFM demo
```

The web app never runs MetaTrader 5. The bridge is an **external service** deployed
on a Linux VM (MT5 under Wine, based on `monki103/pyMt5Bridge`). During this phase
the bridge is **monitoring only** — health, account info and market data. No order
route exists on either side.

## Mandatory Safety Engine gates

No UI or API change may bypass these. They are the required pre-conditions for any
future order execution:

news-day blocking · maximum spread $1.00 · drawdown & risk-per-trade limits ·
trading session window · risk/reward minimum · emergency shutdown · order idempotency key.

## Server environment variables

Set these in Project Settings → Secrets. Never place them in frontend code, Git or
`VITE_*` variables.

| Variable | Purpose |
| --- | --- |
| `PAYSTACK_ENVIRONMENT` | `sandbox` (default, development) or `live` (production only) |
| `PAYSTACK_SECRET_KEY` | `sk_test_...` in sandbox, `sk_live_...` in live. A mismatch is rejected. |
| `BRIDGE_BASE_URL` | Base URL of the self-hosted PF NEXUS bridge |
| `BRIDGE_SHARED_SECRET` | HMAC signing secret shared with the bridge |
| `MT5_CREDENTIALS_KEY` | Server-side AES-GCM key for encrypting MT5 credentials |
| `BREVO_API_KEY` | Optional; email notifications |

Client-safe (non-secret) variable: `VITE_BRIDGE_SYMBOLS`.

## Endpoints

- `POST /api/public/bridge/heartbeat` — HMAC-SHA256 signed telemetry from the bridge.
- `POST /api/public/paystack/webhook` — HMAC-SHA512 signed Paystack events, idempotent
  by provider reference. Configure this URL in the Paystack **test** dashboard while
  developing.
