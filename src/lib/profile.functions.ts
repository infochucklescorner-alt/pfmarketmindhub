import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Message that will be sent once the WhatsApp Business Cloud API is configured. */
export const WHATSAPP_WELCOME_MESSAGE =
  "YOU'RE RECEIVING THIS MESSAGE BECAUSE YOU SIGNED UP FOR PF NEXUS";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(80),
  phoneNumber: z.string().trim().min(6).max(24),
  whatsappNumber: z.string().trim().min(6).max(24),
  postalCode: z.string().trim().min(2).max(16),
  acceptedTerms: z.literal(true),
  whatsappConsent: z.boolean(),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "id, email, full_name, country, phone_number, whatsapp_number, postal_code, accepted_terms_at, whatsapp_consent, whatsapp_verification_status, profile_completed_at",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      profile: data,
      whatsappProviderConfigured: Boolean(
        process.env["WHATSAPP_ACCESS_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"],
      ),
    };
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => profileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        country: data.country,
        phone_number: data.phoneNumber,
        whatsapp_number: data.whatsappNumber,
        postal_code: data.postalCode,
        accepted_terms_at: new Date().toISOString(),
        whatsapp_consent: data.whatsappConsent,
        profile_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Marks the WhatsApp number as pending verification.
 * No message is sent until the official WhatsApp Business Cloud API is
 * configured server-side; credentials never reach the browser.
 */
export const startWhatsappVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const configured = Boolean(
      process.env["WHATSAPP_ACCESS_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"],
    );

    const { data: profile, error: readError } = await context.supabase
      .from("profiles")
      .select("whatsapp_number, whatsapp_consent")
      .eq("id", context.userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!profile?.whatsapp_number) throw new Error("Add a WhatsApp number first.");
    if (!profile.whatsapp_consent) {
      throw new Error("WhatsApp consent is required before verification.");
    }

    const { error } = await context.supabase
      .from("profiles")
      .update({ whatsapp_verification_status: "pending" })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    return {
      status: "pending" as const,
      providerConfigured: configured,
      message: configured
        ? "Verification queued."
        : "WhatsApp provider not connected yet — verification is recorded as pending and no message was sent.",
    };
  });
