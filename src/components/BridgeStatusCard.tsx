import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, PlugZap, RefreshCw, Signal } from "lucide-react";
import { useState } from "react";

import { getBridgeHealth, getBridgeQuote } from "@/lib/bridge.functions";
import {
  BRIDGE_POLL_INTERVAL_MS,
  BRIDGE_SYMBOLS,
  DEFAULT_BRIDGE_SYMBOL,
} from "@/lib/bridge-config";
import { MIN_SPREAD_THRESHOLD_USD } from "@/lib/protection";
import type { BridgeQuote } from "@/lib/bridge-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function BridgeStatusCard({
  lastHeartbeatAt,
  onQuote,
}: {
  lastHeartbeatAt?: string | null;
  onQuote?: (quote: BridgeQuote) => void;
}) {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState(DEFAULT_BRIDGE_SYMBOL);

  const health = useQuery({
    queryKey: ["bridge-health"],
    queryFn: () => getBridgeHealth(),
    refetchInterval: BRIDGE_POLL_INTERVAL_MS,
  });

  const quote = useQuery({
    queryKey: ["bridge-quote", symbol],
    queryFn: async () => {
      const result = await getBridgeQuote({ data: { symbol } });
      onQuote?.(result);
      return result;
    },
    refetchInterval: BRIDGE_POLL_INTERVAL_MS,
  });

  const configured = health.data?.configured ?? false;
  const online = Boolean(health.data?.reachable && health.data?.mt5Connected);
  const spread = quote.data?.spreadPrice ?? null;
  const spreadBlocked = spread == null || spread > MIN_SPREAD_THRESHOLD_USD;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bridge-health"] });
    queryClient.invalidateQueries({ queryKey: ["bridge-quote"] });
    queryClient.invalidateQueries({ queryKey: ["bridge-status"] });
  };

  return (
    <Card className={cn("border-border/60", online ? "border-profit/40" : "border-border/60")}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <PlugZap className={cn("h-4 w-4", online ? "text-profit" : "text-muted-foreground")} />
          MT5 bridge
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
            Trading execution disabled
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={health.isFetching || quote.isFetching}
            aria-label="Refresh bridge status"
          >
            <RefreshCw
              className={cn("h-4 w-4", (health.isFetching || quote.isFetching) && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {health.isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !configured ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-5 text-center">
            <p className="font-display text-lg font-semibold text-muted-foreground">
              Bridge not connected
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
              No bridge endpoint is configured yet. Once your self-hosted MT5 bridge is
              deployed and its base URL is set server-side, live health and quote telemetry
              appear here. Trading execution stays disabled either way.
            </p>
          </div>
        ) : (
          <>
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "rounded-xl border px-4 py-4",
                online ? "border-profit/40 bg-profit/5" : "border-loss/40 bg-loss/5",
              )}
            >
              <p
                className={cn(
                  "font-display text-xl font-semibold tracking-wide",
                  online ? "text-profit" : "text-loss",
                )}
              >
                {online ? "BRIDGE CONNECTED" : "BRIDGE NOT CONNECTED"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {health.data?.error ??
                  (online
                    ? "Monitoring only — no orders are sent from this platform."
                    : "Failing closed: automated trading is blocked while the bridge is unreachable.")}
              </p>
            </div>

            <div className="mt-4">
              <Row
                label="Reachable"
                value={
                  <span className={health.data?.reachable ? "text-profit" : "text-loss"}>
                    {health.data?.reachable ? "Yes" : "No"}
                  </span>
                }
              />
              <Row
                label="MT5 terminal"
                value={
                  <span className={health.data?.mt5Connected ? "text-profit" : "text-loss"}>
                    {health.data?.mt5Connected ? "Connected" : "Disconnected"}
                  </span>
                }
              />
              <Row
                label={
                  <span className="flex items-center gap-1.5">
                    <Signal className="h-3.5 w-3.5" /> Latency
                  </span>
                }
                value={health.data?.latencyMs != null ? `${health.data.latencyMs} ms` : "—"}
              />
              <Row
                label="Last heartbeat"
                value={
                  lastHeartbeatAt ? new Date(lastHeartbeatAt).toLocaleTimeString() : "—"
                }
              />
              <Row
                label="Terminal build"
                value={health.data?.terminalBuild ?? "—"}
              />
            </div>
          </>
        )}

        {/* Quotes */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Live quote
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Select symbol">
              {BRIDGE_SYMBOLS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === symbol ? "default" : "outline"}
                  onClick={() => setSymbol(s)}
                  aria-pressed={s === symbol}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {quote.isLoading ? (
            <Skeleton className="mt-3 h-24 w-full" />
          ) : !configured || !quote.data?.reachable ? (
            <p className="mt-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-4 text-xs text-muted-foreground">
              No live quotes available — bridge not connected. Spread protection fails closed
              and blocks trading.
            </p>
          ) : quote.data.stale ? (
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-loss/40 bg-loss/5 px-4 py-4 text-xs text-loss">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Quote data is stale for {quote.data.symbol}. Treating spread as blocked.
            </p>
          ) : (
            <div className="mt-3">
              <Row label="Symbol" value={quote.data.symbol} />
              <Row label="Bid" value={quote.data.bid?.toFixed(quote.data.digits ?? 5) ?? "—"} />
              <Row label="Ask" value={quote.data.ask?.toFixed(quote.data.digits ?? 5) ?? "—"} />
              <Row
                label="Spread (price)"
                value={
                  <span className={spreadBlocked ? "text-loss" : "text-profit"}>
                    ${spread?.toFixed(2) ?? "—"}
                  </span>
                }
              />
              <Row label="Spread (points)" value={quote.data.spreadPoints ?? "—"} />
              <Row label="Maximum spread" value={`$${MIN_SPREAD_THRESHOLD_USD.toFixed(2)}`} />
              <Row
                label="Quote time"
                value={
                  quote.data.quotedAt
                    ? new Date(quote.data.quotedAt).toLocaleTimeString()
                    : "—"
                }
              />
              <Row
                label="Spread protection"
                value={
                  <span className={spreadBlocked ? "text-loss" : "text-profit"}>
                    {spreadBlocked ? "BLOCKED" : "ALLOWED"}
                  </span>
                }
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
