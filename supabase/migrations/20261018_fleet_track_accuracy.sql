-- Cana Track: el recorrido ignora puntos con precisión peor de 60 m (evita líneas en zigzag).
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
    RAISE EXCEPTION 'No es un usuario activo';
  END IF;

  IF jsonb_typeof(points) = 'array' AND jsonb_array_length(points) > 0 THEN
    INSERT INTO fleet_track (driver_id, lat, lng, speed, recorded_at)
    SELECT d_id, (p->>'lat')::float8, (p->>'lng')::float8, (p->>'speed')::real,
           to_timestamp((p->>'t')::float8 / 1000)
    FROM jsonb_array_elements(points) p
    -- Puntos imprecisos (GPS bajo techo, por wifi/antena) dibujan saltos falsos en el recorrido
    WHERE COALESCE((p->>'accuracy')::real, 0) <= 60
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
    UPDATE fleet_positions fp SET battery = fleet_report.battery, charging = fleet_report.charging,
           on_duty = fleet_report.on_duty, updated_at = now()
    WHERE fp.driver_id = d_id;
  END IF;

  -- Historial de sesiones
  IF fleet_report.on_duty THEN
    UPDATE fleet_sessions fs SET last_seen_at = now(), battery_end = fleet_report.battery
    WHERE fs.driver_id = d_id AND fs.ended_at IS NULL;
    IF NOT FOUND THEN
      INSERT INTO fleet_sessions (driver_id, battery_start, battery_end)
      VALUES (d_id, fleet_report.battery, fleet_report.battery);
    END IF;
  ELSE
    UPDATE fleet_sessions fs SET ended_at = now(), last_seen_at = now(),
           battery_end = COALESCE(fleet_report.battery, fs.battery_end)
    WHERE fs.driver_id = d_id AND fs.ended_at IS NULL;
  END IF;

  DELETE FROM fleet_track ft WHERE ft.driver_id = d_id AND ft.recorded_at < now() - interval '30 days';

  RETURN QUERY
  UPDATE fleet_pings pi SET delivered_at = now()
  WHERE pi.driver_id = d_id AND pi.delivered_at IS NULL AND pi.created_at > now() - interval '1 hour'
  RETURNING pi.id, pi.message, pi.reply_phone, pi.created_at;
END $$;
