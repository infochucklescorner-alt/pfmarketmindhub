import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    // Ensure a profile row exists (created lazily on first dashboard load).
    await supabase
      .from("profiles")
      .upsert(
        { id: userId, email: typeof claims.email === "string" ? claims.email : null },
        { onConflict: "id", ignoreDuplicates: true },
      );

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [accounts, activations, positions, trades, subscription, risk, recent] =
      await Promise.all([
        supabase
          .from("mt5_accounts")
          .select("id, label, broker_server, status, balance, equity, currency")
          .order("created_at", { ascending: false }),
        supabase
          .from("bot_activations")
          .select("id, status, bots(name), mt5_accounts(label)")
          .order("created_at", { ascending: false }),
        supabase.from("positions").select("id, profit", { count: "exact" }),
        supabase.from("trades").select("id, profit, closed_at"),
        supabase
          .from("user_subscriptions")
          .select("id, status, current_period_end, plans(name, slug, price_cents)")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("risk_settings")
          .select(
            "id, activation_id, trading_enabled, max_open_positions, risk_per_trade_pct",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("trades")
          .select("id, symbol, side, volume, open_price, close_price, profit, closed_at")
          .order("closed_at", { ascending: false })
          .limit(8),
      ]);

    const firstError =
      accounts.error ??
      activations.error ??
      positions.error ??
      trades.error ??
      risk.error ??
      recent.error;
    if (firstError) throw new Error(firstError.message);

    const realizedProfit = (trades.data ?? []).reduce(
      (sum, t) => sum + Number(t.profit ?? 0),
      0,
    );
    const floatingProfit = (positions.data ?? []).reduce(
      (sum, p) => sum + Number(p.profit ?? 0),
      0,
    );

    const todaysTrades = (trades.data ?? []).filter(
      (t) => t.closed_at && new Date(t.closed_at) >= startOfDay,
    );
    const riskRows = risk.data ?? [];

    return {
      accounts: accounts.data ?? [],
      activations: activations.data ?? [],
      openPositions: positions.count ?? 0,
      totalTrades: (trades.data ?? []).length,
      todaysTrades: todaysTrades.length,
      todaysProfit: todaysTrades.reduce((s, t) => s + Number(t.profit ?? 0), 0),
      realizedProfit,
      floatingProfit,
      subscription: subscription.data ?? null,
      riskSettings: riskRows,
      tradingEnabled: riskRows.some((r) => r.trading_enabled),
      recentTrades: recent.data ?? [],
    };
  });

