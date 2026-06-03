import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Best-of-3 tennis set validator
const setSchema = z.object({
  w: z.number().int().min(0).max(7),
  l: z.number().int().min(0).max(7),
  tb: z.number().int().min(0).max(20).optional(),
});

function validSet(s: { w: number; l: number; tb?: number }): boolean {
  // winner must take the set: standard tennis scores 6-0..6-4, 7-5, 7-6 (with tb)
  if (s.w === 6 && s.l <= 4) return true;
  if (s.w === 7 && s.l === 5) return true;
  if (s.w === 7 && s.l === 6 && typeof s.tb === "number") return true;
  return false;
}

function validateMatch(sets: { w: number; l: number; tb?: number }[]): string | null {
  if (sets.length < 2 || sets.length > 3) return "Best of 3 sets: enter 2 or 3 sets.";
  let wWins = 0, lWins = 0;
  for (const s of sets) {
    if (!validSet(s)) return `Invalid set score ${s.w}-${s.l}`;
    if (s.w > s.l) wWins++; else lWins++;
  }
  if (wWins !== 2) return "Winner must take 2 sets.";
  if (lWins > 1) return "Loser cannot take 2 sets.";
  return null;
}

// ---------- helpers ----------
async function notify(supabase: any, userId: string, type: string, payload: any) {
  await supabase.from("notifications").insert({ user_id: userId, type, payload });
}

async function getCompetition(supabase: any) {
  const { data } = await supabase.from("competition").select("*").limit(1).maybeSingle();
  return data;
}

async function sweep(_supabase: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("sweep_timeouts");
}

// ---------- queries ----------

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await sweep(supabase);
    const [{ data: profile }, comp, { data: isAdminData }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url, created_at").eq("id", userId).maybeSingle(),
      getCompetition(supabase),
      supabase.rpc("is_admin", { _user: userId }),
    ]);
    const isAdmin = !!isAdminData;
    return { profile, competition: comp, isAdmin };

  });

export const getLadder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    await sweep(supabase);
    const comp = await getCompetition(supabase);
    if (!comp) return { competition: null, rows: [], registered: [] };
    const [{ data: rankings }, { data: regs }] = await Promise.all([
      supabase.from("rankings").select("user_id, position").eq("competition_id", comp.id).order("position"),
      supabase.from("registrations").select("user_id").eq("competition_id", comp.id),
    ]);
    const userIds = Array.from(new Set([...(rankings ?? []).map((r: any) => r.user_id), ...(regs ?? []).map((r: any) => r.user_id)]));
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] };

    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const rows = (rankings ?? []).map((r: any) => ({
      position: r.position,
      user_id: r.user_id,
      display_name: byId.get(r.user_id)?.display_name ?? "Unknown",
    }));
    const registered = (regs ?? []).map((r: any) => ({
      user_id: r.user_id,
      display_name: byId.get(r.user_id)?.display_name ?? "Unknown",
    }));
    return { competition: comp, rows, registered };
  });

export const joinCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const comp = await getCompetition(supabase);
    if (!comp) throw new Error("No competition available.");
    if (comp.status === "finished") throw new Error("Competition is finished.");
    const { error } = await supabase.from("registrations").insert({ competition_id: comp.id, user_id: userId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    // if competition is already active, append at bottom of ladder via admin client
    if (comp.status === "active") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: existing } = await supabaseAdmin
        .from("rankings").select("user_id, position").eq("competition_id", comp.id);
      if (!existing?.some((r) => r.user_id === userId)) {
        const next = (existing?.length ?? 0) + 1;
        await supabaseAdmin.from("rankings").insert({ competition_id: comp.id, user_id: userId, position: next });
      }
    }
    return { ok: true };
  });

// ---------- challenges ----------

export const getMyChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await sweep(supabase);
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);
    const ids = Array.from(new Set((data ?? []).flatMap((c: any) => [c.challenger_id, c.opponent_id])));
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
    return {
      challenges: (data ?? []).map((c: any) => ({
        ...c,
        challenger_name: byId.get(c.challenger_id) ?? "Unknown",
        opponent_name: byId.get(c.opponent_id) ?? "Unknown",
      })),
    };
  });

export const createChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ opponentId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.opponentId === userId) throw new Error("You can't challenge yourself.");
    const comp = await getCompetition(supabase);
    if (!comp || comp.status !== "active") throw new Error("Competition is not active.");
    const { data: positions } = await supabase
      .from("rankings").select("user_id, position")
      .eq("competition_id", comp.id)
      .in("user_id", [userId, data.opponentId]);
    const me = positions?.find((p: any) => p.user_id === userId);
    const opp = positions?.find((p: any) => p.user_id === data.opponentId);
    if (!me || !opp) throw new Error("Both players must be on the ladder.");
    if (me.position <= opp.position) throw new Error("You can only challenge a higher-ranked player.");
    // no existing pending challenge from me
    const { data: existing } = await supabase
      .from("challenges").select("id")
      .eq("challenger_id", userId).eq("status", "pending").limit(1);
    if (existing && existing.length > 0) throw new Error("You already have an open challenge.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("challenges")
      .insert({ competition_id: comp.id, challenger_id: userId, opponent_id: data.opponentId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await notify(supabaseAdmin, data.opponentId, "challenge_received", { challenge_id: inserted.id, from: userId });
    return { ok: true, id: inserted.id };
  });

export const respondChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), accept: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ch } = await supabase.from("challenges").select("*").eq("id", data.id).maybeSingle();
    if (!ch) throw new Error("Challenge not found.");
    if (ch.opponent_id !== userId) throw new Error("Not your challenge to respond to.");
    if (ch.status !== "pending") throw new Error("Challenge is no longer pending.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("challenges")
      .update({ status: data.accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
      .eq("id", data.id);
    await notify(supabaseAdmin, ch.challenger_id, data.accept ? "challenge_accepted" : "challenge_declined", { challenge_id: ch.id });
    return { ok: true };
  });

// ---------- matches ----------

export const getMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    await sweep(supabase);
    const { data } = await supabase
      .from("matches")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(100);
    const ids = Array.from(new Set((data ?? []).flatMap((m: any) => [m.winner_id, m.loser_id])));
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
    return {
      matches: (data ?? []).map((m: any) => ({
        ...m,
        winner_name: byId.get(m.winner_id) ?? "Unknown",
        loser_name: byId.get(m.loser_id) ?? "Unknown",
      })),
    };
  });

export const submitResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      challengeId: z.string().uuid(),
      iWon: z.boolean(),
      sets: z.array(setSchema).min(2).max(3),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ch } = await supabase.from("challenges").select("*").eq("id", data.challengeId).maybeSingle();
    if (!ch) throw new Error("Challenge not found.");
    if (![ch.challenger_id, ch.opponent_id].includes(userId)) throw new Error("Not a participant.");
    if (ch.status !== "accepted") throw new Error("Challenge isn't accepted.");
    const winner = data.iWon ? userId : (userId === ch.challenger_id ? ch.opponent_id : ch.challenger_id);
    const loser = winner === ch.challenger_id ? ch.opponent_id : ch.challenger_id;
    const err = validateMatch(data.sets);
    if (err) throw new Error(err);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ranks } = await supabaseAdmin
      .from("rankings").select("user_id, position")
      .eq("competition_id", ch.competition_id).in("user_id", [winner, loser]);
    const pre_winner_pos = ranks?.find((r) => r.user_id === winner)?.position ?? null;
    const pre_loser_pos = ranks?.find((r) => r.user_id === loser)?.position ?? null;
    const { data: m, error } = await supabaseAdmin.from("matches").insert({
      challenge_id: ch.id,
      competition_id: ch.competition_id,
      winner_id: winner,
      loser_id: loser,
      sets: data.sets,
      submitted_by: userId,
      pre_winner_pos,
      pre_loser_pos,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await notify(supabaseAdmin, loser, "result_to_confirm", { match_id: m.id });
    return { ok: true, id: m.id };
  });

export const confirmResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ matchId: z.string().uuid(), confirm: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: m } = await supabase.from("matches").select("*").eq("id", data.matchId).maybeSingle();
    if (!m) throw new Error("Match not found.");
    if (m.loser_id !== userId) throw new Error("Only the loser confirms.");
    if (m.status !== "pending_confirmation") throw new Error("Already resolved.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.confirm) {
      await supabaseAdmin.rpc("finalize_match", { _match: m.id, _auto: false });
      await notify(supabaseAdmin, m.winner_id, "result_confirmed", { match_id: m.id });
    } else {
      await supabaseAdmin.from("matches").update({ status: "disputed" }).eq("id", m.id);
      await notify(supabaseAdmin, m.winner_id, "result_disputed", { match_id: m.id });
    }
    return { ok: true };
  });

// ---------- notifications ----------

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("notifications").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(30);
    return { notifications: data ?? [] };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", userId).is("read_at", null);
    return { ok: true };
  });

// ---------- admin ----------

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin, error } = await supabase.rpc("is_admin", { _user: userId });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Admin only.");
}


export const seedLadder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const comp = await getCompetition(supabase);
    if (!comp) throw new Error("No competition.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: regs } = await supabaseAdmin
      .from("registrations").select("user_id").eq("competition_id", comp.id);
    if (!regs || regs.length === 0) throw new Error("Nobody registered yet.");
    const shuffled = [...regs].sort(() => Math.random() - 0.5);
    await supabaseAdmin.from("rankings").delete().eq("competition_id", comp.id);
    const rows = shuffled.map((r, i) => ({ competition_id: comp.id, user_id: r.user_id, position: i + 1 }));
    await supabaseAdmin.from("rankings").insert(rows);
    await supabaseAdmin.from("competition").update({ status: "active", starts_at: new Date().toISOString() }).eq("id", comp.id);
    await supabaseAdmin.from("audit_log").insert({ actor_id: userId, action: "seed_ladder", target: { competition_id: comp.id, count: rows.length } });
    return { ok: true, count: rows.length };
  });

export const updateCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    name: z.string().min(1).max(120),
    location: z.string().max(200).optional().nullable(),
    registration_closes_at: z.string().optional().nullable(),
    starts_at: z.string().optional().nullable(),
    ends_at: z.string().optional().nullable(),
    status: z.enum(["draft", "registration", "active", "finished"]).optional(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const comp = await getCompetition(supabase);
    if (!comp) throw new Error("No competition.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("competition").update(data).eq("id", comp.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_log").insert({ actor_id: userId, action: "update_competition", target: data });
    return { ok: true };
  });

export const overrideRank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), newPosition: z.number().int().min(1) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const comp = await getCompetition(supabase);
    if (!comp) throw new Error("No competition.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("rankings").select("user_id, position").eq("competition_id", comp.id).order("position");
    if (!rows) throw new Error("Empty ladder.");
    const filtered = rows.filter((r) => r.user_id !== data.userId);
    const target = Math.min(Math.max(1, data.newPosition), filtered.length + 1);
    filtered.splice(target - 1, 0, { user_id: data.userId, position: target });
    // rewrite all
    await supabaseAdmin.from("rankings").delete().eq("competition_id", comp.id);
    await supabaseAdmin.from("rankings").insert(
      filtered.map((r, i) => ({ competition_id: comp.id, user_id: r.user_id, position: i + 1 })),
    );
    await supabaseAdmin.from("audit_log").insert({ actor_id: userId, action: "override_rank", target: data });
    return { ok: true };
  });

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100);
    return { entries: data ?? [] };
  });
