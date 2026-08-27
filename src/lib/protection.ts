// Client-safe protection rules for the dashboard.
// These are display-level guardrails only — no trade execution happens yet.

/** Minimum acceptable spread threshold, in account currency (USD). */
export const MIN_SPREAD_THRESHOLD_USD = 1;

/**
 * High-impact news days (UTC, YYYY-MM-DD) on which automated trading is
 * blocked. Static for now; the execution service will supply a live calendar.
 */
export const NEWS_RESTRICTED_DAYS: Record<string, string> = {};

export function getNewsRestriction(now: Date = new Date()) {
  const key = now.toISOString().slice(0, 10);
  const event = NEWS_RESTRICTED_DAYS[key];
  return {
    date: key,
    restricted: Boolean(event),
    event: event ?? null,
  };
}
