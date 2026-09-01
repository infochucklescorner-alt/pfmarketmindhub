import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

import {
  createPaystackCheckout,
  getAllInvoices,
  getMyInvoices,
} from "@/lib/monetization.functions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Payments & Invoices — PF NEXUS" },
      {
        name: "description",
        content:
          "View your PF NEXUS profit-share invoices, amounts, due dates, payment status and pay outstanding invoices.",
      },
      { property: "og:title", content: "Payments & Invoices — PF NEXUS" },
      {
        property: "og:description",
        content: "PF NEXUS profit-share invoices, due dates and payment status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoicesPage,
});

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

function InvoicesPage() {
  const invoicesQuery = useQuery({
    queryKey: ["my-invoices"],
    queryFn: () => getMyInvoices(),
  });

  const isAdmin = invoicesQuery.data?.isAdmin ?? false;

  const adminQuery = useQuery({
    queryKey: ["all-invoices"],
    queryFn: () => getAllInvoices(),
    enabled: isAdmin,
    retry: false,
  });

  const checkout = useMutation({
    mutationFn: (invoiceId: string) => createPaystackCheckout({ data: { invoiceId } }),
    onSuccess: (result) => {
      if (result.alreadyPaid) {
        toast.success("This invoice is already paid.");
        return;
      }
      if (!result.configured || !result.checkoutUrl) {
        toast.error("Payment provider not connected yet.");
        return;
      }
      window.location.href = result.checkoutUrl;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (invoicesQuery.isLoading) {
    return (
      <div aria-busy="true">
        <PageHeader title="Payments & invoices" description="Loading your invoices…" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (invoicesQuery.isError || !invoicesQuery.data) {
    return (
      <div>
        <PageHeader title="Payments & invoices" description="Profit-share invoices." />
        <EmptyState
          icon={AlertTriangle}
          title="Could not load invoices"
          description="Something went wrong while fetching your invoices."
          action={
            <Button variant="outline" onClick={() => void invoicesQuery.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const invoices = invoicesQuery.data.invoices;

  return (
    <div>
      <PageHeader
        title="Payments & invoices"
        description="PF NEXUS charges 30% only on realized profitable trading days. Trading execution remains disabled."
      />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-base">Your invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Receipt}
                title="No invoices yet"
                description="Invoices appear here only after a profitable trading day."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Trading date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(invoice.trading_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        {money(Number(invoice.amount_due), invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(invoice.due_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.status === "paid" ? (
                          <span className="text-xs text-muted-foreground">
                            Paid {formatDate(invoice.paid_at)}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={checkout.isPending}
                            onClick={() => checkout.mutate(invoice.id)}
                          >
                            {checkout.isPending && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Pay now
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="mt-6 border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-base">
              Admin — all invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {adminQuery.isLoading ? (
              <div className="p-6">
                <Skeleton className="h-24" />
              </div>
            ) : adminQuery.isError || !adminQuery.data ? (
              <div className="p-6">
                <EmptyState
                  icon={AlertTriangle}
                  title="Could not load admin invoices"
                  description="Admin billing data is unavailable right now."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>User ref</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminQuery.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No invoices on the platform yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      adminQuery.data.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {invoice.user_ref}
                          </TableCell>
                          <TableCell className="text-right">
                            {money(Number(invoice.amount_due), invoice.currency)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(invoice.due_date)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
