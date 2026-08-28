import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Server,
  Trash2,
} from "lucide-react";
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

const DEFAULT_BROKER = "HFM";
const DEFAULT_SERVER = "HFMarketsGlobal-Demo";

function maskLogin(login: string) {
  if (login.length <= 4) return "••••";
  return `${"•".repeat(Math.max(2, login.length - 4))}${login.slice(-4)}`;
}

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Connect MT5 Account — PF MARKET MIND" },
      {
        name: "description",
        content:
          "Securely connect your HFM MT5 trading account. Credentials are encrypted server-side and never exposed to the browser.",
      },
      { property: "og:title", content: "Connect MT5 Account — PF MARKET MIND" },
      {
        property: "og:description",
        content:
          "Securely connect your HFM MT5 trading account with encrypted, server-side credential storage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const queryClient = useQueryClient();
  const [broker, setBroker] = useState(DEFAULT_BROKER);
  const [brokerServer, setBrokerServer] = useState(DEFAULT_SERVER);
  const [accountLogin, setAccountLogin] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: accounts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["mt5-accounts"],
    queryFn: () => listMt5Accounts(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["mt5-accounts"] });

  const connectMutation = useMutation({
    mutationFn: (input: {
      label: string;
      brokerServer: string;
      accountLogin: string;
      password: string;
    }) => connectMt5Account({ data: input }),
    onSuccess: () => {
      toast.success("Account submitted. Credentials are encrypted server-side.");
      setFormError(null);
      setAccountLogin("");
      void invalidate();
    },
    onError: (err: Error) => {
      setFormError(err.message);
      toast.error("Connection failed");
    },
  });

  const validate = () => {
    if (!broker.trim()) return "Broker is required.";
    if (!brokerServer.trim()) return "MT5 server is required.";
    if (!/^\d{4,20}$/.test(accountLogin.trim()))
      return "MT5 login must be 4–20 digits.";
    if (password.length < 4) return "MT5 password must be at least 4 characters.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    const secret = password;
    // Clear the secret from component state immediately after handing it off.
    setPassword("");
    connectMutation.mutate({
      label: broker.trim(),
      brokerServer: brokerServer.trim(),
      accountLogin: accountLogin.trim(),
      password: secret,
    });
  };

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) => disconnectMt5Account({ data: { accountId } }),
    onSuccess: () => {
      toast.success("Account disconnected and credentials deleted.");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Connect MT5 Account"
        description="Link the MT5 account our cloud service will manage. Passwords are transmitted over TLS, encrypted with AES-256-GCM server-side, and can never be read back from this dashboard. Trade execution stays disabled."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Connect MT5 Account</CardTitle>
            <CardDescription className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Credentials are handled only by our backend. No broker API secrets exist
              in the browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mt5-broker">Broker</Label>
                <Input
                  id="mt5-broker"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mt5-server">MT5 server</Label>
                <Input
                  id="mt5-server"
                  value={brokerServer}
                  onChange={(e) => setBrokerServer(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mt5-login">MT5 login</Label>
                <Input
                  id="mt5-login"
                  inputMode="numeric"
                  placeholder="e.g. 10234567"
                  value={accountLogin}
                  onChange={(e) => setAccountLogin(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mt5-password">MT5 password</Label>
                <Input
                  id="mt5-password"
                  type="password"
                  placeholder="Trading password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              {formError ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-loss/40 bg-loss/10 px-3 py-2 text-xs text-loss"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {formError}
                </p>
              ) : null}

              {connectMutation.isSuccess && !formError ? (
                <p className="flex items-start gap-2 rounded-md border border-profit/40 bg-profit/10 px-3 py-2 text-xs text-profit">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Credentials stored securely. The account appears below with its
                  current connection status.
                </p>
              ) : null}

              <Button type="submit" disabled={connectMutation.isPending}>
                {connectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {connectMutation.isPending ? "Connecting…" : "Connect account"}
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
          ) : isError ? (
            <Card className="border-loss/40">
              <CardContent className="flex flex-col items-start gap-3 p-5">
                <p className="text-sm text-loss">
                  Could not load your accounts. {(error as Error).message}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : !accounts || accounts.length === 0 ? (
            <EmptyState
              icon={Server}
              title="No accounts connected"
              description="Connect your first MT5 account using the form. It stays pending until the MT5 execution service comes online."
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
                          {account.broker_server} · Login{" "}
                          {maskLogin(account.account_login)}
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
