import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  getMe, getLadder, seedLadder, updateCompetition, overrideRank, getAuditLog,
} from "@/lib/smash.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — SmashRanking" }] }),
  component: Admin,
});

function Admin() {
  const meFn = useServerFn(getMe);
  const ladderFn = useServerFn(getLadder);
  const seedFn = useServerFn(seedLadder);
  const updateFn = useServerFn(updateCompetition);
  const overrideFn = useServerFn(overrideRank);
  const auditFn = useServerFn(getAuditLog);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const ladderQ = useQuery({ queryKey: ["ladder"], queryFn: () => ladderFn() });
  const auditQ = useQuery({ queryKey: ["audit"], queryFn: () => auditFn(), enabled: !!meQ.data?.isAdmin });

  const comp = ladderQ.data?.competition;
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"draft" | "registration" | "active" | "finished">("draft");

  useEffect(() => {
    if (comp) {
      setName(comp.name);
      setLocation(comp.location ?? "");
      setStatus(comp.status);
    }
  }, [comp]);

  if (meQ.isLoading) return <AppShell><div className="text-muted-foreground">Loading…</div></AppShell>;
  if (!meQ.data?.isAdmin) {
    return <AppShell><div className="card-surface p-8 text-center text-muted-foreground">Admin only.</div></AppShell>;
  }

  const save = async () => {
    try {
      await updateFn({ data: { name, location, status } });
      toast.success("Competition updated.");
      ladderQ.refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const seed = async () => {
    if (!confirm("Seed the ladder now? This shuffles all registered players and starts the competition.")) return;
    try {
      const r = await seedFn();
      toast.success(`Ladder seeded with ${r.count} players.`);
      ladderQ.refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Admin</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wide">Competition</h2>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="registration">Open for registration</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="font-display uppercase tracking-wider">Save</Button>
          </div>
        </div>

        <div className="card-surface p-5">
          <h2 className="mb-2 font-display text-lg font-bold uppercase tracking-wide">Seed ladder</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {ladderQ.data?.registered.length ?? 0} registered ·{" "}
            {ladderQ.data?.rows.length ?? 0} on ladder.
          </p>
          <Button onClick={seed} className="font-display uppercase tracking-wider">Shuffle & start</Button>
        </div>

        <div className="card-surface p-5 lg:col-span-2">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Manual rank override</h2>
          <div className="space-y-1 text-sm">
            {(ladderQ.data?.rows ?? []).map((r) => (
              <ManualOverrideRow key={r.user_id} row={r} max={ladderQ.data?.rows.length ?? 1}
                onSave={async (newPos) => {
                  try {
                    await overrideFn({ data: { userId: r.user_id, newPosition: newPos } });
                    toast.success(`${r.display_name} → #${newPos}`);
                    ladderQ.refetch();
                  } catch (e: any) { toast.error(e.message); }
                }} />
            ))}
          </div>
        </div>

        <div className="card-surface p-5 lg:col-span-2">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Audit log</h2>
          <div className="space-y-1 text-xs">
            {(auditQ.data?.entries ?? []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between border-b border-border/50 py-1.5">
                <span><span className="font-semibold">{e.action}</span> · {JSON.stringify(e.target)}</span>
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
            {(auditQ.data?.entries ?? []).length === 0 && <div className="text-muted-foreground">No entries yet.</div>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ManualOverrideRow({ row, max, onSave }: { row: any; max: number; onSave: (n: number) => void | Promise<void> }) {
  const [pos, setPos] = useState(row.position);
  return (
    <div className="flex items-center gap-3 border-b border-border/50 py-1.5">
      <span className="w-10 font-display font-bold text-primary">#{row.position}</span>
      <span className="flex-1 truncate">{row.display_name}</span>
      <Input type="number" min={1} max={max} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="w-20" />
      <Button size="sm" variant="outline" onClick={() => onSave(pos)}>Move</Button>
    </div>
  );
}
