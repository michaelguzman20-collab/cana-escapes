-- Cana Flota: ubicación en tiempo real de los choferes (app Android "Cana Flota").
-- El chofer reporta su posición y batería con fleet_report(); el administrador ve
-- el mapa en vivo (Realtime sobre fleet_positions) y le envía "timbres" (fleet_pings).

-- Rol propio para las cuentas de chofer (no ven nada del portal de propietarios)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'driver';

CREATE TABLE IF NOT EXISTS public.fleet_drivers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,                          -- WhatsApp del chofer, ej. 18095551234
  vehicle     text,                          -- ej. 'Hiace blanca A123456'
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Última posición conocida de cada chofer (una fila por chofer)
CREATE TABLE IF NOT EXISTS public.fleet_positions (
  driver_id   uuid PRIMARY KEY REFERENCES public.fleet_drivers(id) ON DELETE CASCADE,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  accuracy    real,                          -- metros
  speed       real,                          -- m/s
  heading     real,                          -- grados
  battery     real,                          -- 0..1
  charging    boolean,
  on_duty     boolean NOT NULL DEFAULT true,
  recorded_at timestamptz NOT NULL,          -- hora del GPS
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Recorrido (se guardan 30 días)
CREATE TABLE IF NOT EXISTS public.fleet_track (
  id          bigserial PRIMARY KEY,
  driver_id   uuid NOT NULL REFERENCES public.fleet_drivers(id) ON DELETE CASCADE,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  speed       real,
  recorded_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS fleet_track_driver_time_idx ON public.fleet_track (driver_id, recorded_at DESC);

-- "Timbres": aviso del administrador para que el chofer le escriba por WhatsApp
CREATE TABLE IF NOT EXISTS public.fleet_pings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     uuid NOT NULL REFERENCES public.fleet_drivers(id) ON DELETE CASCADE,
  message       text,
  reply_phone   text,                        -- WhatsApp al que debe escribir el chofer
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  delivered_at  timestamptz                  -- cuando el teléfono del chofer lo recibió
);
CREATE INDEX IF NOT EXISTS fleet_pings_pending_idx ON public.fleet_pings (driver_id) WHERE delivered_at IS NULL;

-- Ajustes generales (una sola fila)
CREATE TABLE IF NOT EXISTS public.fleet_settings (
  id                  int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dispatcher_whatsapp text
);
INSERT INTO public.fleet_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.fleet_drivers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_track     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_pings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_settings  ENABLE ROW LEVEL SECURITY;

-- Administradores: todo
CREATE POLICY "admin_all" ON public.fleet_drivers   FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all" ON public.fleet_positions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all" ON public.fleet_track     FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all" ON public.fleet_pings     FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all" ON public.fleet_settings  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Chofer: solo ve su propia ficha. Todo lo que escribe pasa por fleet_report().
CREATE POLICY "driver_own" ON public.fleet_drivers FOR SELECT TO authenticated USING (user_id = auth.uid());

-- El chofer envía un lote de posiciones (las que acumuló si estuvo sin señal)
-- y recibe los timbres pendientes, que quedan marcados como entregados.
-- points: [{lat, lng, accuracy, speed, heading, t}] con t en milisegundos epoch.
CREATE OR REPLACE FUNCTION public.fleet_report(
  points   jsonb,
  battery  real,
  charging boolean,
  on_duty  boolean
) RETURNS TABLE (id uuid, message text, reply_phone text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d_id uuid;
  latest jsonb;
BEGIN
  SELECT fd.id INTO d_id FROM fleet_drivers fd WHERE fd.user_id = auth.uid() AND fd.active;
  IF d_id IS NULL THEN
    RAISE EXCEPTION 'No es un chofer activo';
  END IF;

  IF jsonb_typeof(points) = 'array' AND jsonb_array_length(points) > 0 THEN
    INSERT INTO fleet_track (driver_id, lat, lng, speed, recorded_at)
    SELECT d_id, (p->>'lat')::float8, (p->>'lng')::float8, (p->>'speed')::real,
           to_timestamp((p->>'t')::float8 / 1000)
    FROM jsonb_array_elements(points) p
    LIMIT 2000;

    SELECT p INTO latest FROM jsonb_array_elements(points) p ORDER BY (p->>'t')::float8 DESC LIMIT 1;

    INSERT INTO fleet_positions AS fp (driver_id, lat, lng, accuracy, speed, heading, battery, charging, on_duty, recorded_at, updated_at)
    VALUES (d_id, (latest->>'lat')::float8, (latest->>'lng')::float8, (latest->>'accuracy')::real,
            (latest->>'speed')::real, (latest->>'heading')::real, fleet_report.battery, fleet_report.charging, fleet_report.on_duty,
            to_timestamp((latest->>'t')::float8 / 1000), now())
    ON CONFLICT (driver_id) DO UPDATE SET
      lat = EXCLUDED.lat, lng = EXCLUDED.lng, accuracy = EXCLUDED.accuracy, speed = EXCLUDED.speed,
      heading = EXCLUDED.heading, battery = EXCLUDED.battery, charging = EXCLUDED.charging,
      on_duty = EXCLUDED.on_duty, recorded_at = EXCLUDED.recorded_at, updated_at = now()
    WHERE EXCLUDED.recorded_at >= fp.recorded_at;
  ELSE
    -- Sin posiciones nuevas (p. ej. al terminar el turno): solo estado y batería
    UPDATE fleet_positions fp SET battery = fleet_report.battery, charging = fleet_report.charging,
           on_duty = fleet_report.on_duty, updated_at = now()
    WHERE fp.driver_id = d_id;
  END IF;

  DELETE FROM fleet_track ft WHERE ft.driver_id = d_id AND ft.recorded_at < now() - interval '30 days';

  RETURN QUERY
  UPDATE fleet_pings pi SET delivered_at = now()
  WHERE pi.driver_id = d_id AND pi.delivered_at IS NULL AND pi.created_at > now() - interval '1 hour'
  RETURNING pi.id, pi.message, pi.reply_phone, pi.created_at;
END $$;

REVOKE ALL ON FUNCTION public.fleet_report(jsonb, real, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fleet_report(jsonb, real, boolean, boolean) TO authenticated;

-- Mapa en vivo del administrador
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_pings;

-- El chofer puede leer el WhatsApp de la oficina
CREATE POLICY "driver_read" ON public.fleet_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.fleet_drivers WHERE user_id = auth.uid() AND active));

-- El chofer corrige su nombre, WhatsApp y vehículo (se registra solo con correo y contraseña)
CREATE OR REPLACE FUNCTION public.fleet_update_me(p_name text, p_phone text, p_vehicle text)
RETURNS public.fleet_drivers
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE fleet_drivers
     SET name = COALESCE(NULLIF(trim(p_name), ''), name),
         phone = NULLIF(trim(p_phone), ''),
         vehicle = NULLIF(trim(p_vehicle), '')
   WHERE user_id = auth.uid()
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.fleet_update_me(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fleet_update_me(text, text, text) TO authenticated;
