import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { getBridgeStatus } from "@/lib/bridge.functions";
import { getDashboardOverview } from "@/lib/dashboard.functions";
import { getNewsRestriction, MIN_SPREAD_THRESHOLD_USD } from "@/lib/protection";
import { isBridgeOnline, type BridgeRow } from "@/components/SafetyEngine";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Note = { id: string; title: string; body: string; tone: "warn" | "info" | "bad" };

export function NotificationBell() {
  const bridge = useQuery({
    queryKey: ["bridge-status"],
    queryFn: () => getBridgeStatus(),
    refetchInterval: 60_000,
  });
  const overview = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => getDashboardOverview(),
  });

  const news = getNewsRestriction();
  const rows = (bridge.data ?? []) as unknown as BridgeRow[];
  const primary = rows[0];

  const notes: Note[] = [];

  notes.push({
    id: "mode",
    title: "Monitoring / test mode",
    body: "Trade execution is disabled platform-wide until the MT5 bridge is verified.",
    tone: "warn",
  });

  if (!isBridgeOnline(primary)) {
    notes.push({
      id: "bridge",
      title: "MT5 bridge disconnected",
      body: primary?.last_heartbeat_at
        ? `Last heartbeat ${new Date(primary.last_heartbeat_at).toLocaleString()}.`
        : "No bridge heartbeat received yet.",
      tone: "bad",
    });
  }

  if (news.restricted) {
    notes.push({
      id: "news",
      title: "News-day block active",
      body: `${news.event ?? "High-impact news"} — trading blocked for ${news.date}.`,
      tone: "bad",
    });
  }

  if (primary?.spread != null && Number(primary.spread) > MIN_SPREAD_THRESHOLD_USD) {
    notes.push({
      id: "spread",
      title: "Spread above limit",
      body: `Current spread $${Number(primary.spread).toFixed(2)} exceeds the $${MIN_SPREAD_THRESHOLD_USD.toFixed(2)} maximum.`,
      tone: "bad",
    });
  }

  if (overview.data && overview.data.accounts.length === 0) {
    notes.push({
      id: "accounts",
      title: "No MT5 account connected",
      body: "Connect a trading account to start monitoring balance, equity and spread.",
      tone: "info",
    });
  }

  const alerts = notes.filter((n) => n.tone !== "info").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {alerts > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-loss px-1 text-[10px] font-semibold text-background">
              {alerts}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          <p className="text-xs text-muted-foreground">System and safety alerts</p>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="border-b border-border/40 px-4 py-3 last:border-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  n.tone === "bad" && "text-loss",
                  n.tone === "warn" && "text-warning",
                )}
              >
                {n.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
