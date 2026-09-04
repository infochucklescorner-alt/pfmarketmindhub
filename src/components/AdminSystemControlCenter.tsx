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
  const [lastEmail, setLastEmail] = useState<string | null>(null);

  const testMutation = useMutation({
    mutationFn: () => runFullSystemTest(),
    onSuccess: (result) => {
      setChecks(result.checks);
      setRanAt(result.ranAt);
      toast.success("System test complete. No trades or payments were made.");
    },
    onError: (error) => toast.error(error.message),
  });

  const emailMutation = useMutation({
    mutationFn: () => sendTestEmail({ data: {} }),
    onSuccess: (result) => {
      if (result.ok) {
        setLastEmail(`Sent to ${result.recipient} at ${new Date(result.sentAt!).toLocaleTimeString()}`);
        toast.success("Test email sent.");
      } else {
        setLastEmail(result.error);
        toast.error(result.error ?? "Test email failed.");
      }
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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => emailMutation.mutate()}
              disabled={emailMutation.isPending}
            >
              {emailMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send test email (temporary)
            </Button>
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
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          Last email: <span className="text-foreground">{lastEmail ?? "No test email sent in this session."}</span>
          {ranAt ? ` · Last test: ${new Date(ranAt).toLocaleString()}` : null}
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
