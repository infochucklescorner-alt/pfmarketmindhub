import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { listTrades } from "@/lib/trading.functions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Trade History — PF MARKET MIND" },
      { name: "description", content: "Complete history of trades closed by your bots on connected MT5 accounts." },
      { property: "og:title", content: "Trade History — PF MARKET MIND" },
      { property: "og:description", content: "Complete history of trades closed by your bots on connected MT5 accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: () => listTrades(),
  });

  return (
    <div>
      <PageHeader
        title="Trade History"
        description="Every trade closed by your bots, synced from your MT5 accounts once the execution service is live."
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={History}
          title="No trades yet"
          description="Your closed trades will be recorded here automatically once bots start executing on your connected accounts."
        />
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Close</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "uppercase",
                          trade.side === "buy"
                            ? "border-profit/40 bg-profit/10 text-profit"
                            : "border-loss/40 bg-loss/10 text-loss",
                        )}
                      >
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(trade.volume)}</TableCell>
                    <TableCell className="text-right">{Number(trade.open_price)}</TableCell>
                    <TableCell className="text-right">
                      {trade.close_price != null ? Number(trade.close_price) : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        Number(trade.profit) >= 0 ? "text-profit" : "text-loss",
                      )}
                    >
                      {Number(trade.profit) >= 0 ? "+" : ""}
                      {Number(trade.profit).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {trade.mt5_accounts?.label ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(trade.closed_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
