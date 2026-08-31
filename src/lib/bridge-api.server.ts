// Server-only API client for the self-hosted PF NEXUS MT5 bridge.
// Requests are signed with BRIDGE_SHARED_SECRET (HMAC-SHA256 over
// `${timestamp}.${method}.${path}.${body}`). Never import from client code.
// MONITORING ONLY — this client exposes no order-execution routes.

import { createHmac } from "node:crypto";

const REQUEST_TIMEOUT_MS = 5_000;

export type BridgeCallResult<T> = {
  configured: boolean;
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  data: T | null;
  /** Safe summary — never contains secrets or credentials. */
  error: string | null;
};

function safeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") return "Bridge request timed out";
    return "Bridge unreachable";
  }
  return "Bridge unreachable";
}

export async function bridgeGet<T>(path: string): Promise<BridgeCallResult<T>> {
  const baseUrl = process.env["BRIDGE_BASE_URL"];
  const secret = process.env["BRIDGE_SHARED_SECRET"];

  if (!baseUrl) {
    return {
      configured: false,
      ok: false,
      status: null,
      latencyMs: null,
      data: null,
      error: null,
    };
  }
  if (!secret) {
    return {
      configured: true,
      ok: false,
      status: null,
      latencyMs: null,
      data: null,
      error: "Bridge authentication is not configured",
    };
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.GET.${path}.`, "utf8")
    .digest("hex");

  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      method: "GET",
      headers: {
        "x-bridge-timestamp": timestamp,
        "x-bridge-signature": signature,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - started;

    if (!res.ok) {
      console.log(
        JSON.stringify({ scope: "bridge.client", event: "http_error", path, status: res.status }),
      );
      return {
        configured: true,
        ok: false,
        status: res.status,
        latencyMs,
        data: null,
        error: res.status === 401 ? "Bridge rejected authentication" : `Bridge error ${res.status}`,
      };
    }

    const data = (await res.json()) as T;
    return { configured: true, ok: true, status: res.status, latencyMs, data, error: null };
  } catch (err) {
    console.log(JSON.stringify({ scope: "bridge.client", event: "failure", path }));
    return {
      configured: true,
      ok: false,
      status: null,
      latencyMs: Date.now() - started,
      data: null,
      error: safeError(err),
    };
  }
}
