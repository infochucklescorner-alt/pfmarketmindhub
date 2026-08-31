import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const INITIAL_STAGE_DAYS = 5;
const STAGE_INCREMENT = 5;
const PLATFORM_SHARE = 0.3;

/** Free access period, progression stage, invoices and payment history. */
export const getMonetizationOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let { data: period } = await supabase
      .from("pf_nexus_access_periods")
      .select("id, stage_days, paid_profit_days, started_at, expires_at, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!period) {
      const started = new Date();
      const expires = new Date(started.getTime() + INITIAL_STAGE_DAYS * 86400000);
      const { data: created } = await supabase
        .from("pf_nexus_access_periods")
        .insert({
          user_id: userId,
          stage_days: INITIAL_STAGE_DAYS,
          started_at: started.toISOString(),
          expires_at: expires.toISOString(),
        })
        .select("id, stage_days, paid_profit_days, started_at, expires_at, status")
        .maybeSingle();
      period = created ?? null;
    }

    const [profitDays, invoices, payments] = await Promise.all([
      supabase
        .from("pf_nexus_profit_days")
        .select(
          "id, trading_date, realized_net_profit, user_share, platform_share, is_profitable",
        )
        .order("trading_date", { ascending: false })
        .limit(30),
      supabase
        .from("pf_nexus_invoices")
        .select(
          "id, trading_date, realized_net_profit, user_share, platform_share, amount_due, currency, due_date, status, checkout_url, paid_at",
        )
        .order("trading_date", { ascending: false })
        .limit(30),
      supabase
        .from("pf_nexus_payments")
        .select("id, amount, currency, status, provider, paid_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const invoiceRows = invoices.data ?? [];
    const todaysInvoice = invoiceRows.find((i) => i.trading_date === today) ?? null;
    const todaysProfitDay =
      (profitDays.data ?? []).find((d) => d.trading_date === today) ?? null;

    const expiresAt = period?.expires_at ?? null;
    const daysRemaining = expiresAt
      ? Math.max(
          0,
          Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000),
        )
      : 0;

    const stageDays = period?.stage_days ?? INITIAL_STAGE_DAYS;

    return {
      period: period
        ? { ...period, daysRemaining, nextStageDays: stageDays + STAGE_INCREMENT }
        : null,
      stageDays,
      stageIncrement: STAGE_INCREMENT,
      paidProfitDays: period?.paid_profit_days ?? 0,
      platformSharePct: PLATFORM_SHARE,
      profitDays: profitDays.data ?? [],
      invoices: invoiceRows,
      payments: payments.data ?? [],
      todaysInvoice,
      todaysRealizedNetProfit: Number(todaysProfitDay?.realized_net_profit ?? 0),
      todaysUserShare: Number(todaysProfitDay?.user_share ?? 0),
      todaysPlatformShare: Number(todaysProfitDay?.platform_share ?? 0),
      paymentProviderConnected: false,
    };
  });

/** Returns the backend-generated checkout URL for an invoice, when one exists. */
export const getInvoiceCheckoutUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ invoiceId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: invoice, error } = await context.supabase
      .from("pf_nexus_invoices")
      .select("id, checkout_url, status")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invoice) throw new Error("Invoice not found.");
    if (!invoice.checkout_url) {
      return { checkoutUrl: null as string | null, providerConnected: false };
    }
    return { checkoutUrl: invoice.checkout_url, providerConnected: true };
  });
