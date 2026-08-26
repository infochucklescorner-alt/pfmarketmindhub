import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { listRiskSettings, saveRiskSettings } from "@/lib/risk.functions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/risk")({
  head: () => ({
    meta: [
      { title: "Risk Controls — PF MARKET MIND" },
      { name: "description", content: "Configure per-bot risk limits: risk per trade, daily loss caps, drawdown protection, and position limits." },
      { property: "og:title", content: "Risk Controls — PF MARKET MIND" },
      { property: "og:description", content: "Configure per-bot risk limits: risk per trade, daily loss caps, drawdown protection, and position limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RiskPage,
});

type RiskRow = {
  id: string;
  activation_id: string;
  risk_per_trade_pct: number;
  max_daily_loss_pct: number;
  max_drawdown_pct: number;
  max_open_positions: number;
  trading_enabled: boolean;
  bot_activations: {
    status: string;
    bots: { name: string } | null;
    mt5_accounts: { label: string } | null;
  } | null;
};

function RiskCard({ row }: { row: RiskRow }) {
  const queryClient = useQueryClient();
  const [riskPerTrade, setRiskPerTrade] = useState(String(row.risk_per_trade_pct));
  const [maxDailyLoss, setMaxDailyLoss] = useState(String(row.max_daily_loss_pct));
  const [maxDrawdown, setMaxDrawdown] = useState(String(row.max_drawdown_pct));
  const [maxPositions, setMaxPositions] = useState(String(row.max_open_positions));
  const [tradingEnabled, setTradingEnabled] = useState(row.trading_enabled);

  useEffect(() => {
    setRiskPerTrade(String(row.risk_per_trade_pct));
    setMaxDailyLoss(String(row.max_daily_loss_pct));
    setMaxDrawdown(String(row.max_drawdown_pct));
    setMaxPositions(String(row.max_open_positions));
    setTradingEnabled(row.trading_enabled);
  }, [row]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveRiskSettings({
        data: {
          activationId: row.activation_id,
          riskPerTradePct: Number(riskPerTrade),
          maxDailyLossPct: Number(maxDailyLoss),
          maxDrawdownPct: Number(maxDrawdown),
          maxOpenPositions: Number(maxPositions),
          tradingEnabled,
        },
      }),
    onSuccess: () => {
      toast.success("Risk settings saved.");
      void queryClient.invalidateQueries({ queryKey: ["risk-settings"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-display text-base">
            {row.bot_activations?.bots?.name ?? "Bot"} ·{" "}
            <span className="text-muted-foreground">
              {row.bot_activations?.mt5_accounts?.label ?? "No account"}
            </span>
          </CardTitle>
          <StatusBadge status={row.bot_activations?.status ?? "pending"} />
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label>Risk per trade (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              required
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Max daily loss (%)</Label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              max="50"
              required
              value={maxDailyLoss}
              onChange={(e) => setMaxDailyLoss(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Max drawdown (%)</Label>
            <Input
              type="number"
              step="1"
              min="1"
              max="90"
              required
              value={maxDrawdown}
              onChange={(e) => setMaxDrawdown(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Max open positions</Label>
            <Input
              type="number"
              step="1"
              min="1"
              max="50"
              required
              value={maxPositions}
              onChange={(e) => setMaxPositions(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3 sm:col-span-2 lg:col-span-3">
            <div>
              <p className="text-sm font-medium text-foreground">Trading enabled</p>
              <p className="text-xs text-muted-foreground">
                Master switch for this bot. Takes effect once the execution service is
                live.
              </p>
            </div>
            <Switch checked={tradingEnabled} onCheckedChange={setTradingEnabled} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RiskPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["risk-settings"],
    queryFn: () => listRiskSettings(),
  });

  return (
    <div>
      <PageHeader
        title="Risk Controls"
        description="Per-bot risk limits. These guardrails are enforced by the execution service before any order is placed."
      />

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing to configure yet"
          description="Risk controls appear here once you activate a bot on one of your MT5 accounts."
          action={
            <Button asChild variant="outline">
              <Link to="/bots">Browse bots</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {(data as RiskRow[]).map((row) => (
            <RiskCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
