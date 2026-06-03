
-- ============ Enums ============
CREATE TYPE public.competition_status AS ENUM ('draft','registration','active','finished');
CREATE TYPE public.challenge_status   AS ENUM ('pending','accepted','declined','expired','completed');
CREATE TYPE public.match_status       AS ENUM ('pending_confirmation','confirmed','auto_confirmed','disputed');

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ admin allowlist ============
CREATE TABLE public.app_admins (
  email text PRIMARY KEY
);
GRANT SELECT ON public.app_admins TO authenticated;
GRANT ALL ON public.app_admins TO service_role;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin list readable" ON public.app_admins FOR SELECT TO authenticated USING (true);

-- Placeholder admin email — replace with real address from settings
INSERT INTO public.app_admins (email) VALUES ('admin@smashranking.app');

CREATE OR REPLACE FUNCTION public.is_admin(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.app_admins a ON a.email = u.email
    WHERE u.id = _user
  );
$$;

-- ============ competition (single active) ============
CREATE TABLE public.competition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.competition_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competition TO authenticated;
GRANT ALL ON public.competition TO service_role;
ALTER TABLE public.competition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competition readable" ON public.competition FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manages competition" ON public.competition FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- seed singleton
INSERT INTO public.competition (name, location, status)
VALUES ('SmashRanking Ladder', 'TBD', 'registration');

-- ============ registrations ============
CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competition(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regs readable" ON public.registrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "user joins self" ON public.registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user leaves self" ON public.registrations FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ============ rankings ============
CREATE TABLE public.rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competition(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id),
  UNIQUE (competition_id, position) DEFERRABLE INITIALLY DEFERRED
);
GRANT SELECT ON public.rankings TO authenticated;
GRANT ALL ON public.rankings TO service_role;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rankings readable" ON public.rankings FOR SELECT TO authenticated USING (true);

-- ============ challenges ============
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competition(id) ON DELETE CASCADE,
  challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.challenge_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  responded_at timestamptz
);
CREATE INDEX challenges_status_idx ON public.challenges(status);
CREATE INDEX challenges_challenger_idx ON public.challenges(challenger_id);
CREATE INDEX challenges_opponent_idx ON public.challenges(opponent_id);
GRANT SELECT ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges readable" ON public.challenges FOR SELECT TO authenticated USING (true);

-- ============ matches ============
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  competition_id uuid NOT NULL REFERENCES public.competition(id) ON DELETE CASCADE,
  winner_id uuid NOT NULL REFERENCES auth.users(id),
  loser_id uuid NOT NULL REFERENCES auth.users(id),
  sets jsonb NOT NULL, -- [{ w: int, l: int, tb?: int }, ...]
  played_on date NOT NULL DEFAULT current_date,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  confirm_deadline timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  status public.match_status NOT NULL DEFAULT 'pending_confirmation',
  confirmed_at timestamptz,
  pre_winner_pos int,
  pre_loser_pos int
);
CREATE INDEX matches_status_idx ON public.matches(status);
GRANT SELECT ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches readable" ON public.matches FOR SELECT TO authenticated USING (true);

-- ============ notifications ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mark own read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ audit log ============
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ============ sliding rule + apply match ============
-- Pure SQL: given competition, winner, loser; if winner ranked below loser, shift positions
CREATE OR REPLACE FUNCTION public.apply_sliding_rule(_competition uuid, _winner uuid, _loser uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w_pos int;
  l_pos int;
BEGIN
  SELECT position INTO w_pos FROM public.rankings WHERE competition_id = _competition AND user_id = _winner;
  SELECT position INTO l_pos FROM public.rankings WHERE competition_id = _competition AND user_id = _loser;
  IF w_pos IS NULL OR l_pos IS NULL THEN
    RAISE EXCEPTION 'Players not in rankings';
  END IF;
  IF w_pos <= l_pos THEN
    -- Higher-ranked beat lower-ranked; no change.
    RETURN;
  END IF;
  -- defer the unique constraint so we can move multiple rows
  SET CONSTRAINTS ALL DEFERRED;
  -- shift everyone in [l_pos, w_pos-1] down by 1
  UPDATE public.rankings
    SET position = position + 1, updated_at = now()
    WHERE competition_id = _competition
      AND position BETWEEN l_pos AND w_pos - 1;
  -- winner takes loser's old position
  UPDATE public.rankings
    SET position = l_pos, updated_at = now()
    WHERE competition_id = _competition AND user_id = _winner;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_match(_match uuid, _auto boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m record;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = _match FOR UPDATE;
  IF m.status NOT IN ('pending_confirmation') THEN RETURN; END IF;
  PERFORM public.apply_sliding_rule(m.competition_id, m.winner_id, m.loser_id);
  UPDATE public.matches
    SET status = CASE WHEN _auto THEN 'auto_confirmed'::match_status ELSE 'confirmed'::match_status END,
        confirmed_at = now()
    WHERE id = _match;
  IF m.challenge_id IS NOT NULL THEN
    UPDATE public.challenges SET status = 'completed' WHERE id = m.challenge_id;
  END IF;
END;
$$;

-- Sweep: expire stale challenges, auto-confirm stale matches; called by serverFn on reads.
CREATE OR REPLACE FUNCTION public.sweep_timeouts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec record;
BEGIN
  UPDATE public.challenges
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < now();
  FOR rec IN
    SELECT id FROM public.matches
    WHERE status = 'pending_confirmation' AND confirm_deadline < now()
  LOOP
    PERFORM public.finalize_match(rec.id, true);
  END LOOP;
END;
$$;

-- updated_at trigger for competition
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER competition_updated_at BEFORE UPDATE ON public.competition
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
