import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Server, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  connectMt5Account,
  disconnectMt5Account,
  listMt5Accounts,
} from "@/lib/mt5.functions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "MT5 Accounts — PF MARKET MIND" },
      { name: "description", content: "Connect and manage your MT5 trading accounts with encrypted, server-side credential storage." },
      { property: "og:title", content: "MT5 Accounts — PF MARKET MIND" },
      { property: "og:description", content: "Connect and manage your MT5 trading accounts with encrypted, server-side credential storage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [brokerServer, setBrokerServer] = useState("");
  const [accountLogin, setAccountLogin] = useState("");
  const [password, setPassword] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["mt5-accounts"],
    queryFn: () => listMt5Accounts(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["mt5-accounts"] });

  const connectMutation = useMutation({
    mutationFn: () =>
      connectMt5Account({ data: { label, brokerServer, accountLogin, password } }),
    onSuccess: () => {
      toast.success("Account saved. Credentials are encrypted and stored server-side.");
      setLabel("");
      setBrokerServer("");
      setAccountLogin("");
      setPassword("");
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) => disconnectMt5Account({ data: { accountId } }),
    onSuccess: () => {
      toast.success("Account disconnected and credentials deleted.");
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="MT5 Accounts"
        description="Connect the MT5 accounts our cloud service will trade on. Passwords are encrypted with AES-256-GCM on the server and are never readable from this dashboard."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Connect a new account</CardTitle>
            <CardDescription className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Credentials are sent over TLS and encrypted server-side before storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                connectMutation.mutate();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="mt5-label">Account label</Label>
                <Input
                  id="mt5-label"
                  placeholder="e.g. FTMO Challenge 100k"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mt5-server">Broker server</Label>
                <Input
                  id="mt5-server"
                  placeholder="e.g. FTMO-Server2"
                  required
                  value={brokerServer}
                  onChange={(e) => setBrokerServer(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mt5-login">Account login</Label>
                <Input
                  id="mt5-login"
                  placeholder="MT5 account number"
                  required
                  value={accountLogin}
                  onChange={(e) => setAccountLogin(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mt5-password">Account password</Label>
                <Input
                  id="mt5-password"
                  type="password"
                  placeholder="Trading password"
                  required
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={connectMutation.isPending}>
                {connectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Connect account
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <EmptyState
              icon={Server}
              title="No accounts connected"
              description="Connect your first MT5 account using the form. It will show as pending until the MT5 execution service comes online."
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {accounts.map((account) => (
                <li key={account.id}>
                  <Card className="border-border/60">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="truncate font-medium text-foreground">
                            {account.label}
                          </p>
                          <StatusBadge status={account.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {account.broker_server} · Login {account.account_login}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {account.status === "pending"
                            ? "Awaiting connection by the execution service."
                            : `Balance ${account.balance ?? "—"} ${account.currency} · Equity ${account.equity ?? "—"}`}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Disconnect account">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disconnect this account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes the account and its encrypted
                              credentials. Any bot activations on it will be unlinked.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => disconnectMutation.mutate(account.id)}
                            >
                              Disconnect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
