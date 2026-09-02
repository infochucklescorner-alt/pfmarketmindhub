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
      paymentProviderConnected: (await import("@/lib/paystack.server")).getPaystackConfig()
        .configured,
      emailNotificationsConfigured: Boolean(process.env["BREVO_API_KEY"]),

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

/**
 * Creates (or reuses) a Paystack checkout session for a daily profit-share invoice.
 * All provider secrets stay server-side; the client only ever receives a checkout URL.
 */
export const createPaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ invoiceId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getPaystackConfig } = await import("@/lib/paystack.server");
    const paystack = getPaystackConfig();
    const base = { mode: paystack.mode, error: null as string | null };

    const { data: invoice, error } = await context.supabase
      .from("pf_nexus_invoices")
      .select("id, amount_due, currency, status, checkout_url")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "paid") {
      return { ...base, configured: true, checkoutUrl: null as string | null, alreadyPaid: true };
    }
    if (invoice.checkout_url) {
      return {
        ...base,
        configured: true,
        checkoutUrl: invoice.checkout_url,
        alreadyPaid: false,
      };
    }


    const { getPaystackConfig } = await import("@/lib/paystack.server");
    const paystack = getPaystackConfig();
    if (!paystack.configured || !paystack.secretKey) {
      return {
        configured: false,
        checkoutUrl: null as string | null,
        alreadyPaid: false,
        mode: paystack.mode,
        error: paystack.error,
      };
    }

    const email = context.claims?.email as string | undefined;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystack.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email ?? `${context.userId}@pfnexus.invalid`,
        amount: Math.round(Number(invoice.amount_due) * 100),
        currency: invoice.currency || "USD",
        metadata: { invoice_id: invoice.id, user_id: context.userId },
      }),
    });

    if (!res.ok) {
      throw new Error("Checkout could not be created. Please try again shortly.");
    }
    const payload = (await res.json()) as {
      data?: { authorization_url?: string };
    };
    const url = payload.data?.authorization_url ?? null;
    if (!url) throw new Error("Checkout could not be created. Please try again shortly.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("pf_nexus_invoices")
      .update({ checkout_url: url })
      .eq("id", invoice.id)
      .eq("user_id", context.userId);

    return { configured: true, checkoutUrl: url, alreadyPaid: false };
  });

/** Invoices belonging to the signed-in user (RLS scopes rows to the caller). */
export const getMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pf_nexus_invoices")
      .select(
        "id, invoice_number, trading_date, amount_due, currency, status, due_date, checkout_url, paid_at",
      )
      .eq("user_id", context.userId)
      .order("trading_date", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    return {
      invoices: data ?? [],
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  });

/** Admin-only: billing records across users, without exposing personal data. */
export const getAllInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { data, error } = await context.supabase
      .from("pf_nexus_invoices")
      .select(
        "id, invoice_number, user_id, trading_date, amount_due, currency, status, due_date, paid_at",
      )
      .order("trading_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    // Only a short opaque reference is surfaced — never other users' emails.
    return (data ?? []).map((row) => ({
      ...row,
      user_ref: row.user_id.slice(0, 8),
      user_id: undefined as unknown as string,
    }));
  });
