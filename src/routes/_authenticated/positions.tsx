import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { listPositions } from "@/lib/trading.functions";
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

export const Route = createFileRoute("/_authenticated/positions")({
  head: () => ({
    meta: [
      { title: "Open Positions — PF MARKET MIND" },
      { name: "description", content: "Live open positions across your connected MT5 accounts." },
      { property: "og:title", content: "Open Positions — PF MARKET MIND" },
      { property: "og:description", content: "Live open positions across your connected MT5 accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PositionsPage,
});

function PositionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: () => listPositions(),
  });

  return (
    <div>
      <PageHeader
        title="Open Positions"
        description="Positions opened by your bots. This feed activates when the MT5 execution service comes online."
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No open positions"
          description="Nothing is being traded yet. Positions will appear here in real time once the execution service is connected to your MT5 accounts."
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
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">{position.symbol}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "uppercase",
                          position.side === "buy"
                            ? "border-profit/40 bg-profit/10 text-profit"
                            : "border-loss/40 bg-loss/10 text-loss",
                        )}
                      >
                        {position.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(position.volume)}</TableCell>
                    <TableCell className="text-right">{Number(position.open_price)}</TableCell>
                    <TableCell className="text-right">
                      {position.current_price != null ? Number(position.current_price) : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        Number(position.profit) >= 0 ? "text-profit" : "text-loss",
                      )}
                    >
                      {Number(position.profit) >= 0 ? "+" : ""}
                      {Number(position.profit).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {position.mt5_accounts?.label ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(position.opened_at).toLocaleString()}
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
