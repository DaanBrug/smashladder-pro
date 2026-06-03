import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { getLadder, getMe, createChallenge } from "@/lib/smash.functions";
import { Button } from "@/components/ui/button";
import { Swords, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ladder")({
  head: () => ({ meta: [{ title: "Ladder — SmashRanking" }] }),
  component: Ladder,
});

function Ladder() {
  const ladderFn = useServerFn(getLadder);
  const meFn = useServerFn(getMe);
  const challengeFn = useServerFn(createChallenge);
  const ladderQ = useQuery({ queryKey: ["ladder"], queryFn: () => ladderFn(), refetchInterval: 30_000 });
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => meFn() });

  const userId = meQ.data?.profile?.id;
  const myPos = ladderQ.data?.rows.find((r) => r.user_id === userId)?.position;

  const handleChallenge = async (opponentId: string) => {
    try {
      await challengeFn({ data: { opponentId } });
      toast.success("Challenge sent. 72 hours to respond.");
      ladderQ.refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const rows = ladderQ.data?.rows ?? [];
  const status = ladderQ.data?.competition?.status;

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Ladder</h1>
          <p className="text-sm text-muted-foreground">
            {status === "active" ? "Challenge anyone ranked above you." : "Waiting for the competition to start."}
          </p>
        </div>
      </div>

      {status !== "active" && (
        <div className="card-surface mb-4 p-4 text-sm text-muted-foreground">
          The ladder isn't seeded yet. Once registration closes, an admin will draw starting positions.
          {ladderQ.data?.registered.length ? ` ${ladderQ.data.registered.length} players registered.` : ""}
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const isMe = r.user_id === userId;
            const canChallenge = status === "active" && myPos != null && r.position < myPos;
            return (
              <motion.div
                key={r.user_id}
                layout
                layoutId={r.user_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className={`card-surface flex items-center gap-4 p-4 ${isMe ? "neon-glow" : "card-hover"}`}
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-md font-display text-lg font-bold ${
                  r.position === 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}>
                  {r.position === 1 ? <Crown className="h-5 w-5" /> : r.position}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-bold uppercase tracking-wide">
                    {r.display_name}{isMe && <span className="ml-2 text-xs text-primary">YOU</span>}
                  </div>
                </div>
                {canChallenge && (
                  <Button size="sm" onClick={() => handleChallenge(r.user_id)} className="font-display uppercase tracking-wider">
                    <Swords className="mr-1.5 h-3.5 w-3.5" /> Challenge
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {rows.length === 0 && (
          <div className="card-surface p-8 text-center text-sm text-muted-foreground">
            Nobody on the ladder yet.
          </div>
        )}
      </div>
    </AppShell>
  );
}
