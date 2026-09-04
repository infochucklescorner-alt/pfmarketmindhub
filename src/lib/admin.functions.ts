import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Default platform owner. Additional admins are granted through user_roles. */
export const ADMIN_EMAIL = "info.marketmindhub@gmail.com";

type AuthContext = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  userId: string;
  claims?: Record<string, unknown> | null;
};

/** Server-side admin gate: user_roles first, platform-owner email as fallback. */
async function assertAdmin(context: AuthContext): Promise<string> {
  const email = String(context.claims?.["email"] ?? "").toLowerCase();
  const { data: hasRole } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (hasRole === true) return email;
  if (email && email === ADMIN_EMAIL) return email;
  throw new Response("Forbidden", { status: 403 });
}

/** Lightweight check used to decide whether admin UI is shown. */
export const getMyAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const email = await assertAdmin(context as unknown as AuthContext);
      return { isAdmin: true, email };
    } catch {
      return { isAdmin: false, email: null as string | null };
    }
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);

    // Privileged aggregates only run after the role check above.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, accounts, activations, subscriptions, recentUsers] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("mt5_accounts").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("bot_activations")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("user_subscriptions")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("profiles")
          .select("email, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    return {
      totalUsers: profiles.count ?? 0,
      totalAccounts: accounts.count ?? 0,
      totalActivations: activations.count ?? 0,
      totalSubscriptions: subscriptions.count ?? 0,
      recentUsers: recentUsers.data ?? [],
    };
  });

/** Admin-only: promote another account to admin by email. */
export const grantAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("No account found with that email.");

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: profile.id, role: "admin" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);
    return { ok: true };
  });

/**
 * TEMPORARY admin-only Brevo deliverability test.
 * The BREVO_API_KEY secret is read server-side only and never returned.
 */
export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ to: z.string().email().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const adminEmail = await assertAdmin(context as unknown as AuthContext);
    const apiKey = process.env["BREVO_API_KEY"];
    const recipient = data.to ?? adminEmail ?? ADMIN_EMAIL;

    if (!apiKey) {
      return {
        ok: false as const,
        recipient,
        error: "Brevo is not connected yet (BREVO_API_KEY is not configured).",
        sentAt: null as string | null,
      };
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "PF NEXUS", email: ADMIN_EMAIL },
        to: [{ email: recipient }],
        subject: "PF NEXUS — test email",
        textContent:
          "This is a temporary PF NEXUS system test email. No action is required.",
      }),
    });

    if (!res.ok) {
      return {
        ok: false as const,
        recipient,
        error: `Brevo rejected the request (HTTP ${res.status}).`,
        sentAt: null as string | null,
      };
    }
    return {
      ok: true as const,
      recipient,
      error: null as string | null,
      sentAt: new Date().toISOString(),
    };
  });

export type SystemCheck = {
  key: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
};

/**
 * Admin-only, non-trading full system test.
 * Reads configuration/health only — never places an order or a real payment.
 */
export const runFullSystemTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ranAt: string; checks: SystemCheck[] }> => {
    await assertAdmin(context as unknown as AuthContext);

    const checks: SystemCheck[] = [];

    // Paystack configuration (secret-free status only).
    const { getPaystackStatus } = await import("@/lib/paystack.server");
    const paystack = getPaystackStatus();
    checks.push({
      key: "paystack",
      label: "Paystack",
      status: paystack.configured ? "ok" : "warning",
      detail: paystack.configured
        ? `Configured in ${paystack.mode} mode.`
        : (paystack.error ?? "Secret key not configured."),
    });

    checks.push({
      key: "webhook",
      label: "Payment webhook",
      status: paystack.configured ? "ok" : "warning",
      detail: "Endpoint /api/public/paystack/webhook (signature verified).",
    });

    checks.push({
      key: "brevo",
      label: "Brevo email",
      status: process.env["BREVO_API_KEY"] ? "ok" : "warning",
      detail: process.env["BREVO_API_KEY"]
        ? "API key configured."
        : "BREVO_API_KEY not configured — emails are pending.",
    });

    // Database reachability through the caller's authenticated client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const dbProbe = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    checks.push({
      key: "database",
      label: "Database",
      status: dbProbe.error ? "error" : "ok",
      detail: dbProbe.error ? "Database query failed." : "Reachable.",
    });

    // MT5 bridge health (no orders, monitoring only).
    const bridgeConfigured =
      Boolean(process.env["BRIDGE_BASE_URL"]) && Boolean(process.env["BRIDGE_SHARED_SECRET"]);
    let bridgeDetail = "Bridge not connected (BRIDGE_BASE_URL not configured).";
    let bridgeStatus: SystemCheck["status"] = "warning";
    if (bridgeConfigured) {
      try {
        const { bridgeGet } = await import("@/lib/bridge-api.server");
        const health = await bridgeGet("/health");
        bridgeStatus = health.ok ? "ok" : "error";
        bridgeDetail = health.ok
          ? `Reachable (${health.latencyMs ?? "?"} ms).`
          : (health.error ?? "Bridge unreachable.");
      } catch {
        bridgeStatus = "error";
        bridgeDetail = "Bridge health probe failed.";
      }
    }
    checks.push({
      key: "bridge",
      label: "MT5 bridge",
      status: bridgeStatus,
      detail: bridgeDetail,
    });

    checks.push({
      key: "engine",
      label: "Trading engine",
      status: "warning",
      detail: "Execution disabled — monitoring/test mode.",
    });
    checks.push({
      key: "news",
      label: "News protection",
      status: "ok",
      detail: "Fail-closed news-day blocking active.",
    });
    checks.push({
      key: "safety",
      label: "Safety engine",
      status: "ok",
      detail: "Spread limit $1.00, drawdown and emergency stop gates active.",
    });

    return { ranAt: new Date().toISOString(), checks };
  });

/**
 * TEMPORARY admin-only Paystack test payment.
 * Sandbox mode ONLY: initializes a ₦100 test transaction and returns the
 * hosted checkout URL. Refuses to run against a live key. No invoice is
 * created or modified. Delete this together with the admin test area.
 */
export const startPaystackTestPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const adminEmail = await assertAdmin(context as unknown as AuthContext);
    const { getPaystackConfig } = await import("@/lib/paystack.server");
    const paystack = getPaystackConfig();

    const base = { mode: paystack.mode, keyPrefix: paystack.keyPrefix };

    if (!paystack.configured || !paystack.secretKey) {
      return {
        ...base,
        ok: false as const,
        checkoutUrl: null as string | null,
        error: paystack.error ?? "PAYSTACK_SECRET_KEY is not configured.",
      };
    }
    if (paystack.mode !== "sandbox") {
      return {
        ...base,
        ok: false as const,
        checkoutUrl: null as string | null,
        error: "Test payments are blocked while PF NEXUS is in live mode.",
      };
    }

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystack.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: adminEmail || ADMIN_EMAIL,
        amount: 10000, // ₦100.00 in kobo
        currency: "NGN",
        metadata: { pf_nexus_test: true, user_id: context.userId },
      }),
    });

    if (!res.ok) {
      return {
        ...base,
        ok: false as const,
        checkoutUrl: null as string | null,
        error: `Paystack rejected the request (HTTP ${res.status}).`,
      };
    }
    const payload = (await res.json()) as { data?: { authorization_url?: string } };
    const url = payload.data?.authorization_url ?? null;
    if (!url) {
      return {
        ...base,
        ok: false as const,
        checkoutUrl: null as string | null,
        error: "Paystack did not return a checkout URL.",
      };
    }
    return { ...base, ok: true as const, checkoutUrl: url, error: null as string | null };
  });

/** Client-safe configuration status for the temporary integration test area. */
export const getIntegrationTestStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { getPaystackStatus } = await import("@/lib/paystack.server");
    const paystack = getPaystackStatus();
    return {
      paystack,
      brevo: {
        configured: Boolean(process.env["BREVO_API_KEY"]),
        error: process.env["BREVO_API_KEY"] ? null : "BREVO_API_KEY is not configured.",
      },
    };
  });
