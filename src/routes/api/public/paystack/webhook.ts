import { createFileRoute } from "@tanstack/react-router";

/**
 * PF NEXUS — Paystack webhook receiver.
 *
 * Auth: Paystack signs the raw body with HMAC-SHA512 using the SAME secret key
 * as the API, sent in `x-paystack-signature`. The signing key must match the
 * active environment (test key for test events, live key for live events), so
 * we reuse the validated config from paystack.server.ts.
 *
 * Idempotent: a payment reference is only recorded once; replays are no-ops.
 * This endpoint never executes trades and never returns user data.
 */

const MAX_BODY_BYTES = 64 * 1024;

function audit(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: "paystack.webhook", event, ...fields }));
}

export const Route = createFileRoute("/api/public/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getPaystackConfig } = await import("@/lib/paystack.server");
        const config = getPaystackConfig();
        if (!config.configured || !config.secretKey) {
          audit("rejected", { reason: "not_configured", mode: config.mode });
          return new Response("Not configured", { status: 503 });
        }

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return new Response("Payload Too Large", { status: 413 });
        }

        const signature = request.headers.get("x-paystack-signature") ?? "";
        const { createHmac, timingSafeEqual } = await import("node:crypto");
        const expected = createHmac("sha512", config.secretKey).update(raw, "utf8").digest();
        let provided: Buffer;
        try {
          provided = Buffer.from(signature, "hex");
        } catch {
          provided = Buffer.alloc(0);
        }
        if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
          audit("rejected", { reason: "signature" });
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: {
          event?: string;
          data?: {
            reference?: string;
            amount?: number;
            currency?: string;
            status?: string;
            metadata?: { invoice_id?: string; user_id?: string };
          };
        };
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        if (payload.event !== "charge.success" || payload.data?.status !== "success") {
          audit("ignored", { event: payload.event ?? null });
          return Response.json({ ok: true });
        }

        const reference = payload.data.reference;
        const invoiceId = payload.data.metadata?.invoice_id;
        const userId = payload.data.metadata?.user_id;
        if (!reference || !invoiceId || !userId) {
          audit("rejected", { reason: "missing_metadata" });
          return new Response("Bad Request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: skip if this provider reference was already recorded.
        const { data: existing } = await supabaseAdmin
          .from("pf_nexus_payments")
          .select("id")
          .eq("provider_reference", reference)
          .maybeSingle();
        if (existing) {
          audit("duplicate", { reference });
          return Response.json({ ok: true, duplicate: true });
        }

        const paidAt = new Date().toISOString();
        const amount = Number(payload.data.amount ?? 0) / 100;
        const currency = payload.data.currency ?? "NGN";

        const { error: paymentError } = await supabaseAdmin.from("pf_nexus_payments").insert({
          user_id: userId,
          invoice_id: invoiceId,
          amount,
          currency,
          status: "paid",
          provider: "paystack",
          provider_reference: reference,
          paid_at: paidAt,
        });
        if (paymentError) {
          audit("error", { reason: "payment_insert" });
          return new Response("Server error", { status: 500 });
        }

        await supabaseAdmin
          .from("pf_nexus_invoices")
          .update({ status: "paid", paid_at: paidAt })
          .eq("id", invoiceId)
          .eq("user_id", userId);

        audit("accepted", { reference, mode: config.mode });
        return Response.json({ ok: true });
      },
    },
  },
});
