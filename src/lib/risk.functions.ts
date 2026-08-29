import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listRiskSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("risk_settings")
      .select(
        "id, activation_id, risk_per_trade_pct, max_daily_loss_pct, max_drawdown_pct, max_open_positions, trading_enabled, bot_activations(status, bots(name), mt5_accounts(label))",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const saveRiskSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        activationId: z.string().uuid(),
        riskPerTradePct: z.number().min(0.1).max(10),
        maxDailyLossPct: z.number().min(0.5).max(50),
        maxDrawdownPct: z.number().min(1).max(90),
        maxOpenPositions: z.number().int().min(1).max(50),
        tradingEnabled: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("risk_settings")
      .update({
        risk_per_trade_pct: data.riskPerTradePct,
        max_daily_loss_pct: data.maxDailyLossPct,
        max_drawdown_pct: data.maxDrawdownPct,
        max_open_positions: data.maxOpenPositions,
        trading_enabled: data.tradingEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("activation_id", data.activationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTradingEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ enabled: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("risk_settings")
      .update({ trading_enabled: data.enabled, updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, enabled: data.enabled };
  });

/**
 * Emergency stop: disables trading on every risk profile and pauses every bot
 * activation for the signed-in user. Monitoring-only build — no orders exist to
 * close yet, but the kill switch state is persisted for the execution service.
 */
export const emergencyStop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date().toISOString();
    const [risk, activations] = await Promise.all([
      context.supabase
        .from("risk_settings")
        .update({ trading_enabled: false, updated_at: now })
        .eq("user_id", context.userId),
      context.supabase
        .from("bot_activations")
        .update({ status: "paused", updated_at: now })
        .eq("user_id", context.userId)
        .neq("status", "paused"),
    ]);
    const err = risk.error ?? activations.error;
    if (err) throw new Error(err.message);
    return { ok: true, stoppedAt: now };
  });
