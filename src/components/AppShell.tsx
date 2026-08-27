import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  CreditCard,
  Gauge,
  History,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Server,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "MT5 Accounts", icon: Server },
  { to: "/bots", label: "Bots", icon: Bot },
  { to: "/risk", label: "Risk Controls", icon: ShieldCheck },
  { to: "/positions", label: "Positions", icon: Activity },
  { to: "/history", label: "Trade History", icon: History },
  { to: "/performance", label: "Performance", icon: LineChart },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/admin", label: "Admin", icon: Gauge },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: true }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          activeProps={{
            className:
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-sidebar-accent text-sidebar-foreground",
          }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
        <LineChart className="h-4 w-4 text-primary" />
      </span>
      <span className="font-display text-sm font-semibold tracking-[0.18em] text-foreground">
        PF MARKET MIND
      </span>
    </Link>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{user.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
          <Brand />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <div className="flex h-16 items-center border-b border-sidebar-border px-4">
                <Brand />
              </div>
              <div className="p-3">
                <NavLinks onNavigate={() => setMenuOpen(false)} />
              </div>
              <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-3">
                <p className="truncate px-3 pb-2 text-xs text-muted-foreground">
                  {user.email}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-3 text-muted-foreground"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8")}>
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
