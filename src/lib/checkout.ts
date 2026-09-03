import { supabase } from "@/integrations/supabase/client";
import { createPaystackCheckout } from "@/lib/monetization.functions";

export type CheckoutResult = {
  checkoutUrl: string | null;
  alreadyPaid: boolean;
  configured: boolean;
};

/**
 * Starts a Paystack checkout for an invoice.
 *
 * Primary path is the Supabase Edge Function `create-paystack-checkout-v2`, so
 * Paystack secrets stay inside Supabase. If that function is unavailable, we
 * fall back to the existing authenticated server function. No provider secret
 * is ever present in client code.
 */
export async function startInvoiceCheckout(invoiceId: string): Promise<CheckoutResult> {
  try {
    const { data, error } = await supabase.functions.invoke<Record<string, unknown>>(
      "create-paystack-checkout-v2",
      { body: { invoice_id: invoiceId } },
    );
    if (!error && data) {
      const nested = (data["data"] ?? {}) as Record<string, unknown>;
      const url =
        (data["authorization_url"] as string | undefined) ??
        (data["checkout_url"] as string | undefined) ??
        (nested["authorization_url"] as string | undefined) ??
        null;
      if (url) return { checkoutUrl: url, alreadyPaid: false, configured: true };
      if (data["already_paid"] === true) {
        return { checkoutUrl: null, alreadyPaid: true, configured: true };
      }
    }
  } catch {
    // fall through to the server-function path
  }

  const result = await createPaystackCheckout({ data: { invoiceId } });
  return {
    checkoutUrl: result.checkoutUrl ?? null,
    alreadyPaid: Boolean(result.alreadyPaid),
    configured: Boolean(result.configured),
  };
}
