import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Service-to-service ingest endpoint for the self-hosted PF NEXUS MT5 bridge.
 *
 * MONITORING ONLY — this endpoint accepts health/quote telemetry. There is no
 * order-execution route anywhere in the bridge or in this API.
 *
 * Auth: HMAC-SHA256 over `${timestamp}.${rawBody}` using BRIDGE_SHARED_SECRET,
 * sent as `x-bridge-signature`, with `x-bridge-timestamp` (unix seconds) to
 * bound replay. Requests are rejected before any body parsing or DB access.
 */

const MAX_BODY_BYTES = 8 * 1024;
const MAX_SKEW_SECONDS = 300;
/** Stale quotes fail closed: bridge is reported disconnected. */
const QUOTE_STALE_SECONDS = 90;

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

const payloadSchema = z.object({
  bridge_id: z.string().trim().min(3).max(64),
  mt5_account_id: z.string().uuid(),
  mt5_connected: z.boolean(),
  terminal_build: z.string().trim().max(40).optional().nullable(),
  last_error: z.string().trim().max(300).optional().nullable(),
  quote: z
    .object({
      symbol: z.string().trim().min(1).max(24),
      bid: z.number().finite().nonnegative(),
      ask: z.number().finite().nonnegative(),
      time: z.string().datetime(),
    })
    .optional()
    .nullable(),
});

/** Structured audit log — never contains credentials, secrets, or signatures. */
function audit(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: "bridge.heartbeat", event, ...fields }));
}

export const Route = createFileRoute("/api/public/bridge/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["BRIDGE_SHARED_SECRET"];
        if (!secret) return new Response("Server configuration error", { status: 500 });

        const bridgeIdHeader = request.headers.get("x-bridge-id") ?? "";
        const timestamp = request.headers.get("x-bridge-timestamp") ?? "";
        const signature = request.headers.get("x-bridge-signature") ?? "";

        if (rateLimited(bridgeIdHeader || "anonymous")) {
          audit("rate_limited", { bridge_id: bridgeIdHeader });
          return new Response("Too Many Requests", { status: 429 });
        }

        const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
        if (!/^\d{10}$/.test(timestamp) || !Number.isFinite(skew) || skew > MAX_SKEW_SECONDS) {
          audit("rejected", { reason: "timestamp", bridge_id: bridgeIdHeader });
          return new Response("Unauthorized", { status: 401 });
        }

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          audit("rejected", { reason: "body_too_large", bridge_id: bridgeIdHeader });
          return new Response("Payload Too Large", { status: 413 });
        }

        const { createHmac, timingSafeEqual } = await import("node:crypto");
        const expected = createHmac("sha256", secret)
          .update(`${timestamp}.${raw}`, "utf8")
          .digest();
        let provided: Buffer;
        try {
          provided = Buffer.from(signature, "hex");
        } catch {
          provided = Buffer.alloc(0);
        }
        if (
          provided.length !== expected.length ||
          !timingSafeEqual(provided, expected)
        ) {
          audit("rejected", { reason: "signature", bridge_id: bridgeIdHeader });
          return new Response("Unauthorized", { status: 401 });
        }

        let parsed;
        try {
          parsed = payloadSchema.parse(JSON.parse(raw));
        } catch {
          audit("rejected", { reason: "validation", bridge_id: bridgeIdHeader });
          return new Response("Bad Request", { status: 400 });
        }

        if (parsed.bridge_id !== bridgeIdHeader) {
          audit("rejected", { reason: "bridge_id_mismatch", bridge_id: bridgeIdHeader });
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: account, error: accountError } = await supabaseAdmin
          .from("mt5_accounts")
          .select("id, user_id")
          .eq("id", parsed.mt5_account_id)
          .maybeSingle();
        if (accountError) {
          audit("error", { reason: "account_lookup", bridge_id: parsed.bridge_id });
          return new Response("Server error", { status: 500 });
        }
        if (!account) {
          audit("rejected", { reason: "unknown_account", bridge_id: parsed.bridge_id });
          return new Response("Not Found", { status: 404 });
        }

        const now = new Date();
        const quote = parsed.quote ?? null;
        const quoteAge = quote
          ? (now.getTime() - new Date(quote.time).getTime()) / 1000
          : Infinity;
        const quoteFresh = quoteAge >= -MAX_SKEW_SECONDS && quoteAge <= QUOTE_STALE_SECONDS;

        // Fail closed: MT5 down or stale/missing quotes ⇒ not "connected".
        const connected = parsed.mt5_connected && quoteFresh;
        const spread = quote ? Number((quote.ask - quote.bid).toFixed(5)) : null;

        const { error: upsertError } = await supabaseAdmin.from("bridge_status").upsert(
          {
            bridge_id: parsed.bridge_id,
            user_id: account.user_id,
            mt5_account_id: account.id,
            status: connected ? "connected" : "disconnected",
            mt5_connected: parsed.mt5_connected,
            execution_enabled: false,
            last_heartbeat_at: now.toISOString(),
            last_quote_at: quote && quoteFresh ? quote.time : null,
            symbol: quote?.symbol ?? null,
            bid: quote && quoteFresh ? quote.bid : null,
            ask: quote && quoteFresh ? quote.ask : null,
            spread: quoteFresh ? spread : null,
            terminal_build: parsed.terminal_build ?? null,
            last_error: parsed.last_error ?? (quoteFresh ? null : "Quote data stale"),
            updated_at: now.toISOString(),
          },
          { onConflict: "bridge_id" },
        );
        if (upsertError) {
          audit("error", { reason: "upsert", bridge_id: parsed.bridge_id });
          return new Response("Server error", { status: 500 });
        }

        audit("accepted", {
          bridge_id: parsed.bridge_id,
          mt5_connected: parsed.mt5_connected,
          quote_fresh: quoteFresh,
          symbol: quote?.symbol ?? null,
        });

        return Response.json({
          ok: true,
          status: connected ? "connected" : "disconnected",
          execution_enabled: false,
        });
      },
    },
  },
});
