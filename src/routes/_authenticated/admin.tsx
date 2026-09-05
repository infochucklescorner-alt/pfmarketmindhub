import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, CreditCard, Server, ShieldAlert, Users } from "lucide-react";

import { getAdminOverview } from "@/lib/admin.functions";
import {
  AdminSystemControlCenter,
  TemporaryIntegrationTests,
} from "@/components/AdminSystemControlCenter";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — PF MARKET MIND" },
      { name: "description", content: "Platform administration overview." },
      { property: "og:title", content: "Admin — PF MARKET MIND" },
      { property: "og:description", content: "Platform administration overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverview(),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Admin" description="Platform administration." />
        <EmptyState
          icon={ShieldAlert}
          title="Admins only"
          description="Your account doesn't have the admin role. Ask a platform administrator to grant access."
        />
      </div>
    );
  }

  const recentUsers = data.recentUsers ?? [];

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Platform-wide overview. Role checks are enforced server-side."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Users" value={data.totalUsers} />
        <StatCard icon={Server} label="MT5 Accounts" value={data.totalAccounts} />
        <StatCard icon={Bot} label="Bot Activations" value={data.totalActivations} />
        <StatCard icon={CreditCard} label="Subscriptions" value={data.totalSubscriptions} />
      </div>

      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-base">Recent signups</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No users yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentUsers.map((user) => (
                  <TableRow key={user.email ?? user.created_at}>
                    <TableCell className="font-medium">{user.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
