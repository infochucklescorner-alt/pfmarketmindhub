import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
