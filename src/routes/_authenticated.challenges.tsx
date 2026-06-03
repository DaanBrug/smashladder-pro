import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  getMyChallenges, getMe, respondChallenge, submitResult,
} from "@/lib/smash.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Check, X, Timer, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({ meta: [{ title: "Challenges — SmashRanking" }] }),
  component: Challenges,
});

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${m}m left`;
}

function Challenges() {
  const meFn = useServerFn(getMe);
  const chFn = useServerFn(getMyChallenges);
  const respondFn = useServerFn(respondChallenge);
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const chQ = useQuery({ queryKey: ["challenges"], queryFn: () => chFn(), refetchInterval: 30_000 });

  const userId = meQ.data?.profile?.id;
  const challenges = chQ.data?.challenges ?? [];

  const respond = async (id: string, accept: boolean) => {
    try {
      await respondFn({ data: { id, accept } });
      toast.success(accept ? "Challenge accepted. Go play!" : "Challenge declined.");
      chQ.refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide">Challenges</h1>
      {challenges.length === 0 && (
        <div className="card-surface p-8 text-center text-sm text-muted-foreground">No challenges yet.</div>
      )}
      <div className="space-y-2">
        {challenges.map((c: any) => {
          const incoming = c.opponent_id === userId;
          const accepted = c.status === "accepted";
          const pending = c.status === "pending";
          return (
            <div key={c.id} className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display font-bold uppercase tracking-wide">
                  <span className={c.challenger_id === userId ? "text-primary" : ""}>{c.challenger_name}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className={c.opponent_id === userId ? "text-primary" : ""}>{c.opponent_name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" />
                  {pending ? timeLeft(c.expires_at) : c.status}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {pending && incoming && (
                  <>
                    <Button size="sm" onClick={() => respond(c.id, true)} className="font-display uppercase tracking-wider">
                      <Check className="mr-1 h-4 w-4" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respond(c.id, false)}>
                      <X className="mr-1 h-4 w-4" /> Decline
                    </Button>
                  </>
                )}
                {accepted && (
                  <SubmitResultDialog challengeId={c.id} onDone={() => chQ.refetch()} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function SubmitResultDialog({ challengeId, onDone }: { challengeId: string; onDone: () => void }) {
  const submitFn = useServerFn(submitResult);
  const [open, setOpen] = useState(false);
  const [iWon, setIWon] = useState("yes");
  const [s1, setS1] = useState({ w: 6, l: 4 });
  const [s2, setS2] = useState({ w: 6, l: 4 });
  const [playThird, setPlayThird] = useState(false);
  const [s3, setS3] = useState({ w: 6, l: 4 });
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      const sets = [s1, s2, ...(playThird ? [s3] : [])];
      await submitFn({ data: { challengeId, iWon: iWon === "yes", sets } });
      toast.success("Result submitted. Awaiting loser's confirmation.");
      setOpen(false); onDone();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="font-display uppercase tracking-wider">
          <Trophy className="mr-1 h-4 w-4" /> Enter result
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display uppercase tracking-wide">Match result</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Who won?</Label>
            <RadioGroup value={iWon} onValueChange={setIWon} className="mt-2 flex gap-4">
              <label className="flex items-center gap-2"><RadioGroupItem value="yes" /> I won</label>
              <label className="flex items-center gap-2"><RadioGroupItem value="no" /> Opponent won</label>
            </RadioGroup>
          </div>
          <SetInput label="Set 1" value={s1} onChange={setS1} />
          <SetInput label="Set 2" value={s2} onChange={setS2} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={playThird} onChange={(e) => setPlayThird(e.target.checked)} /> Played third set
          </label>
          {playThird && <SetInput label="Set 3" value={s3} onChange={setS3} />}
        </div>
        <DialogFooter>
          <Button onClick={send} disabled={busy} className="font-display uppercase tracking-wider">
            {busy ? "Submitting…" : "Submit result"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetInput({ label, value, onChange }: { label: string; value: { w: number; l: number; tb?: number }; onChange: (v: any) => void }) {
  return (
    <div>
      <Label>{label} <span className="text-xs text-muted-foreground">(winner – loser)</span></Label>
      <div className="mt-1.5 flex items-center gap-2">
        <Input type="number" min={0} max={7} value={value.w}
          onChange={(e) => onChange({ ...value, w: Number(e.target.value) })} className="w-20" />
        <span className="text-muted-foreground">–</span>
        <Input type="number" min={0} max={7} value={value.l}
          onChange={(e) => onChange({ ...value, l: Number(e.target.value) })} className="w-20" />
        {value.w === 7 && value.l === 6 && (
          <Input type="number" min={0} placeholder="TB" value={value.tb ?? ""}
            onChange={(e) => onChange({ ...value, tb: Number(e.target.value) })} className="w-24" />
        )}
      </div>
    </div>
  );
}
