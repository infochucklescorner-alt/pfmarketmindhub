import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FlaskConical,
  Loader2,
  Mail,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  getIntegrationTestStatus,
  runFullSystemTest,
  sendTestEmail,
  startPaystackTestPayment,
  type SystemCheck,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


const STATUS_STYLES: Record<SystemCheck["status"], string> = {
  ok: "border-profit/40 bg-profit/10 text-profit",
  warning: "border-warning/40 bg-warning/10 text-warning",
  error: "border-loss/40 bg-loss/10 text-loss",
};

const STATUS_ICON = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

export function AdminSystemControlCenter() {
  const [checks, setChecks] = useState<SystemCheck[] | null>(null);
  const [ranAt, setRanAt] = useState<string | null>(null);

  const testMutation = useMutation({
    mutationFn: () => runFullSystemTest(),
    onSuccess: (result) => {
      setChecks(result.checks);
      setRanAt(result.ranAt);
      toast.success("System test complete. No trades or payments were made.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card className="mt-6 border-border/60">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="font-display text-base">System Control Center</CardTitle>
            <CardDescription>
              Configuration and health only. Trade execution stays disabled.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Run full system test
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          {ranAt ? `Last test: ${new Date(ranAt).toLocaleString()}` : "No test run in this session."}
        </p>


        {checks === null ? (
          <p className="text-sm text-muted-foreground">
            Run the system test to check Paystack, Brevo, database, MT5 bridge, trading
            engine, news protection, safety engine and the payment webhook.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {checks.map((check) => {
              const Icon = STATUS_ICON[check.status];
              return (
                <li
                  key={check.key}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-4 py-3"
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      check.status === "ok"
                        ? "text-profit"
                        : check.status === "warning"
                          ? "text-warning"
                          : "text-loss",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{check.label}</p>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[check.status])}>
                        {check.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * TEMPORARY — integration test area (Brevo email + Paystack test payment).
 * Self-contained: delete this component and its usage in the admin route to
 * remove the whole test surface. No production flow depends on it.
 */
export function TemporaryIntegrationTests() {
  const [emailResult, setEmailResult] = useState<
    { ok: boolean; message: string } | null
  >(null);
  const [paymentResult, setPaymentResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  const statusQuery = useQuery({
    queryKey: ["integration-test-status"],
    queryFn: () => getIntegrationTestStatus(),
    retry: false,
  });

  const emailMutation = useMutation({
    mutationFn: () => sendTestEmail({ data: {} }),
    onSuccess: (result) => {
      if (result.ok) {
        setEmailResult({
          ok: true,
          message: `Sent to ${result.recipient} at ${new Date(result.sentAt!).toLocaleTimeString()}`,
        });
        toast.success("Test email sent.");
      } else {
        setEmailResult({ ok: false, message: result.error ?? "Test email failed." });
        toast.error(result.error ?? "Test email failed.");
      }
    },
    onError: (error) => {
      setEmailResult({ ok: false, message: error.message });
      toast.error(error.message);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () => startPaystackTestPayment(),
    onSuccess: (result) => {
      if (result.ok && result.checkoutUrl) {
        setPaymentResult({
          ok: true,
          message: `Test checkout created (${result.mode} mode). Opening Paystack…`,
        });
        toast.success("Paystack test checkout created.");
        window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
      } else {
        setPaymentResult({ ok: false, message: result.error ?? "Test payment failed." });
        toast.error(result.error ?? "Test payment failed.");
      }
    },
    onError: (error) => {
      setPaymentResult({ ok: false, message: error.message });
      toast.error(error.message);
    },
  });

  const brevo = statusQuery.data?.brevo;
  const paystack = statusQuery.data?.paystack;

  const configLine = (
    configured: boolean | undefined,
    okText: string,
    error: string | null | undefined,
  ) => {
    if (statusQuery.isLoading) return "Checking configuration…";
    if (configured === undefined) return "Configuration status unavailable.";
    return configured ? okText : (error ?? "Not configured.");
  };

  return (
    <Card className="mt-6 border-dashed border-warning/50 bg-warning/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-1 h-5 w-5 shrink-0 text-warning" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-display text-base">
                Integration test area
              </CardTitle>
              <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
                TEMPORARY · TEST ONLY
              </Badge>
            </div>
            <CardDescription>
              Verifies Brevo email and Paystack test-mode checkout end-to-end. Secrets stay
              server-side. Remove this block once both integrations are confirmed.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-card p-4">
          <p className="text-sm font-medium text-foreground">Brevo email</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {configLine(brevo?.configured, "BREVO_API_KEY configured.", brevo?.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => emailMutation.mutate()}
            disabled={emailMutation.isPending}
          >
            {emailMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Send test email
          </Button>
          {emailResult ? (
            <p
              className={cn(
                "mt-3 text-xs",
                emailResult.ok ? "text-profit" : "text-loss",
              )}
            >
              {emailResult.message}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-4">
          <p className="text-sm font-medium text-foreground">Paystack test payment</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {configLine(
              paystack?.configured,
              `Configured in ${paystack?.mode ?? "sandbox"} mode (${paystack?.keyPrefix ?? "—"}).`,
              paystack?.error,
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Creates a ₦100 sandbox transaction. Blocked in live mode. No invoice is changed.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => paymentMutation.mutate()}
            disabled={paymentMutation.isPending}
          >
            {paymentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Start test payment
          </Button>
          {paymentResult ? (
            <p
              className={cn(
                "mt-3 text-xs",
                paymentResult.ok ? "text-profit" : "text-loss",
              )}
            >
              {paymentResult.message}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
