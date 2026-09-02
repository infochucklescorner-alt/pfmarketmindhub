import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * PF NEXUS non-destructive diagnostics.
 *
 * Reports configuration status only — never key material, never MT5
 * credentials, never bridge secrets. Executes no trades and no payments.
 */

export type PfNexusDiagnostics = {
  environment: "development" | "production";
  payments: {
    configured: boolean;
    mode: "sandbox" | "live";
    keyPrefix: string | null;
    error: string | null;
    webhookPath: string;
  };
  bridge: {
    /** BRIDGE_BASE_URL present (value is never returned). */
    baseUrlConfigured: boolean;
    sharedSecretConfigured: boolean;
    /** PF NEXUS never runs MT5 itself — the bridge is an external service. */
    externalService: true;
    heartbeatPath: string;
  };
  execution: {
    /** Hard-coded false during development. No order route exists. */
    enabled: false;
    mode: "monitoring";
  };
  /** Mandatory gates that must pass before any future order execution. */
  safetyGates: string[];
};

export const getPfNexusDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<PfNexusDiagnostics> => {
    const { getPaystackStatus } = await import("@/lib/paystack.server");
    const paystack = getPaystackStatus();

    return {
      environment: process.env["NODE_ENV"] === "production" ? "production" : "development",
      payments: { ...paystack, webhookPath: "/api/public/paystack/webhook" },
      bridge: {
        baseUrlConfigured: Boolean(process.env["BRIDGE_BASE_URL"]),
        sharedSecretConfigured: Boolean(process.env["BRIDGE_SHARED_SECRET"]),
        externalService: true,
        heartbeatPath: "/api/public/bridge/heartbeat",
      },
      execution: { enabled: false, mode: "monitoring" },
      safetyGates: [
        "News-day blocking",
        "Maximum spread $1.00",
        "Drawdown & risk-per-trade limits",
        "Trading session window",
        "Risk/reward minimum",
        "Emergency shutdown",
        "Order idempotency key",
      ],
    };
  });
