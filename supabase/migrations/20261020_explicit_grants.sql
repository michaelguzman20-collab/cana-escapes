-- Permisos explícitos para la Data API (supabase-js / PostgREST).
--
-- Desde el 30-oct-2026 Supabase deja de dar acceso automático a las tablas NUEVAS de "public".
-- Las tablas existentes conservan sus permisos, pero si la base se recrea desde estas migraciones
-- (proyecto nuevo, restaurar respaldo, branch, `supabase db reset`) quedarían sin acceso.
-- Esta migración deja por escrito los permisos que ya tiene producción (20-oct-2026).
-- La seguridad real la da RLS, que está activado en todas las tablas de "public".
--
-- REGLA para tablas nuevas: en la misma migración que hace CREATE TABLE, añadir sus GRANT:
--   grant select on public.mi_tabla to anon;                                   -- solo si debe leerse sin sesión
--   grant select, insert, update, delete on public.mi_tabla to authenticated;
--   grant select, insert, update, delete on public.mi_tabla to service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
