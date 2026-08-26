import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("positions")
      .select(
        "id, symbol, side, volume, open_price, current_price, profit, opened_at, mt5_accounts(label)",
      )
      .order("opened_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const listTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("trades")
      .select(
        "id, symbol, side, volume, open_price, close_price, profit, opened_at, closed_at, mt5_accounts(label)",
      )
      .order("closed_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data;
  });

export const getPerformanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("trades")
      .select("profit, closed_at")
      .order("closed_at", { ascending: true });
    if (error) throw new Error(error.message);

    const trades = data ?? [];
    const profits = trades.map((t) => Number(t.profit ?? 0));
    const wins = profits.filter((p) => p > 0);
    const losses = profits.filter((p) => p < 0);
    const grossProfit = wins.reduce((s, p) => s + p, 0);
    const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));

    let cumulative = 0;
    const equityCurve = trades.map((t) => {
      cumulative += Number(t.profit ?? 0);
      return { date: t.closed_at, value: cumulative };
    });

    return {
      totalTrades: trades.length,
      netProfit: grossProfit - grossLoss,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
      bestTrade: profits.length > 0 ? Math.max(...profits) : 0,
      worstTrade: profits.length > 0 ? Math.min(...profits) : 0,
      equityCurve,
    };
  });
