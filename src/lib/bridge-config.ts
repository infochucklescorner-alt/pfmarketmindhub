// Public (non-secret) bridge client configuration.
// Secrets (bridge base URL credentials, shared secret) stay server-side.

const rawSymbols = import.meta.env['VITE_BRIDGE_SYMBOLS'] as string | undefined;

export const BRIDGE_SYMBOLS: string[] = (rawSymbols ?? "XAUUSD,EURUSD,GBPUSD,USDJPY")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

export const DEFAULT_BRIDGE_SYMBOL = BRIDGE_SYMBOLS[0] ?? "XAUUSD";

/** How often the dashboard polls bridge health/quotes, in ms. */
export const BRIDGE_POLL_INTERVAL_MS = 20_000;
