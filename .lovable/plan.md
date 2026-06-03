# SmashRanking PWA — Implementation Plan

A mobile-first PWA for managing a single active tennis ladder competition, with magic-link auth, a "sliding rule" ranking engine, challenge/result flows with 3-day timeouts, and an admin panel.

## 1. Visual system

- Tailwind v4 tokens in `src/styles.css`:
  - `--background: #0a0a0a`, surfaces `#121212`, borders `#2a2a2a`/`#333`
  - `--primary: #c1ff00` (neon lime) with `--primary-foreground: #0a0a0a`
  - `--foreground: #ffffff`, `--muted-foreground: #b0b0b0`
- Fonts via Google Fonts `<link>` in `__root.tsx` head: Space Grotesk (headings, uppercase, tracked) and Urbanist (body). Register as `--font-display` and `--font-sans`.
- Card components with subtle dark borders that glow neon on hover/active; ladder rows animate position changes with Framer Motion `layout` + `layoutId`.
- Force dark mode (`<html class="dark">`).

## 2. Lovable Cloud (Supabase) setup

Enable Cloud, then create schema via migration:

- `profiles` (id uuid PK = auth.users.id, display_name, email, avatar_url, created_at)
- `competition` (singleton row: id, name, location, registration_opens_at, registration_closes_at, starts_at, ends_at, status enum: `draft|registration|seeded|active|finished`)
- `registrations` (id, competition_id, user_id unique, joined_at)
- `rankings` (id, competition_id, user_id, position int, updated_at; unique(competition_id, position))
- `challenges` (id, competition_id, challenger_id, opponent_id, status enum: `pending|accepted|declined|expired|completed`, created_at, expires_at = +72h, responded_at)
- `matches` (id, challenge_id, winner_id, loser_id, sets jsonb [{w,l}], played_on date, submitted_by, submitted_at, confirm_deadline = +72h, status enum: `pending_confirmation|confirmed|auto_confirmed|disputed`, confirmed_at, pre_winner_pos, pre_loser_pos)
- `notifications` (id, user_id, type, payload jsonb, read_at, created_at)
- `audit_log` (id, actor_id, action, target jsonb, created_at)
- `app_admins` (email text PK) — seeded with the hardcoded allowlist; `has_role()` security-definer helper joins on `auth.users.email`.

RLS: all tables enabled. Players read ladder/matches/challenges in their competition; write only their own challenges/results. Admins (via `has_role`) full access. Grants per the public-schema rule.

## 3. Server logic (TanStack `createServerFn`, no Edge Functions)

All in `src/lib/*.functions.ts` under `requireSupabaseAuth`, using `supabaseAdmin` for privileged writes:

- `joinCompetition()` — adds to registrations; if status=`active`, also append to `rankings` at bottom position.
- `seedCompetition()` (admin) — random shuffle of registrations into `rankings`, set status=`active`.
- `createChallenge({ opponentId })` — validates challenger ranked below opponent, no existing pending challenge from challenger, sets `expires_at`.
- `respondChallenge({ id, accept })`.
- `submitResult({ challengeId, sets })` — winner enters; computes winner/loser; stores `pre_winner_pos/pre_loser_pos`; status=`pending_confirmation`.
- `confirmResult({ matchId, confirm })` — loser confirms/disputes; on confirm runs `applySlidingRule`.
- `applySlidingRule(competitionId, winnerId, loserId)` — pure function in `src/lib/ranking.ts`:
  - If `winner.pos > loser.pos` (lower rank beats higher): everyone with `pos` in `[loser.pos, winner.pos-1]` shifts +1; winner moves to old `loser.pos`.
  - If `winner.pos < loser.pos`: no change.
- `expireStaleChallenges()` / `autoConfirmStaleMatches()` — run lazily on every relevant read (cheap: a single `update ... where expires_at < now() and status='pending'`). Avoids cron dependency; published-site cron can later hit `/api/public/cron/sweep` if needed.
- `adminOverrideRank`, `resolveDispute`, audit logging.

`applySlidingRule` gets unit-testable shape (pure on an array of `{userId,pos}`).

## 4. Routes (`src/routes/`)

- `/` — landing (hero, how it works, CTA)
- `/auth` — magic link sign-in
- `/join/$token` or `/join` — public open-enrollment join page
- `/_authenticated/route.tsx` — gate (ssr:false)
- `/_authenticated/dashboard` — my rank, active challenge, pending confirmations, notifications
- `/_authenticated/ladder` — animated ladder list with challenge buttons
- `/_authenticated/challenges` — sent/received with countdowns
- `/_authenticated/matches` — history with set scores
- `/_authenticated/admin` — admin-only: competition settings, seeding trigger, disputes, manual overrides, audit log

Each route has its own `head()` metadata.

## 5. Match result format

Best-of-3 sets, optional tiebreak per set. Input: 2–3 set rows of `{winnerGames, loserGames, tiebreak?}`. Validation: standard tennis set scores (6-x with x≤4, 7-5, 7-6 w/ TB).

## 6. Notifications (in-app only)

`notifications` table + bell in header with unread count; React Query polling every 30s. Triggered server-side on: challenge created/accepted/declined/expired, result submitted/confirmed/auto-confirmed, admin actions affecting user.

## 7. PWA

- `public/manifest.webmanifest` with name, short_name "SmashRanking", neon theme/background colors, standalone display, icons (generate 192/512 PNG with neon lime "S" on black).
- `<link rel="manifest">`, `theme-color`, `apple-touch-icon` in `__root.tsx`.
- Manifest-only (Add to Home Screen). No service worker / offline cache per PWA guidance.

## 8. Build order

1. Enable Lovable Cloud.
2. Migration: schema + RLS + grants + admin allowlist seed.
3. Design tokens + fonts + layout shell + landing page.
4. Auth (magic link) + `_authenticated` gate.
5. Registration + join flow.
6. Ladder view + sliding-rule engine + tests-in-comments.
7. Challenge + result + confirmation flows with 72h timers.
8. Notifications + match history.
9. Admin panel (seeding, overrides, disputes, audit).
10. PWA manifest + icons.

## Open inputs needed before build

- The hardcoded admin email(s) for the allowlist.
- Competition initial settings (name, location, dates) — can use placeholders and let admin edit.

```text
ladder positions after sliding rule
before:  1:A  2:B  3:C  4:D  5:E   (E beats B)
after:   1:A  2:E  3:B  4:C  5:D
```
