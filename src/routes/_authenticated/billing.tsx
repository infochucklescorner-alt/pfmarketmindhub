import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  cancelSubscription,
  getMySubscription,
  listPlans,
  subscribeToPlan,
} from "@/lib/billing.functions";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — PF MARKET MIND" },
      { name: "description", content: "Manage your PF MARKET MIND subscription plan." },
      { property: "og:title", content: "Billing — PF MARKET MIND" },
      { property: "og:description", content: "Manage your PF MARKET MIND subscription plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const queryClient = useQueryClient();

  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() });
  const subscriptionQuery = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => getMySubscription(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["my-subscription"] });

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => subscribeToPlan({ data: { planId } }),
    onSuccess: () => {
      toast.success(
        "Plan selected. It stays pending until payments are integrated — you won't be charged.",
      );
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscription(),
    onSuccess: () => {
      toast.success("Subscription canceled.");
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const subscription = subscriptionQuery.data;

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Choose the plan that fits your trading. Payments are not integrated yet — selecting a plan is free and simply records your intent."
      />

      <Card className="mb-8 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Current subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionQuery.isLoading ? (
            <Skeleton className="h-10 w-full max-w-sm" />
          ) : subscription ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">
                  {subscription.plans?.name ?? "Plan"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription.plans
                    ? `$${(subscription.plans.price_cents / 100).toFixed(0)}/${subscription.plans.interval}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={subscription.status} />
                {subscription.status !== "canceled" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your bots will stop at the end of the current period once
                          billing is live.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep plan</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancelMutation.mutate()}>
                          Cancel subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No subscription yet. Pick a plan below.
            </p>
          )}
        </CardContent>
      </Card>

      {plansQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {(plansQuery.data ?? []).map((plan) => {
            const isCurrent = subscription?.plans?.slug === plan.slug;
            const features = Array.isArray(plan.features)
              ? (plan.features as string[])
              : [];
            return (
              <Card
                key={plan.id}
                className={cn(
                  "flex flex-col border-border/60",
                  plan.slug === "pro" && "border-primary/50",
                )}
              >
                <CardHeader>
                  <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="font-display text-3xl font-semibold text-foreground">
                      ${(plan.price_cents / 100).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">/{plan.interval}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="flex flex-col gap-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || subscribeMutation.isPending}
                    onClick={() => subscribeMutation.mutate(plan.id)}
                  >
                    {subscribeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {isCurrent ? "Current plan" : "Choose plan"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
