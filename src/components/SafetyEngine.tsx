import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Gauge, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { emergencyStop } from "@/lib/risk.functions";
import { MIN_SPREAD_THRESHOLD_USD } from "@/lib/protection";
import { BRIDGE_HEARTBEAT_TIMEOUT_SECONDS } from "@/lib/bridge.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type BridgeRow = {
  id: string;
  bridge_id: string;
  status: string;
  mt5_connected: boolean;
  execution_enabled: boolean;
  last_heartbeat_at: string | null;
  last_quote_at: string | null;
  symbol: string | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  last_error: string | null;
};

export function isBridgeOnline(row: BridgeRow | undefined, now = Date.now()) {
  if (!row?.last_heartbeat_at) return false;
  const age = (now - new Date(row.last_heartbeat_at).getTime()) / 1000;
  return row.mt5_connected && age <= BRIDGE_HEARTBEAT_TIMEOUT_SECONDS;
}

/** Fail-closed evaluation of every guardrail. */
export function evaluateSafety(opts: {
  bridge: BridgeRow | undefined;
  newsRestricted: boolean;
  tradingEnabled: boolean;
}) {
  const online = isBridgeOnline(opts.bridge);
  const spread = opts.bridge?.spread != null ? Number(opts.bridge.spread) : null;
  const reasons: string[] = [];

  if (!online) reasons.push("MT5 bridge offline or heartbeat stale");
  if (opts.newsRestricted) reasons.push("High-impact news day block active");
  if (!opts.tradingEnabled) reasons.push("Bots disabled by you");
  if (spread != null && spread > MIN_SPREAD_THRESHOLD_USD) {
    reasons.push(`Spread ${spread.toFixed(2)} above the ${MIN_SPREAD_THRESHOLD_USD.toFixed(2)} limit`);
  }

  return { online, spread, allowed: reasons.length === 0, reasons };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SafetyEngineCard({
  bridge,
  newsRestricted,
  newsEvent,
  newsDate,
  tradingEnabled,
  invalidateKeys = [["dashboard-overview"], ["bridge-status"]],
}: {
  bridge: BridgeRow | undefined;
  newsRestricted: boolean;
  newsEvent: string | null;
  newsDate: string;
  tradingEnabled: boolean;
  invalidateKeys?: string[][];
}) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const safety = evaluateSafety({ bridge, newsRestricted, tradingEnabled });

  const stop = useMutation({
    mutationFn: () => emergencyStop(),
    onSuccess: () => {
      toast.success("Emergency stop engaged. All bots paused and trading disabled.");
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card className={cn("border-border/60", safety.allowed ? "border-profit/40" : "border-loss/30")}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          {safety.allowed ? (
            <ShieldCheck className="h-4 w-4 text-profit" />
          ) : (
            <ShieldOff className="h-4 w-4 text-loss" />
          )}
          Safety Engine
        </CardTitle>
        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
          Monitoring / test mode
        </Badge>
      </CardHeader>
      <CardContent>
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "rounded-xl border px-4 py-4",
            safety.allowed
              ? "border-profit/40 bg-profit/5"
              : "border-loss/40 bg-loss/5",
          )}
        >
          <p
            className={cn(
              "font-display text-2xl font-semibold tracking-wide",
              safety.allowed ? "text-profit" : "text-loss",
            )}
          >
            {safety.allowed ? "ALLOW" : "BLOCK"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {safety.allowed
              ? "All guardrails satisfied. Execution still disabled until the MT5 bridge is verified."
              : safety.reasons.join(" · ")}
          </p>
        </div>

        <div className="mt-4">
          <Row
            label="MT5 bridge"
            value={
              <span className={safety.online ? "text-profit" : "text-loss"}>
                {safety.online ? "Connected" : "Disconnected"}
              </span>
            }
          />
          <Row
            label="Last heartbeat"
            value={
              bridge?.last_heartbeat_at
                ? new Date(bridge.last_heartbeat_at).toLocaleTimeString()
                : "—"
            }
          />
          <Row
            label="Last quote"
            value={
              bridge?.last_quote_at
                ? `${bridge.symbol ?? "—"} · ${new Date(bridge.last_quote_at).toLocaleTimeString()}`
                : "—"
            }
          />
          <Row
            label="Bid / Ask"
            value={
              bridge?.bid != null && bridge?.ask != null
                ? `${Number(bridge.bid).toFixed(5)} / ${Number(bridge.ask).toFixed(5)}`
                : "—"
            }
          />
          <Row
            label={
              <span className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" /> Current spread
              </span>
            }
            value={
              safety.spread == null ? (
                <span className="text-muted-foreground">Unavailable</span>
              ) : (
                <span
                  className={
                    safety.spread > MIN_SPREAD_THRESHOLD_USD ? "text-loss" : "text-profit"
                  }
                >
                  ${safety.spread.toFixed(2)}
                </span>
              )
            }
          />
          <Row label="Maximum spread" value={`$${MIN_SPREAD_THRESHOLD_USD.toFixed(2)}`} />
          <Row
            label={
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> News-day block
              </span>
            }
            value={
              newsRestricted ? (
                <span className="text-loss">{newsEvent ?? `Blocked ${newsDate}`}</span>
              ) : (
                <span className="text-profit">Clear</span>
              )
            }
          />
          {bridge?.last_error ? (
            <Row
              label="Last bridge error"
              value={<span className="text-loss">{bridge.last_error}</span>}
            />
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            Order execution is disabled platform-wide until the bridge is fully verified.
          </p>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={stop.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <ShieldOff className="h-4 w-4" />
            Emergency stop
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Engage emergency stop?</AlertDialogTitle>
            <AlertDialogDescription>
              This immediately disables trading on every risk profile and pauses all bot
              activations on your account. You can re-arm them manually afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => stop.mutate()}>
              Stop everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
