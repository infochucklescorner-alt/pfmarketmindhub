import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Loader2,
  Mail,
  Receipt,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import {
  createPaystackCheckout,
  getMonetizationOverview,
} from "@/lib/monetization.functions";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Payments & Profit Share — PF NEXUS" },
      {
        name: "description",
        content:
          "Track daily realized profit, your 70% share, PF NEXUS's 30% profit-share invoices and payment history.",
      },
      { property: "og:title", content: "Payments & Profit Share — PF NEXUS" },
      {
        property: "og:description",
        content:
          "Daily profit-share invoices, payment history and access progression for PF NEXUS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BillingPage,
});

const STAGES = [5, 10, 15, 20, 25];

const money = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

function BillingPage() {
  const overviewQuery = useQuery({
    queryKey: ["monetization-overview"],
    queryFn: () => getMonetizationOverview(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (invoiceId: string) => createPaystackCheckout({ data: { invoiceId } }),
    onSuccess: (result) => {
      if (result.alreadyPaid) {
        toast.success("This invoice is already paid.");
        return;
      }
      if (!result.configured || !result.checkoutUrl) {
        toast.error("Payment provider not connected yet. Please try again later.");
        return;
      }
      window.location.href = result.checkoutUrl;
    },
    onError: (error) => toast.error(error.message),
  });

  const data = overviewQuery.data;

  if (overviewQuery.isLoading) {
    return (
      <div>
        <PageHeader title="Payments & profit share" description="Loading your billing data…" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="mt-6 h-52" />
      </div>
    );
  }

  if (overviewQuery.isError || !data) {
    return (
      <div>
        <PageHeader title="Payments & profit share" description="Billing overview" />
        <EmptyState
          icon={AlertTriangle}
          title="Could not load billing data"
          description="Something went wrong while fetching your profit-share information."
          action={
            <Button variant="outline" onClick={() => void overviewQuery.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const invoice = data.todaysInvoice;
  const currency = invoice?.currency ?? "USD";
  const daysRemaining = data.period?.daysRemaining ?? 0;
  const stageDays = data.stageDays;
  const paidDays = data.paidProfitDays;
  const stageProgress = Math.min(100, Math.round((paidDays / Math.max(stageDays, 1)) * 100));
  const expiryWarning = daysRemaining <= 1;

  const invoiceStatus = invoice?.status ?? "none";
  const isOverdue =
    invoice &&
    invoice.status !== "paid" &&
    new Date(invoice.due_date).getTime() < Date.now();

  return (
    <div>
      <PageHeader
        title="Payments & profit share"
        description="The PF NEXUS bot is free. We charge 30% only on days you close a realized net profit — nothing is owed on losing or flat days."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Today's realized net profit"
          value={money(data.todaysRealizedNetProfit, currency)}
          hint="Closed trades only"
        />
        <StatCard
          icon={CircleDollarSign}
          label="Your share (70%)"
          value={money(data.todaysUserShare, currency)}
          hint="Kept in your MT5 account"
        />
        <StatCard
          icon={Receipt}
          label="PF NEXUS share (30%)"
          value={money(data.todaysPlatformShare, currency)}
          hint="Only on profitable days"
        />
        <StatCard
          icon={CalendarClock}
          label="Access days remaining"
          value={daysRemaining}
          hint={`Current stage: ${stageDays} days`}
        />
      </div>

      {expiryWarning ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Your access period expires soon. Settle any due profit-share invoice to keep
            PF NEXUS monitoring your account without interruption.
          </p>
        </div>
      ) : null}

      {/* Today's invoice */}
      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Today's profit-share invoice
          </CardTitle>
          <CardDescription>
            Generated automatically by the backend at the end of each profitable trading
            day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!invoice ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No invoice for today. Invoices only appear after a trading day closes with a
              realized net profit.
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Trading date" value={formatDate(invoice.trading_date)} />
                <Field
                  label="Realized net profit"
                  value={money(Number(invoice.realized_net_profit), currency)}
                />
                <Field
                  label="Split (you / PF NEXUS)"
                  value={`${money(Number(invoice.user_share), currency)} / ${money(
                    Number(invoice.platform_share),
                    currency,
                  )}`}
                />
                <Field label="Due date" value={formatDate(invoice.due_date)} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Amount due
                  </p>
                  <p className="font-display text-2xl font-semibold text-foreground">
                    {money(Number(invoice.amount_due), currency)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={isOverdue ? "past_due" : invoiceStatus} />
                  {invoice.status === "paid" ? (
                    <span className="text-sm text-muted-foreground">
                      Paid {formatDate(invoice.paid_at)}
                    </span>
                  ) : data.paymentProviderConnected || invoice.checkout_url ? (
                    <Button
                      onClick={() => checkoutMutation.mutate(invoice.id)}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Pay now
                    </Button>
                  ) : (
                    <span className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">
                      Payment provider not connected
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progression */}
      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Access progression
          </CardTitle>
          <CardDescription>
            Access extends in 5-day stages as profitable days are settled. Stages are
            granted by the backend and cannot be changed from this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((stage) => {
              const reached = stageDays >= stage;
              const current = stageDays === stage;
              return (
                <span
                  key={stage}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    current
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : reached
                        ? "border-profit/40 bg-profit/10 text-profit"
                        : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {stage} days
                </span>
              );
            })}
            {stageDays > 25 ? (
              <span className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                {stageDays} days
              </span>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {paidDays} of {stageDays} settled profit days in this stage
              </span>
              <span>Next stage: {data.period?.nextStageDays ?? stageDays + 5} days</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${stageProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice history */}
      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-base">Invoice history</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {data.invoices.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0 sm:pb-0">
              No invoices yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3 sm:px-0">Date</th>
                    <th className="px-3 py-3">Net profit</th>
                    <th className="px-3 py-3">PF NEXUS 30%</th>
                    <th className="px-3 py-3">Due</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 last:border-0">
                      <td className="px-6 py-3 sm:px-0">{formatDate(row.trading_date)}</td>
                      <td className="px-3 py-3">
                        {money(Number(row.realized_net_profit), row.currency)}
                      </td>
                      <td className="px-3 py-3">
                        {money(Number(row.platform_share), row.currency)}
                      </td>
                      <td className="px-3 py-3">{formatDate(row.due_date)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {data.payments.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0 sm:pb-0">
              No payments recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3 sm:px-0">Date</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Provider</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 last:border-0">
                      <td className="px-6 py-3 sm:px-0">
                        {formatDate(row.paid_at ?? row.created_at)}
                      </td>
                      <td className="px-3 py-3">{money(Number(row.amount), row.currency)}</td>
                      <td className="px-3 py-3 capitalize">{row.provider ?? "—"}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          Invoice emails:{" "}
          {data.emailNotificationsConfigured ? "enabled" : "pending — not configured yet"}
        </span>
        <span>Monitoring / test mode — trading execution is disabled.</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}
