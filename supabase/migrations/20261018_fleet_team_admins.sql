-- Cana Track: administradores de equipo y tipo de vehículo.
-- El administrador principal (profiles.role = 'admin') ve todo, activa/desactiva
-- administradores de equipo y les asigna usuarios. Un administrador de equipo
-- (role 'track_admin') solo ve a los usuarios que tiene asignados.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'track_admin';

CREATE TABLE IF NOT EXISTS public.fleet_admins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text,
  phone       text,                          -- WhatsApp al que le escriben sus usuarios
  active      boolean NOT NULL DEFAULT false, -- lo activa el administrador principal
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_drivers
  ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.fleet_admins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'carro';
CREATE INDEX IF NOT EXISTS fleet_drivers_admin_idx ON public.fleet_drivers (admin_id);

-- Id del administrador de equipo que ha iniciado sesión (null si no es uno activo)
CREATE OR REPLACE FUNCTION public.fleet_my_admin_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM fleet_admins WHERE user_id = auth.uid() AND active;
$$;

-- ¿Este usuario de Cana Track pertenece a mi equipo?
CREATE OR REPLACE FUNCTION public.fleet_in_my_team(p_driver uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM fleet_drivers d
    JOIN fleet_admins a ON a.id = d.admin_id
    WHERE d.id = p_driver AND a.user_id = auth.uid() AND a.active
  );
$$;

ALTER TABLE public.fleet_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON public.fleet_admins FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "self_select" ON public.fleet_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "team_select" ON public.fleet_drivers   FOR SELECT TO authenticated USING (admin_id IS NOT NULL AND admin_id = public.fleet_my_admin_id());
CREATE POLICY "team_select" ON public.fleet_positions FOR SELECT TO authenticated USING (public.fleet_in_my_team(driver_id));
CREATE POLICY "team_select" ON public.fleet_track     FOR SELECT TO authenticated USING (public.fleet_in_my_team(driver_id));
CREATE POLICY "team_select" ON public.fleet_sessions  FOR SELECT TO authenticated USING (public.fleet_in_my_team(driver_id));
CREATE POLICY "team_select" ON public.fleet_pings     FOR SELECT TO authenticated USING (public.fleet_in_my_team(driver_id));
CREATE POLICY "team_insert" ON public.fleet_pings     FOR INSERT TO authenticated WITH CHECK (public.fleet_in_my_team(driver_id));
CREATE POLICY "team_read"   ON public.fleet_settings  FOR SELECT TO authenticated USING (public.fleet_my_admin_id() IS NOT NULL);

-- El administrador de equipo actualiza su nombre y WhatsApp
CREATE OR REPLACE FUNCTION public.fleet_admin_update_me(p_name text, p_phone text)
RETURNS public.fleet_admins
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE fleet_admins
     SET name = COALESCE(NULLIF(trim(p_name), ''), name),
         phone = NULLIF(trim(p_phone), '')
   WHERE user_id = auth.uid()
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.fleet_admin_update_me(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fleet_admin_update_me(text, text) TO authenticated;

-- El usuario corrige sus datos, ahora con tipo de vehículo
CREATE OR REPLACE FUNCTION public.fleet_update_me(p_name text, p_phone text, p_vehicle text, p_vehicle_type text)
RETURNS public.fleet_drivers
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE fleet_drivers
     SET name = COALESCE(NULLIF(trim(p_name), ''), name),
         phone = NULLIF(trim(p_phone), ''),
         vehicle = NULLIF(trim(p_vehicle), ''),
         vehicle_type = COALESCE(NULLIF(trim(p_vehicle_type), ''), vehicle_type)
   WHERE user_id = auth.uid()
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.fleet_update_me(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fleet_update_me(text, text, text, text) TO authenticated;

-- WhatsApp al que debe escribir el usuario: el de su administrador de equipo,
-- o el general de la oficina si no tiene uno asignado.
CREATE OR REPLACE FUNCTION public.fleet_my_office()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT a.phone FROM fleet_drivers d JOIN fleet_admins a ON a.id = d.admin_id
      WHERE d.user_id = auth.uid() AND a.active AND a.phone IS NOT NULL),
    (SELECT dispatcher_whatsapp FROM fleet_settings WHERE id = 1)
  );
$$;
REVOKE ALL ON FUNCTION public.fleet_my_office() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fleet_my_office() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_admins;

-- Apodo que pone el administrador (se muestra como "Nombre (apodo)")
ALTER TABLE public.fleet_drivers ADD COLUMN IF NOT EXISTS nickname text;
