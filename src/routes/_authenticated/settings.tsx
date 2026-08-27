import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MIN_SPREAD_THRESHOLD_USD } from "@/lib/protection";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — PF MARKET MIND" },
      {
        name: "description",
        content:
          "Manage your PF MARKET MIND profile, notification preferences and platform protection defaults.",
      },
      { property: "og:title", content: "Settings — PF MARKET MIND" },
      {
        property: "og:description",
        content: "Manage your PF MARKET MIND account preferences and protection defaults.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SettingsPage() {
  const { user } = useAuth();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account preferences and platform protection defaults."
      />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your PF MARKET MIND account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {profile.isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
            </span>
          ) : profile.isError ? (
            <p className="text-loss">Could not load your profile. Please refresh.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate font-medium">{user?.email ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="text-muted-foreground">Name</span>
                <span className="truncate font-medium">
                  {profile.data?.full_name ?? "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">User ID</span>
                <span className="truncate font-mono text-xs">{user?.id}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>
            Notification preferences are stored locally until the execution service is connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="pref-trades" className="text-sm font-normal">
              Email me when a trade closes
            </Label>
            <Switch
              id="pref-trades"
              onCheckedChange={() => toast.info("Notifications activate with the execution service.")}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="pref-risk" className="text-sm font-normal">
              Alert me when a risk limit is hit
            </Label>
            <Switch
              id="pref-risk"
              onCheckedChange={() => toast.info("Notifications activate with the execution service.")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SettingsIcon className="h-4 w-4 text-primary" />
            Protection defaults
          </CardTitle>
          <CardDescription>Enforced globally by the execution service.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
            <span className="text-muted-foreground">Max allowed spread</span>
            <span className="font-medium">${MIN_SPREAD_THRESHOLD_USD.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">News-day blocking</span>
            <span className="font-medium">Enabled globally</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>Sign out of this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.assign("/");
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
