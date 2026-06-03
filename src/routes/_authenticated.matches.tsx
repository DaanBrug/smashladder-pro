import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { getMatches, getMe, confirmResult } from "@/lib/smash.functions";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/matches")({
  head: () => ({ meta: [{ title: "Matches — SmashRanking" }] }),
  component: Matches,
});

function setStr(s: any) {
  return `${s.w}-${s.l}${s.tb != null ? `(${s.tb})` : ""}`;
}

function Matches() {
  const matchesFn = useServerFn(getMatches);
  const meFn = useServerFn(getMe);
  const confirmFn = useServerFn(confirmResult);
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const mQ = useQuery({ queryKey: ["matches"], queryFn: () => matchesFn(), refetchInterval: 30_000 });
  const userId = meQ.data?.profile?.id;

  const handle = async (id: string, confirm: boolean) => {
    try {
      await confirmFn({ data: { matchId: id, confirm } });
      toast.success(confirm ? "Result confirmed. Ladder updated." : "Result disputed.");
      mQ.refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide">Match history</h1>
      <div className="space-y-2">
        {(mQ.data?.matches ?? []).length === 0 && (
          <div className="card-surface p-8 text-center text-sm text-muted-foreground">No matches played yet.</div>
        )}
        {(mQ.data?.matches ?? []).map((m: any) => {
          const sets: any[] = Array.isArray(m.sets) ? m.sets : [];
          const needsMyConfirm = m.status === "pending_confirmation" && m.loser_id === userId;
          return (
            <div key={m.id} className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display font-bold uppercase tracking-wide">
                  <span className="text-primary">{m.winner_name}</span>
                  <span className="mx-2 text-muted-foreground">def.</span>
                  <span>{m.loser_name}</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {sets.map(setStr).join(", ")} · {new Date(m.submitted_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={m.status} />
                {needsMyConfirm && (
                  <>
                    <Button size="sm" onClick={() => handle(m.id, true)}><Check className="mr-1 h-4 w-4" />Confirm</Button>
                    <Button size="sm" variant="outline" onClick={() => handle(m.id, false)}><X className="mr-1 h-4 w-4" />Dispute</Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_confirmation: "border-yellow-500/40 text-yellow-300",
    confirmed: "border-primary/40 text-primary",
    auto_confirmed: "border-primary/40 text-primary",
    disputed: "border-destructive/40 text-destructive",
  };
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-widest ${map[status] ?? ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}
