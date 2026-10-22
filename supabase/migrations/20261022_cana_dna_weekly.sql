-- Cana DNA: indicadores oficiales y registro de la actualización semanal.
-- La tarea semanal (rutina en la nube) agrega una fila en market_updates y
-- actualiza market_indicators con las cifras públicas más recientes.

-- ── Indicadores oficiales (historial por periodo) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.market_indicators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL,          -- 'usd_dop', 'kwh_cepm', 'hotel_occ_bavaro', 'arrivals_puj'
  period      date NOT NULL,          -- fecha del dato (primer día del mes para datos mensuales)
  period_label_es text,               -- ej. 'Ene–Jun 2026' cuando el dato cubre un rango
  period_label_en text,
  value       numeric(14,4) NOT NULL,
  unit        text NOT NULL,          -- 'RD$', 'RD$/kWh', '%', 'turistas'
  label_es    text NOT NULL,
  label_en    text NOT NULL,
  source      text,
  source_url  text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, period)
);

-- ── Registro de actualizaciones semanales ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_updates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at      timestamptz NOT NULL DEFAULT now(),
  summary_es  text NOT NULL,
  summary_en  text NOT NULL,
  sources     text[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS market_updates_ran_at_idx ON public.market_updates (ran_at DESC);

ALTER TABLE public.market_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_updates    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select" ON public.market_indicators FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_select" ON public.market_updates    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin_write" ON public.market_indicators FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write" ON public.market_updates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

grant select on public.market_indicators, public.market_updates to anon;
grant select, insert, update, delete on public.market_indicators, public.market_updates to authenticated;
grant select, insert, update, delete on public.market_indicators, public.market_updates to service_role;

-- ── Datos iniciales (investigados el 22-oct-2026) ───────────────────────────
INSERT INTO public.market_indicators
  (key, period, period_label_es, period_label_en, value, unit, label_es, label_en, source, source_url)
VALUES
  ('usd_dop', '2026-10-19', '19 oct 2026', 'Oct 19, 2026', 61.8322, 'RD$',
   'Dólar (venta)', 'US dollar (sell)', 'Banco Central RD', 'https://www.bancentral.gov.do/a/d/2532-mercado-cambiario'),
  ('kwh_cepm', '2026-10-01', 'Oct 2026', 'Oct 2026', 22.90, 'RD$/kWh',
   'Luz CEPM (tarifa RBT-1)', 'CEPM power (RBT-1 rate)', 'CEPM', 'https://cepm.com.do/en/electricity-rate/'),
  ('hotel_occ_bavaro', '2026-06-01', 'Ene–Jun 2026', 'Jan–Jun 2026', 88.2, '%',
   'Ocupación hotelera Bávaro-Punta Cana', 'Hotel occupancy Bávaro-Punta Cana', 'Banco Central RD (vía inmobiliario.do)', 'https://inmobiliario.do/?p=71040'),
  ('arrivals_puj', '2026-07-01', 'Ene–Jul 2026', 'Jan–Jul 2026', 3656543, 'turistas',
   'Turistas por el aeropuerto PUJ', 'Tourists through PUJ airport', 'Banco Central RD (vía elDinero)', 'https://eldinero.com.do/379492/llegada-de-pasajeros-por-via-aerea-a-rd-crecio-un-9-4-en-enero-julio-de-2026/')
ON CONFLICT (key, period) DO NOTHING;

INSERT INTO public.market_updates (ran_at, summary_es, summary_en, sources) VALUES
  ('2026-10-22 18:00:00+00',
   'Primera actualización: tarifa de luz CEPM (RD$22.90/kWh), dólar a RD$61.83, ocupación hotelera de Bávaro-Punta Cana de 88.2 % en el primer semestre y 3.66 millones de turistas por PUJ de enero a julio.',
   'First update: CEPM power rate (RD$22.90/kWh), dollar at RD$61.83, Bávaro-Punta Cana hotel occupancy of 88.2% in the first half and 3.66 million tourists through PUJ from January to July.',
   ARRAY['https://cepm.com.do/en/electricity-rate/', 'https://www.bancentral.gov.do', 'https://inmobiliario.do/?p=71040', 'https://eldinero.com.do/379492/']);
