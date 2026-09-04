import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bitcoin, CreditCard, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { createFanbasisCheckout } from "@/lib/monetization.functions";
import { startInvoiceCheckout } from "@/lib/checkout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PaymentMethod = "paystack" | "crypto" | "fanbasis";

const METHODS: {
  id: PaymentMethod;
  label: string;
  icon: typeof CreditCard;
}[] = [
  { id: "paystack", label: "Paystack", icon: CreditCard },
  { id: "crypto", label: "Crypto", icon: Bitcoin },
  { id: "fanbasis", label: "FanBasis", icon: Wallet },
];

/**
 * Payment method selector + Pay button.
 *
 * Every provider call goes through an authenticated server function; no
 * provider secret exists in client code. An invoice is never marked paid from
 * the client redirect — settlement is reconciled server-side.
 */
export function PayInvoiceButton({
  invoiceId,
  size = "default",
  className,
}: {
  invoiceId: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const [method, setMethod] = useState<PaymentMethod>("paystack");

  const pay = useMutation({
    mutationFn: async (selected: PaymentMethod) => {
      if (selected === "fanbasis") {
        const result = await createFanbasisCheckout({ data: { invoiceId } });
        return {
          url: result.paymentLink,
          alreadyPaid: result.alreadyPaid,
          configured: result.configured,
          error: result.error,
        };
      }
      if (selected === "crypto") {
        return {
          url: null,
          alreadyPaid: false,
          configured: false,
          error: "Crypto payments are not connected yet.",
        };
      }
      const result = await startInvoiceCheckout(invoiceId);
      return {
        url: result.checkoutUrl,
        alreadyPaid: result.alreadyPaid,
        configured: result.configured,
        error: null as string | null,
      };
    },
    onSuccess: (result) => {
      if (result.alreadyPaid) {
        toast.success("This invoice is already paid.");
        return;
      }
      if (!result.configured || !result.url) {
        toast.error(result.error ?? "Payment provider not connected yet.");
        return;
      }
      window.location.href = result.url;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div
        role="radiogroup"
        aria-label="Payment method"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1"
      >
        {METHODS.map((m) => {
          const Icon = m.icon;
          const active = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMethod(m.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>
      <Button
        size={size}
        disabled={pay.isPending}
        onClick={() => pay.mutate(method)}
      >
        {pay.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Pay now
      </Button>
    </div>
  );
}
