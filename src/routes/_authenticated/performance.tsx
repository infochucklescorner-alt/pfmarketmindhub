import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Sigma, Target, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getPerformanceSummary } from "@/lib/trading.functions";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "Performance — PF MARKET MIND" },
      { name: "description", content: "Aggregated performance metrics and equity curve across all your automated trading." },
      { property: "og:title", content: "Performance — PF MARKET MIND" },
      { property: "og:description", content: "Aggregated performance metrics and equity curve across all your automated trading." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerformancePage,
});

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function PerformancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["performance"],
    queryFn: () => getPerformanceSummary(),
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
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (data.totalTrades === 0) {
    return (
      <div>
        <PageHeader
          title="Performance"
          description="Aggregated results across all your bots and accounts."
        />
        <EmptyState
          icon={LineChart}
          title="No performance data yet"
          description="Metrics and your equity curve will build automatically as your bots close trades. The execution service is not connected yet, so there is nothing to measure."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Performance"
        description="Aggregated results across all your bots and accounts."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Sigma} label="Net Profit" value={formatMoney(data.netProfit)} />
        <StatCard
          icon={Target}
          label="Win Rate"
          value={`${data.winRate.toFixed(1)}%`}
          hint={`${data.totalTrades} closed trades`}
        />
        <StatCard
          icon={TrendingUp}
          label="Profit Factor"
          value={data.profitFactor != null ? data.profitFactor.toFixed(2) : "—"}
        />
        <StatCard
          icon={TrendingDown}
          label="Worst Trade"
          value={formatMoney(data.worstTrade)}
          hint={`Best: ${formatMoney(data.bestTrade)}`}
        />
      </div>

      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-base">Cumulative profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.equityCurve}>
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-profit)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-profit)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) =>
                    new Date(value).toLocaleDateString()
                  }
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickFormatter={(value: number) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius)",
                    color: "var(--color-popover-foreground)",
                  }}
                  labelFormatter={(value) => new Date(String(value)).toLocaleString()}
                  formatter={(value) => [formatMoney(Number(value)), "Cumulative P/L"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-profit)"
                  strokeWidth={2}
                  fill="url(#equityFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
