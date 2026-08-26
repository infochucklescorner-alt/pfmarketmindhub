import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Verify admin role through the user-scoped client first (users can only
    // ever read their own role rows, which is enough to prove membership).
    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (rolesError) throw new Error(rolesError.message);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      throw new Response("Forbidden", { status: 403 });
    }

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
