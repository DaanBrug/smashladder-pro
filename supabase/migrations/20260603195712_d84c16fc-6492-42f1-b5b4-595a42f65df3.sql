-- 1. Lock down app_admins: only admins can read; no client writes
DROP POLICY IF EXISTS "admin list readable" ON public.app_admins;
CREATE POLICY "admins read app_admins" ON public.app_admins
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.app_admins FROM authenticated, anon;
GRANT SELECT ON public.app_admins TO authenticated;
GRANT ALL ON public.app_admins TO service_role;

-- 2. Restrict profiles.email at column level
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, display_name, avatar_url, created_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Helper to read own email (used for legacy callers if needed)
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

-- 3. Revoke EXECUTE on internal SECURITY DEFINER functions from authenticated users.
--    They are only invoked server-side via the service-role client / triggers.
REVOKE EXECUTE ON FUNCTION public.apply_sliding_rule(uuid, uuid, uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.finalize_match(uuid, boolean) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.sweep_timeouts() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.apply_sliding_rule(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_match(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_timeouts() TO service_role;

-- is_admin must remain callable by authenticated users because RLS policies invoke it.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;