-- Refuerzo de seguridad (avisos del linter de Supabase, 2026-10-18).
-- 1) search_path fijo en funciones SECURITY DEFINER antiguas.
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.get_guest_users() SET search_path = public;

-- 2) Estas funciones internas solo las usan usuarios con sesión (reglas RLS y el panel de admin):
--    nadie sin iniciar sesión debe poder llamarlas por /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_guest_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fleet_my_admin_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fleet_in_my_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fleet_my_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fleet_in_my_team(uuid) TO authenticated;
