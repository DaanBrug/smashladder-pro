import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { getMe, getLadder, getMyChallenges, getMatches, joinCompetition } from "@/lib/smash.functions";
import { Button } from "@/components/ui/button";
import { Swords, ListOrdered, Timer, Trophy } from "lucide-react";
import { toast } from "sonner";
import { InviteButton } from "@/components/InviteButton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SmashRanking" }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useServerFn(getMe);
  const ladder = useServerFn(getLadder);
  const ch = useServerFn(getMyChallenges);
  const matches = useServerFn(getMatches);
  const join = useServerFn(joinCompetition);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const ladderQ = useQuery({ queryKey: ["ladder"], queryFn: () => ladder() });
  const chQ = useQuery({ queryKey: ["challenges"], queryFn: () => ch() });
  const matchQ = useQuery({ queryKey: ["matches"], queryFn: () => matches() });

  const userId = meQ.data?.profile?.id;
  const myRank = ladderQ.data?.rows.find((r) => r.user_id === userId)?.position;
  const isRegistered = ladderQ.data?.registered.some((r) => r.user_id === userId);
  const activeChallenge = chQ.data?.challenges.find((c: any) =>
    c.status === "pending" || c.status === "accepted",
  );
  const needsConfirm = matchQ.data?.matches.find((m: any) =>
    m.status === "pending_confirmation" && m.loser_id === userId,
  );

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
          Welcome back{meQ.data?.profile?.display_name ? `, ${meQ.data.profile.display_name}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {ladderQ.data?.competition?.name} · status:{" "}
          <span className="font-semibold text-foreground">{ladderQ.data?.competition?.status ?? "—"}</span>
        </p>
      </div>

      {!isRegistered && ladderQ.data?.competition && (
        <div className="card-surface mb-6 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-display text-lg font-bold uppercase tracking-wide">You're not in this competition yet</div>
            <div className="text-sm text-muted-foreground">Join now to get on the ladder.</div>
          </div>
          <Button onClick={async () => { try { await join(); toast.success("Joined!"); meQ.refetch(); ladderQ.refetch(); } catch (e: any) { toast.error(e.message); } }}
            className="font-display uppercase tracking-wider">
            Join competition
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={Trophy} label="Your rank" value={myRank ? `#${myRank}` : "—"} />
        <Stat icon={ListOrdered} label="Players" value={String(ladderQ.data?.rows.length ?? 0)} />
        <Stat icon={Timer} label="Open challenge" value={activeChallenge ? activeChallenge.status : "none"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">Active challenge</h2>
            <Link to="/challenges" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {activeChallenge ? (
            <div className="space-y-1">
              <div className="text-sm">
                <span className="font-semibold">{activeChallenge.challenger_name}</span>{" "}
                <span className="text-muted-foreground">vs</span>{" "}
                <span className="font-semibold">{activeChallenge.opponent_name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {activeChallenge.status === "pending"
                  ? `Expires ${new Date(activeChallenge.expires_at).toLocaleString()}`
                  : "Accepted — play and enter the result."}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Swords className="h-4 w-4" /> No active challenge. <Link to="/ladder" className="text-primary hover:underline">Pick a target →</Link>
            </div>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Awaiting your confirmation</h2>
          {needsConfirm ? (
            <Link to="/matches" className="block rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
              {needsConfirm.winner_name} reported a win over you. Confirm or dispute →
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing waiting for you. Nice.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="card-surface card-hover p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 font-display text-3xl font-bold neon-text">{value}</div>
    </div>
  );
}
