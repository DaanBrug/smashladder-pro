import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Home, ListOrdered, Swords, History, Settings, LogOut, Zap } from "lucide-react";
import { type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMe, getNotifications, markNotificationsRead } from "@/lib/smash.functions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const me = useServerFn(getMe);
  const notif = useServerFn(getNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const { data: meData } = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const { data: nData, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notif(),
    refetchInterval: 30_000,
  });
  const unread = (nData?.notifications ?? []).filter((n: any) => !n.read_at).length;

  const nav = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/ladder", label: "Ladder", icon: ListOrdered },
    { to: "/challenges", label: "Challenges", icon: Swords },
    { to: "/matches", label: "Matches", icon: History },
  ];
  if (meData?.isAdmin) nav.push({ to: "/admin", label: "Admin", icon: Settings });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold uppercase tracking-wider">SmashRanking</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = path.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <DropdownMenu onOpenChange={(open) => { if (!open && unread > 0) { markRead().then(() => refetch()); } }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(nData?.notifications ?? []).length === 0 && (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">All quiet.</div>
                )}
                {(nData?.notifications ?? []).slice(0, 10).map((n: any) => (
                  <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5">
                    <span className="text-sm font-medium">{labelFor(n.type)}</span>
                    <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="font-medium">
                  {meData?.profile?.display_name ?? "Account"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      {/* mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-5">
          {nav.slice(0, 5).map((n) => {
            const Icon = n.icon;
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}>
                <Icon className="h-5 w-5" /> {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function labelFor(type: string) {
  switch (type) {
    case "challenge_received": return "New challenge received";
    case "challenge_accepted": return "Your challenge was accepted";
    case "challenge_declined": return "Your challenge was declined";
    case "result_to_confirm":  return "Match result needs your confirmation";
    case "result_confirmed":   return "Your result was confirmed";
    case "result_disputed":    return "Your result was disputed";
    default: return type;
  }
}
