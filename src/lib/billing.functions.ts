import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plans")
      .select("id, name, slug, price_cents, interval, max_bots, max_accounts, features")
      .eq("is_active", true)
      .order("price_cents", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_subscriptions")
      .select(
        "id, status, current_period_end, created_at, plans(name, slug, price_cents, interval)",
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

// Placeholder checkout: records the intended plan as a pending subscription.
// A real payment provider (e.g. Stripe) will replace this in a later step.
export const subscribeToPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ planId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase
        .from("user_subscriptions")
        .update({
          plan_id: data.planId,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id };
    }

    const { data: created, error } = await context.supabase
      .from("user_subscriptions")
      .insert({
        user_id: context.userId,
        plan_id: data.planId,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("user_subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
