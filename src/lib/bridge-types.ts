// Client-safe typed models for the PF NEXUS MT5 bridge.
// No secrets here — bridge auth happens server-side only.

/** Quotes older than this are considered stale and fail closed. */
export const QUOTE_STALE_SECONDS = 30;

export type BridgeHealth = {
  /** False when no BRIDGE_BASE_URL is configured on the server. */
  configured: boolean;
  reachable: boolean;
  mt5Connected: boolean;
  /** Round-trip time of the health probe, in milliseconds. */
  latencyMs: number | null;
  terminalBuild: string | null;
  serverTime: string | null;
  /** Safe, non-sensitive error summary. */
  error: string | null;
  checkedAt: string;
};

export type BridgeQuote = {
  configured: boolean;
  reachable: boolean;
  symbol: string;
  bid: number | null;
  ask: number | null;
  /** ask - bid, in quote currency. */
  spreadPrice: number | null;
  /** Spread expressed in broker points. */
  spreadPoints: number | null;
  digits: number | null;
  /** ISO timestamp of the tick as reported by the bridge. */
  quotedAt: string | null;
  stale: boolean;
  latencyMs: number | null;
  error: string | null;
};

export function quoteAgeSeconds(quotedAt: string | null, now = Date.now()) {
  if (!quotedAt) return null;
  return (now - new Date(quotedAt).getTime()) / 1000;
}
