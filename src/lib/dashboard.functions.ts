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

    const [accounts, activations, positions, trades, subscription] = await Promise.all([
      supabase
        .from("mt5_accounts")
        .select("id, label, broker_server, status, balance, equity, currency")
        .order("created_at", { ascending: false }),
      supabase
        .from("bot_activations")
        .select("id, status, bots(name), mt5_accounts(label)")
        .order("created_at", { ascending: false }),
      supabase.from("positions").select("id, profit", { count: "exact" }),
      supabase.from("trades").select("id, profit"),
      supabase
        .from("user_subscriptions")
        .select("id, status, current_period_end, plans(name, slug, price_cents)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const firstError =
      accounts.error ?? activations.error ?? positions.error ?? trades.error;
    if (firstError) throw new Error(firstError.message);

    const realizedProfit = (trades.data ?? []).reduce(
      (sum, t) => sum + Number(t.profit ?? 0),
      0,
    );
    const floatingProfit = (positions.data ?? []).reduce(
      (sum, p) => sum + Number(p.profit ?? 0),
      0,
    );

    return {
      accounts: accounts.data ?? [],
      activations: activations.data ?? [],
      openPositions: positions.count ?? 0,
      totalTrades: (trades.data ?? []).length,
      realizedProfit,
      floatingProfit,
      subscription: subscription.data ?? null,
    };
  });
