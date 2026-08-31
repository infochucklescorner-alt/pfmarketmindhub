import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  QUOTE_STALE_SECONDS,
  type BridgeHealth,
  type BridgeQuote,
} from "@/lib/bridge-types";

/** Heartbeats older than this mean the bridge is treated as offline (fail closed). */
export const BRIDGE_HEARTBEAT_TIMEOUT_SECONDS = 120;

export const getBridgeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bridge_status")
      .select(
        "id, bridge_id, status, mt5_connected, execution_enabled, last_heartbeat_at, last_quote_at, symbol, bid, ask, spread, terminal_build, last_error, mt5_accounts(label)",
      )
      .order("last_heartbeat_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

type HealthPayload = {
  mt5_connected?: boolean;
  terminal_build?: string | null;
  server_time?: string | null;
  error?: string | null;
};

/** Live health probe against the self-hosted bridge. Monitoring only. */
export const getBridgeHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<BridgeHealth> => {
    const { bridgeGet } = await import("@/lib/bridge-api.server");
    const res = await bridgeGet<HealthPayload>("/health");
    return {
      configured: res.configured,
      reachable: res.ok,
      mt5Connected: Boolean(res.ok && res.data?.mt5_connected),
      latencyMs: res.latencyMs,
      terminalBuild: res.data?.terminal_build ?? null,
      serverTime: res.data?.server_time ?? null,
      error: res.error ?? res.data?.error ?? null,
      checkedAt: new Date().toISOString(),
    };
  });

type QuotePayload = {
  symbol?: string;
  bid?: number | null;
  ask?: number | null;
  digits?: number | null;
  point?: number | null;
  time?: string | null;
};

/** Live tick for a single symbol. Fails closed on stale or unreachable data. */
export const getBridgeQuote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { symbol: string }) =>
    z
      .object({ symbol: z.string().trim().min(1).max(24).regex(/^[A-Za-z0-9._-]+$/) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<BridgeQuote> => {
    const symbol = data.symbol.toUpperCase();
    const { bridgeGet } = await import("@/lib/bridge-api.server");
    const res = await bridgeGet<QuotePayload>(`/quote/${encodeURIComponent(symbol)}`);

    const bid = typeof res.data?.bid === "number" ? res.data.bid : null;
    const ask = typeof res.data?.ask === "number" ? res.data.ask : null;
    const digits = typeof res.data?.digits === "number" ? res.data.digits : null;
    const point =
      typeof res.data?.point === "number" && res.data.point > 0
        ? res.data.point
        : digits != null
          ? Math.pow(10, -digits)
          : null;
    const spreadPrice = bid != null && ask != null ? Number((ask - bid).toFixed(6)) : null;
    const quotedAt = res.data?.time ?? null;
    const ageSeconds = quotedAt ? (Date.now() - new Date(quotedAt).getTime()) / 1000 : null;
    const stale = !res.ok || ageSeconds == null || ageSeconds > QUOTE_STALE_SECONDS;

    return {
      configured: res.configured,
      reachable: res.ok,
      symbol,
      bid: stale ? null : bid,
      ask: stale ? null : ask,
      spreadPrice: stale ? null : spreadPrice,
      spreadPoints:
        stale || spreadPrice == null || !point ? null : Math.round(spreadPrice / point),
      digits,
      quotedAt,
      stale,
      latencyMs: res.latencyMs,
      error: res.error,
    };
  });
