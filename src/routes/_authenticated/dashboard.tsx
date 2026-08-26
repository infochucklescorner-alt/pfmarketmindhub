import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bot, CreditCard, Server, Wallet } from "lucide-react";

import { getDashboardOverview } from "@/lib/dashboard.functions";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PF MARKET MIND" },
      { name: "description", content: "Overview of your automated trading accounts, bots, and performance." },
      { property: "og:title", content: "Dashboard — PF MARKET MIND" },
      { property: "og:description", content: "Overview of your automated trading accounts, bots, and performance." },
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
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => getDashboardOverview(),
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
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

  const activeBots = data.activations.filter((a) => a.status === "active").length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your automated trading at a glance."
        actions={
          <Button asChild>
            <Link to="/accounts">Connect MT5 account</Link>
          </Button>
        }
      />

      <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-warning">Execution service offline.</span>{" "}
        The MT5 execution layer is not connected yet. Accounts remain in{" "}
        <span className="font-medium text-foreground">pending</span> and no trades are
        being placed — this dashboard is the foundation the execution service will plug
        into.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Server} label="MT5 Accounts" value={data.accounts.length} />
        <StatCard
          icon={Bot}
          label="Active Bots"
          value={activeBots}
          hint={`${data.activations.length} total activation${data.activations.length === 1 ? "" : "s"}`}
        />
        <StatCard icon={Activity} label="Open Positions" value={data.openPositions} />
        <StatCard
          icon={Wallet}
          label="Net Profit"
          value={formatMoney(data.realizedProfit + data.floatingProfit)}
          hint={`${data.totalTrades} closed trades`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-base">Connected accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.accounts.length === 0 ? (
              <EmptyState
                icon={Server}
                title="No MT5 accounts yet"
                description="Connect your first MT5 account to start automating. Credentials are encrypted server-side."
                action={
                  <Button asChild variant="outline">
                    <Link to="/accounts">Connect account</Link>
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
                      </p>
                    </div>
                    <StatusBadge status={account.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-base">Bot activations</CardTitle>
          </CardHeader>
          <CardContent>
            {data.activations.length === 0 ? (
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
            ) : (
              <ul className="flex flex-col gap-3">
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
    </div>
  );
}
