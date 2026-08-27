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
