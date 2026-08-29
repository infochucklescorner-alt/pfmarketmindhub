import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bot,
  CreditCard,
  Plus,
  Server,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { getDashboardOverview } from "@/lib/dashboard.functions";
import { getBridgeStatus } from "@/lib/bridge.functions";
import { SafetyEngineCard, evaluateSafety, type BridgeRow } from "@/components/SafetyEngine";
import { setTradingEnabled } from "@/lib/risk.functions";
import { getNewsRestriction } from "@/lib/protection";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PF MARKET MIND" },
      {
        name: "description",
        content:
          "Monitor connected trading accounts, bot status, protection rules, and trade activity.",
      },
      { property: "og:title", content: "Dashboard — PF MARKET MIND" },
      {
        property: "og:description",
        content:
          "Monitor connected trading accounts, bot status, protection rules, and trade activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function DashboardPage() {
  const queryClient = useQueryClient();
  const news = getNewsRestriction();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => getDashboardOverview(),
  });

  const bridgeQuery = useQuery({
    queryKey: ["bridge-status"],
    queryFn: () => getBridgeStatus(),
    refetchInterval: 60_000,
  });
  const primaryBridge = ((bridgeQuery.data ?? []) as unknown as BridgeRow[])[0];

  const toggleTrading = useMutation({
    mutationFn: (enabled: boolean) => setTradingEnabled({ data: { enabled } }),
    onSuccess: (res) => {
      toast.success(
        res.enabled
          ? "Bots armed. Execution stays paused until the MT5 service is live."
          : "Bots disabled.",
      );
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Your automated trading at a glance." />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load your dashboard"
          description={
            error instanceof Error ? error.message : "Something went wrong. Try again."
          }
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const activeBots = data.activations.filter((a) => a.status === "active").length;
  const connectedAccounts = data.accounts.filter((a) => a.status === "connected").length;
  const safety = evaluateSafety({
    bridge: primaryBridge,
    newsRestricted: news.restricted,
    tradingEnabled: data.tradingEnabled,
  });
  const tradingAllowed = safety.allowed;
  const totalBalance = data.accounts.reduce((s2, a) => s2 + Number(a.balance ?? 0), 0);
  const totalEquity = data.accounts.reduce((s2, a) => s2 + Number(a.equity ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your automated trading at a glance."
        actions={
          <Button asChild>
            <Link to="/accounts">
              <Plus className="h-4 w-4" />
              Connect trading account
            </Link>
          </Button>
        }
      />

      <div
        role="status"
        className="mb-6 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-foreground"
      >
        <span className="font-medium text-warning">Execution service offline.</span>{" "}
        Trade execution is disabled at this stage. Accounts stay in{" "}
        <span className="font-medium text-foreground">pending</span> and no orders are
        placed — this dashboard is the foundation the MT5 execution service plugs into.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Server}
          label="Connected Accounts"
          value={connectedAccounts}
          hint={`${data.accounts.length} total account${data.accounts.length === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={Bot}
          label="Bot Status"
          value={data.tradingEnabled ? "Enabled" : "Disabled"}
          hint={`${activeBots} active activation${activeBots === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={Activity}
          label="Today's Trades"
          value={data.todaysTrades}
          hint={`${formatMoney(data.todaysProfit)} today`}
        />
        <StatCard
          icon={ShieldCheck}
          label="Trading Permission"
          value={tradingAllowed ? "ALLOW" : "BLOCK"}
          hint={safety.reasons[0] ?? "All guardrails satisfied"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Balance"
          value={formatMoney(totalBalance)}
          hint="Across connected accounts"
        />
        <StatCard
          icon={Wallet}
          label="Equity"
          value={formatMoney(totalEquity)}
          hint={`Floating ${formatMoney(data.floatingProfit)}`}
        />
        <StatCard
          icon={Activity}
          label="Daily P&L"
          value={formatMoney(data.todaysProfit)}
          hint={`${data.todaysTrades} trade${data.todaysTrades === 1 ? "" : "s"} closed today`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Trading accounts */}
        <Card className="border-border/60">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base">Trading accounts</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link to="/accounts">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.accounts.length === 0 ? (
              <EmptyState
                icon={Server}
                title="No trading accounts yet"
                description="Connect your first trading account to start automating. Credentials are encrypted server-side and never exposed to the browser."
                action={
                  <Button asChild variant="outline">
                    <Link to="/accounts">Connect trading account</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.accounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {account.label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {account.broker_server}
                        {account.balance != null
                          ? ` · ${formatMoney(Number(account.balance), account.currency ?? "USD")}`
                          : ""}
                      </p>
                    </div>
                    <StatusBadge status={account.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Bot control */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-base">Bot control</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
              <div className="min-w-0">
                <label
                  htmlFor="bot-master-toggle"
                  className="text-sm font-medium text-foreground"
                >
                  Master bot switch
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.riskSettings.length === 0
                    ? "Activate a bot first to enable this switch."
                    : "Arms every activated bot. Orders remain paused while the execution service is offline."}
                </p>
              </div>
              <Switch
                id="bot-master-toggle"
                aria-label="Enable bots"
                checked={data.tradingEnabled}
                disabled={data.riskSettings.length === 0 || toggleTrading.isPending}
                onCheckedChange={(checked) => toggleTrading.mutate(checked)}
              />
            </div>

            {data.activations.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={Bot}
                  title="No bots activated"
                  description="Browse the bot catalog and activate a strategy on one of your connected accounts."
                  action={
                    <Button asChild variant="outline">
                      <Link to="/bots">Browse bots</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {data.activations.map((activation) => (
                  <li
                    key={activation.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {activation.bots?.name ?? "Unknown bot"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {activation.mt5_accounts?.label ?? "No account linked"}
                      </p>
                    </div>
                    <StatusBadge status={activation.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>

      <div className="mt-6">
        <SafetyEngineCard
          bridge={primaryBridge}
          newsRestricted={news.restricted}
          newsEvent={news.event}
          newsDate={news.date}
          tradingEnabled={data.tradingEnabled}
        />
      </div>

      {/* Recent activity */}
      <Card className="mt-6 border-border/60">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-base">Recent trade activity</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/history">Full history</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentTrades.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No trades yet"
              description="Once the execution service is live and your bots are armed, closed trades appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-right">Close</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Closed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell className="capitalize">{trade.side}</TableCell>
                      <TableCell className="text-right">{trade.volume}</TableCell>
                      <TableCell className="text-right">{trade.open_price}</TableCell>
                      <TableCell className="text-right">
                        {trade.close_price ?? "—"}
                      </TableCell>
                      <TableCell
                        className={
                          Number(trade.profit) >= 0
                            ? "text-right text-profit"
                            : "text-right text-loss"
                        }
                      >
                        {formatMoney(Number(trade.profit ?? 0))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {trade.closed_at
                          ? new Date(trade.closed_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.subscription ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {data.subscription.plans?.name ?? "Plan"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.subscription.plans
                    ? `${formatMoney(data.subscription.plans.price_cents / 100)}/month`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={data.subscription.status} />
                <Button asChild variant="outline" size="sm">
                  <Link to="/billing">Manage</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                No subscription yet. Choose a plan to unlock bot activations.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/billing">View plans</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" />
        Net profit to date: {formatMoney(data.realizedProfit + data.floatingProfit)} across{" "}
        {data.totalTrades} closed trades and {data.openPositions} open positions.
      </p>
    </div>
  );
}
