import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2, ShieldCheck } from "lucide-react";

import { getPfNexusDiagnostics } from "@/lib/diagnostics.functions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/**
 * Non-destructive PF NEXUS diagnostics: payment and bridge configuration
 * status only. No secrets are transmitted, no trades or payments are executed.
 */
export function SystemDiagnosticsCard() {
  const diagnostics = useQuery({
    queryKey: ["pf-nexus-diagnostics"],
    queryFn: () => getPfNexusDiagnostics(),
    staleTime: 30_000,
  });

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" aria-hidden="true" />
          PF NEXUS system diagnostics
        </CardTitle>
        <CardDescription>
          Read-only configuration status. Secret keys are never sent to the browser.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {diagnostics.isPending ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading diagnostics…
          </div>
        ) : diagnostics.isError ? (
          <p className="py-4 text-sm text-destructive">
            Diagnostics unavailable. Please refresh and try again.
          </p>
        ) : (
          (() => {
            const d = diagnostics.data!;
            return (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payments (Paystack)
                  </h3>
                  <Row
                    label="Environment"
                    value={
                      <Badge variant={d.payments.mode === "live" ? "default" : "secondary"}>
                        {d.payments.mode === "live" ? "LIVE" : "TEST MODE"}
                      </Badge>
                    }
                  />
                  <Row
                    label="Secret key"
                    value={
                      d.payments.configured
                        ? `Configured (${d.payments.keyPrefix}_…)`
                        : "Payment provider not connected"
                    }
                  />
                  {d.payments.error ? (
                    <Row
                      label="Configuration issue"
                      value={<span className="text-destructive">{d.payments.error}</span>}
                    />
                  ) : null}
                  <Row label="Webhook endpoint" value={<code>{d.payments.webhookPath}</code>} />
                </div>

                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    MT5 bridge (external service)
                  </h3>
                  <Row
                    label="Bridge URL"
                    value={d.bridge.baseUrlConfigured ? "Configured" : "Bridge not connected"}
                  />
                  <Row
                    label="Bridge shared secret"
                    value={d.bridge.sharedSecretConfigured ? "Configured" : "Not set"}
                  />
                  <Row label="Heartbeat endpoint" value={<code>{d.bridge.heartbeatPath}</code>} />
                  <Row
                    label="Trade execution"
                    value={<Badge variant="secondary">Disabled — monitoring only</Badge>}
                  />
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Mandatory Safety Engine gates
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {d.safetyGates.map((gate) => (
                      <li key={gate}>
                        <Badge variant="outline">{gate}</Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Every gate above must pass before PF NEXUS can ever place an order. Flow: PF
                    NEXUS Safety Engine → PF NEXUS Bridge → MetaTrader 5 terminal → HFM demo. The
                    web app never runs MT5 itself.
                  </p>
                </div>
              </div>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}
