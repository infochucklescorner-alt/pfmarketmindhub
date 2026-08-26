import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listBots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bots")
      .select(
        "id, name, slug, description, strategy, risk_level, min_deposit, monthly_price_cents",
      )
      .eq("is_active", true)
      .order("monthly_price_cents", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

export const listActivations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bot_activations")
      .select(
        "id, status, created_at, bot_id, mt5_account_id, bots(name, slug, strategy, risk_level), mt5_accounts(label)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const activateBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        botId: z.string().uuid(),
        mt5AccountId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: activation, error } = await context.supabase
      .from("bot_activations")
      .insert({
        user_id: context.userId,
        bot_id: data.botId,
        mt5_account_id: data.mt5AccountId,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: riskError } = await context.supabase.from("risk_settings").insert({
      user_id: context.userId,
      activation_id: activation.id,
    });
    if (riskError) throw new Error(riskError.message);

    return { id: activation.id };
  });

export const setActivationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        activationId: z.string().uuid(),
        status: z.enum(["active", "paused", "stopped"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bot_activations")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.activationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
