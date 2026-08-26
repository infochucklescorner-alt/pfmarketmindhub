import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2, Pause, Play, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  activateBot,
  listActivations,
  listBots,
  setActivationStatus,
} from "@/lib/bots.functions";
import { listMt5Accounts } from "@/lib/mt5.functions";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bots")({
  head: () => ({
    meta: [
      { title: "Trading Bots — PF MARKET MIND" },
      { name: "description", content: "Browse the PF MARKET MIND bot catalog and activate strategies on your connected MT5 accounts." },
      { property: "og:title", content: "Trading Bots — PF MARKET MIND" },
      { property: "og:description", content: "Browse the PF MARKET MIND bot catalog and activate strategies on your connected MT5 accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BotsPage,
});

const RISK_STYLES: Record<string, string> = {
  low: "border-profit/40 bg-profit/10 text-profit",
  medium: "border-warning/40 bg-warning/10 text-warning",
  high: "border-loss/40 bg-loss/10 text-loss",
};

function BotsPage() {
  const queryClient = useQueryClient();
  const [activatingBot, setActivatingBot] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState("");

  const botsQuery = useQuery({ queryKey: ["bots"], queryFn: () => listBots() });
  const accountsQuery = useQuery({
    queryKey: ["mt5-accounts"],
    queryFn: () => listMt5Accounts(),
  });
  const activationsQuery = useQuery({
    queryKey: ["activations"],
    queryFn: () => listActivations(),
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["activations"] });
    void queryClient.invalidateQueries({ queryKey: ["risk-settings"] });
  };

  const activateMutation = useMutation({
    mutationFn: () =>
      activateBot({ data: { botId: activatingBot!, mt5AccountId: selectedAccount } }),
    onSuccess: () => {
      toast.success("Bot activated. Configure its risk controls next.");
      setActivatingBot(null);
      setSelectedAccount("");
      invalidateAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { activationId: string; status: "active" | "paused" | "stopped" }) =>
      setActivationStatus({ data: input }),
    onSuccess: () => {
      toast.success("Activation updated.");
      invalidateAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const accounts = accountsQuery.data ?? [];
  const activations = activationsQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Trading Bots"
        description="Activate a strategy on a connected MT5 account. Bots only start trading once the execution service is online and trading is enabled in Risk Controls."
      />

      {activations.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            Your activations
          </h2>
          <ul className="flex flex-col gap-3">
            {activations.map((activation) => (
              <li
                key={activation.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-foreground">
                      {activation.bots?.name ?? "Unknown bot"}
                    </p>
                    <StatusBadge status={activation.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activation.bots?.strategy} ·{" "}
                    {activation.mt5_accounts?.label ?? "No account linked"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activation.status !== "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          activationId: activation.id,
                          status: "active",
                        })
                      }
                    >
                      <Play className="h-3.5 w-3.5" /> Activate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          activationId: activation.id,
                          status: "paused",
                        })
                      }
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </Button>
                  )}
                  {activation.status !== "stopped" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          activationId: activation.id,
                          status: "stopped",
                        })
                      }
                    >
                      <Square className="h-3.5 w-3.5" /> Stop
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
          Bot catalog
        </h2>
        {botsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(botsQuery.data ?? []).map((bot) => (
              <Card key={bot.id} className="flex flex-col border-border/60">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="font-display text-base">{bot.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={cn("capitalize", RISK_STYLES[bot.risk_level])}
                    >
                      {bot.risk_level} risk
                    </Badge>
                  </div>
                  <CardDescription>{bot.strategy}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">{bot.description}</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Min. deposit ${Number(bot.min_deposit).toLocaleString()} ·{" "}
                    <span className="text-foreground">
                      ${(bot.monthly_price_cents / 100).toFixed(0)}/mo
                    </span>
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      if (accounts.length === 0) {
                        toast.error("Connect an MT5 account first.");
                        return;
                      }
                      setActivatingBot(bot.id);
                    }}
                  >
                    <Bot className="h-4 w-4" /> Activate
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        {accounts.length === 0 && !accountsQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">
            You need a connected MT5 account before activating a bot.{" "}
            <Link to="/accounts" className="text-primary underline-offset-4 hover:underline">
              Connect one now
            </Link>
            .
          </p>
        ) : null}
      </section>

      <Dialog open={activatingBot !== null} onOpenChange={(open) => !open && setActivatingBot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate bot</DialogTitle>
            <DialogDescription>
              Choose which connected MT5 account this bot should trade on.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activation-account">MT5 account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger id="activation-account">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label} · {account.broker_server}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={!selectedAccount || activateMutation.isPending}
              onClick={() => activateMutation.mutate()}
            >
              {activateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Activate bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
