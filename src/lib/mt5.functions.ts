import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const connectMt5Account = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        label: z.string().trim().min(1).max(80),
        brokerServer: z.string().trim().min(1).max(120),
        accountLogin: z.string().trim().min(1).max(60),
        password: z.string().min(1).max(120),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env["MT5_CREDENTIALS_KEY"];
    if (!secret) throw new Error("Server is missing the credentials encryption key");

    const { encryptMt5Password } = await import("./mt5-crypto.server");
    const ciphertext = await encryptMt5Password(data.password, secret);

    const { data: account, error } = await context.supabase
      .from("mt5_accounts")
      .insert({
        user_id: context.userId,
        label: data.label,
        broker_server: data.brokerServer,
        account_login: data.accountLogin,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: secretError } = await context.supabase
      .from("mt5_account_secrets")
      .insert({
        account_id: account.id,
        user_id: context.userId,
        password_ciphertext: ciphertext,
      });
    if (secretError) {
      await context.supabase.from("mt5_accounts").delete().eq("id", account.id);
      throw new Error(secretError.message);
    }

    return { id: account.id };
  });

export const listMt5Accounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mt5_accounts")
      .select(
        "id, label, broker_server, account_login, status, balance, equity, currency, last_synced_at, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const disconnectMt5Account = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ accountId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("mt5_accounts")
      .delete()
      .eq("id", data.accountId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
