// PF NEXUS — server-only Paystack configuration.
// Secrets are read from the server environment ONLY. Never import from client code.
//
// Env vars:
//   PAYSTACK_SECRET_KEY    sk_test_... in development, sk_live_... in production
//   PAYSTACK_ENVIRONMENT   "sandbox" (default) or "live" — explicit mode switch
//
// The mode is explicit: a live key is rejected while the environment is
// "sandbox", and a test key is rejected while the environment is "live".
// This makes it impossible to accidentally charge a real card in development.

export type PaystackMode = "sandbox" | "live";

export type PaystackConfig = {
  /** True only when a usable, mode-consistent secret key is present. */
  configured: boolean;
  mode: PaystackMode;
  /** Non-secret key prefix for diagnostics, e.g. "sk_test". Never the key itself. */
  keyPrefix: string | null;
  /** Safe, non-sensitive explanation when not configured. */
  error: string | null;
  /** Present only when configured. Never return this to the client. */
  secretKey: string | null;
};

function resolveMode(): PaystackMode {
  const raw = (process.env["PAYSTACK_ENVIRONMENT"] ?? "").trim().toLowerCase();
  if (raw === "live" || raw === "production") return "live";
  if (raw === "sandbox" || raw === "test" || raw === "") return "sandbox";
  return "sandbox";
}

/** Reads and validates the Paystack configuration. Call inside handlers only. */
export function getPaystackConfig(): PaystackConfig {
  const mode = resolveMode();
  const key = (process.env["PAYSTACK_SECRET_KEY"] ?? "").trim();

  if (!key) {
    return {
      configured: false,
      mode,
      keyPrefix: null,
      error: "Payment provider not connected",
      secretKey: null,
    };
  }

  const isTest = key.startsWith("sk_test_");
  const isLive = key.startsWith("sk_live_");
  const keyPrefix = isTest ? "sk_test" : isLive ? "sk_live" : "unknown";

  if (!isTest && !isLive) {
    return {
      configured: false,
      mode,
      keyPrefix,
      error: "Paystack secret key format is not recognised",
      secretKey: null,
    };
  }
  if (mode === "sandbox" && isLive) {
    return {
      configured: false,
      mode,
      keyPrefix,
      error: "A live Paystack key is set while PF NEXUS is in test mode. Refusing to use it.",
      secretKey: null,
    };
  }
  if (mode === "live" && isTest) {
    return {
      configured: false,
      mode,
      keyPrefix,
      error: "A test Paystack key is set while PF NEXUS is in live mode. Refusing to use it.",
      secretKey: null,
    };
  }

  return { configured: true, mode, keyPrefix, error: null, secretKey: key };
}

/** Client-safe view of the configuration — never contains key material. */
export function getPaystackStatus() {
  const { configured, mode, keyPrefix, error } = getPaystackConfig();
  return { configured, mode, keyPrefix, error };
}
