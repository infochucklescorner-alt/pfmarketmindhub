import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getMyProfile,
  saveMyProfile,
  startWhatsappVerification,
  WHATSAPP_WELCOME_MESSAGE,
} from "@/lib/profile.functions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Verification — PF NEXUS" },
      {
        name: "description",
        content:
          "Complete your PF NEXUS profile: contact details, consent and WhatsApp verification.",
      },
      { property: "og:title", content: "Profile & Verification — PF NEXUS" },
      {
        property: "og:description",
        content: "Complete your PF NEXUS contact details and WhatsApp verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });

  const [form, setForm] = useState({
    fullName: "",
    country: "",
    phoneNumber: "",
    whatsappNumber: "",
    postalCode: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);

  const profile = profileQuery.data?.profile;

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.full_name ?? "",
      country: profile.country ?? "",
      phoneNumber: profile.phone_number ?? "",
      whatsappNumber: profile.whatsapp_number ?? "",
      postalCode: profile.postal_code ?? "",
    });
    setAcceptedTerms(Boolean(profile.accepted_terms_at));
    setWhatsappConsent(Boolean(profile.whatsapp_consent));
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveMyProfile({
        data: { ...form, acceptedTerms: true as const, whatsappConsent },
      }),
    onSuccess: () => {
      toast.success("Profile saved.");
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const verifyMutation = useMutation({
    mutationFn: () => startWhatsappVerification(),
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (error) => toast.error(error.message),
  });

  if (profileQuery.isLoading) {
    return (
      <div>
        <PageHeader title="Profile & verification" description="Loading your details…" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div>
        <PageHeader title="Profile & verification" description="Your contact details" />
        <EmptyState
          icon={AlertTriangle}
          title="Could not load your profile"
          description="Something went wrong while fetching your details."
          action={
            <Button variant="outline" onClick={() => void profileQuery.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const status = profile?.whatsapp_verification_status ?? "unverified";
  const providerConfigured = profileQuery.data?.whatsappProviderConfigured ?? false;
  const canSubmit =
    form.fullName.trim().length > 1 &&
    form.country.trim().length > 1 &&
    form.phoneNumber.trim().length > 5 &&
    form.whatsappNumber.trim().length > 5 &&
    form.postalCode.trim().length > 1 &&
    acceptedTerms;

  return (
    <div>
      <PageHeader
        title="Profile & verification"
        description="We only collect what we need to contact you about your account."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-base">Your details</CardTitle>
            <CardDescription>
              Full name, country, phone, WhatsApp number and postal code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  value={form.fullName}
                  autoComplete="name"
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country}
                  autoComplete="country-name"
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="postal-code">Postal code</Label>
                <Input
                  id="postal-code"
                  value={form.postalCode}
                  autoComplete="postal-code"
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phoneNumber}
                  autoComplete="tel"
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="whatsapp">WhatsApp number</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
                  required
                />
              </div>

              <label className="flex items-start gap-3 sm:col-span-2">
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(v === true)}
                />
                <span className="text-sm text-muted-foreground">
                  I accept the PF NEXUS terms of service and privacy policy.
                </span>
              </label>
              <label className="flex items-start gap-3 sm:col-span-2">
                <Checkbox
                  checked={whatsappConsent}
                  onCheckedChange={(v) => setWhatsappConsent(v === true)}
                />
                <span className="text-sm text-muted-foreground">
                  I consent to receiving PF NEXUS account messages on WhatsApp.
                </span>
              </label>

              <div className="sm:col-span-2">
                <Button type="submit" disabled={!canSubmit || saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-base">WhatsApp verification</CardTitle>
            <CardDescription>Status of your WhatsApp contact number.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Badge variant="outline" className="w-fit capitalize">
              <BadgeCheck className="h-3.5 w-3.5" /> {status}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {providerConfigured
                ? "WhatsApp Business Cloud API is connected."
                : "WhatsApp provider not connected yet — no messages are sent."}
            </p>
            <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              First message (sent only with your consent, once the provider is live):{" "}
              <span className="text-foreground">{WHATSAPP_WELCOME_MESSAGE}</span>
            </p>
            <Button
              variant="outline"
              disabled={!whatsappConsent || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
            >
              {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Start verification
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
