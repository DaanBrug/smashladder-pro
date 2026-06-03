
GRANT EXECUTE ON FUNCTION public.apply_sliding_rule(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_match(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_timeouts() TO service_role;
