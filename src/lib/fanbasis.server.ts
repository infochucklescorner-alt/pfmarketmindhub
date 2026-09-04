// PF NEXUS — server-only FanBasis (Commas) configuration.
// The API key is read from the server environment ONLY and must never reach the
// browser, client env vars or source control.
//
// Env var:
//   FANBASIS_API_KEY   FanBasis public-api key (server secret)

export const FANBASIS_CHECKOUT_ENDPOINT =
  "https://www.fanbasis.com/public-api/checkout-sessions";

export type FanbasisConfig = {
  configured: boolean;
  error: string | null;
  /** Present only when configured. Never return this to the client. */
  apiKey: string | null;
};

/** Reads the FanBasis configuration. Call inside server handlers only. */
export function getFanbasisConfig(): FanbasisConfig {
  const key = (process.env["FANBASIS_API_KEY"] ?? "").trim();
  if (!key) {
    return {
      configured: false,
      error: "FanBasis is not connected (FANBASIS_API_KEY is not configured).",
      apiKey: null,
    };
  }
  return { configured: true, error: null, apiKey: key };
}

/** Client-safe view — never contains key material. */
export function getFanbasisStatus() {
  const { configured, error } = getFanbasisConfig();
  return { configured, error };
}
