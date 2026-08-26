import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-warning/40 bg-warning/10 text-warning",
  connected: "border-profit/40 bg-profit/10 text-profit",
  active: "border-profit/40 bg-profit/10 text-profit",
  paused: "border-warning/40 bg-warning/10 text-warning",
  stopped: "border-muted-foreground/40 bg-muted text-muted-foreground",
  disconnected: "border-muted-foreground/40 bg-muted text-muted-foreground",
  error: "border-loss/40 bg-loss/10 text-loss",
  past_due: "border-loss/40 bg-loss/10 text-loss",
  canceled: "border-muted-foreground/40 bg-muted text-muted-foreground",
  trialing: "border-chart-2/40 bg-chart-2/10 text-chart-2",
};

export function StatusBadge({ status }: { status: string }) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES["pending"];
  return (
    <Badge variant="outline" className={cn("capitalize", styles)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
