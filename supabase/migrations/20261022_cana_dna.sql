-- Cana DNA: inteligencia de mercado de renta corta en Bávaro / Punta Cana (canaescapes.com/cana-dna).
-- Datos propios o públicos, editables desde /admin/cana-dna. Los valores iniciales son
-- ESTIMADOS de referencia (is_estimate = true) y se reemplazan con cifras reales mes a mes.

-- ── Zonas ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_zones (
  slug                 text PRIMARY KEY,               -- ej. 'bavaro'
  name                 text NOT NULL,
  lat                  numeric(9,6) NOT NULL,
  lng                  numeric(9,6) NOT NULL,
  description_es       text,
  description_en       text,
  highlights_es        text[] NOT NULL DEFAULT '{}',
  highlights_en        text[] NOT NULL DEFAULT '{}',
  active_listings      integer,                        -- propiedades activas en renta corta
  listings_growth_pct  numeric(6,2),                   -- crecimiento de oferta vs. año anterior
  avg_property_price   numeric(12,2),                  -- precio típico de compra (USD) para el retorno
  -- Componentes del Cana Score (0–100)
  score_demand         smallint NOT NULL DEFAULT 50 CHECK (score_demand BETWEEN 0 AND 100),
  score_growth         smallint NOT NULL DEFAULT 50 CHECK (score_growth BETWEEN 0 AND 100),
  score_seasonality    smallint NOT NULL DEFAULT 50 CHECK (score_seasonality BETWEEN 0 AND 100),
  score_regulation     smallint NOT NULL DEFAULT 50 CHECK (score_regulation BETWEEN 0 AND 100),
  score_investability  smallint NOT NULL DEFAULT 50 CHECK (score_investability BETWEEN 0 AND 100),
  sort_order           integer NOT NULL DEFAULT 0,
  active               boolean NOT NULL DEFAULT true,
  is_estimate          boolean NOT NULL DEFAULT true,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Métricas mensuales por zona ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_monthly (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_slug        text NOT NULL REFERENCES public.market_zones(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  year             smallint NOT NULL CHECK (year BETWEEN 2015 AND 2100),
  month            smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
  occupancy        numeric(5,2) NOT NULL CHECK (occupancy BETWEEN 0 AND 100),  -- %
  adr              numeric(10,2) NOT NULL CHECK (adr >= 0),                   -- USD por noche
  active_listings  integer,
  is_estimate      boolean NOT NULL DEFAULT true,
  source           text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone_slug, year, month)
);

CREATE INDEX IF NOT EXISTS market_monthly_period_idx ON public.market_monthly (year, month);

-- ── Notas de mercado: alertas, oportunidades y datos de turismo ──────────────
CREATE TABLE IF NOT EXISTS public.market_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('alert', 'opportunity', 'stat')),
  value       text,                      -- cifra destacada, ej. '11.7M'
  title_es    text NOT NULL,
  title_en    text NOT NULL,
  body_es     text,
  body_en     text,
  source      text,
  source_url  text,
  sort_order  integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Seguridad: lectura pública, escritura solo admin ────────────────────────
ALTER TABLE public.market_zones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_notes   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select" ON public.market_zones   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_select" ON public.market_monthly FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_select" ON public.market_notes   FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin_write" ON public.market_zones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write" ON public.market_monthly FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write" ON public.market_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

grant select on public.market_zones, public.market_monthly, public.market_notes to anon;
grant select, insert, update, delete on public.market_zones, public.market_monthly, public.market_notes to authenticated;
grant select, insert, update, delete on public.market_zones, public.market_monthly, public.market_notes to service_role;

-- ── Datos de referencia (estimados) ─────────────────────────────────────────
INSERT INTO public.market_zones
  (slug, name, lat, lng, description_es, description_en, highlights_es, highlights_en,
   active_listings, listings_growth_pct, avg_property_price,
   score_demand, score_growth, score_seasonality, score_regulation, score_investability, sort_order)
VALUES
  ('bavaro', 'Bávaro', 18.652, -68.432,
   'El corazón turístico: playa, plazas comerciales y la mayor oferta de condos. Mucha demanda, pero también mucha competencia.',
   'The tourist heart: beaches, shopping plazas and the largest condo supply. Strong demand, but heavy competition.',
   ARRAY['Mayor volumen de huéspedes', 'Playa Bávaro y Los Corales a pie', 'Competencia alta en $80–150'],
   ARRAY['Highest guest volume', 'Walk to Bávaro & Los Corales beaches', 'Crowded $80–150 segment'],
   5200, 38, 165000, 78, 55, 62, 55, 64, 1),
  ('cortecito', 'El Cortecito · Los Corales', 18.700, -68.408,
   'Frente de playa con restaurantes y vida nocturna. Ideal para estancias cortas de parejas y grupos.',
   'Beachfront strip with restaurants and nightlife. Great for short stays by couples and groups.',
   ARRAY['Primera línea de playa', 'Restaurantes y bares a pie', 'Estancias cortas frecuentes'],
   ARRAY['Beachfront location', 'Walkable restaurants and bars', 'Frequent short stays'],
   1400, 24, 185000, 74, 60, 60, 55, 66, 2),
  ('cana-bay', 'Cana Bay · Hard Rock', 18.735, -68.470,
   'Comunidad cerrada junto al Hard Rock y el campo de golf Jack Nicklaus. Casino y club de playa como diferenciadores.',
   'Gated community next to Hard Rock and the Jack Nicklaus golf course. Casino and beach club set it apart.',
   ARRAY['Acceso a casino y club nocturno', 'Golf Jack Nicklaus', 'Club de playa con costo aparte'],
   ARRAY['Casino and nightclub access', 'Jack Nicklaus golf', 'Beach club at extra cost'],
   520, 47, 220000, 70, 72, 58, 60, 74, 3),
  ('uvero-alto', 'Uvero Alto · Macao', 18.795, -68.585,
   'Zona de resorts y playas tranquilas al norte. Menos oferta y huéspedes que buscan desconexión.',
   'Resort area with quiet beaches to the north. Less supply and guests looking to unplug.',
   ARRAY['Poca competencia', 'Playas vírgenes y Macao', 'Más lejos del aeropuerto'],
   ARRAY['Low competition', 'Pristine beaches and Macao', 'Farther from the airport'],
   380, 30, 175000, 58, 66, 52, 55, 62, 4),
  ('veron', 'Verón · Friusa', 18.610, -68.440,
   'Zona residencial con precios de compra más bajos. Atrae estancias largas, nómadas digitales y trabajadores del sector.',
   'Residential area with lower purchase prices. Draws long stays, digital nomads and industry workers.',
   ARRAY['Precio de entrada más bajo', 'Estancias de 7+ noches', 'Lejos de la playa'],
   ARRAY['Lowest entry price', '7+ night stays', 'Away from the beach'],
   900, 41, 95000, 55, 68, 70, 55, 70, 5),
  ('punta-cana', 'Punta Cana Village', 18.530, -68.375,
   'Junto al aeropuerto y Puntacana Resort. Público familiar y de golf con tarifas medias altas.',
   'Next to the airport and Puntacana Resort. Family and golf travellers with upper-mid rates.',
   ARRAY['5 min del aeropuerto PUJ', 'Golf y club de playa', 'Tarifas medias altas'],
   ARRAY['5 min from PUJ airport', 'Golf and beach club', 'Upper-mid rates'],
   950, 22, 260000, 72, 58, 64, 60, 60, 6),
  ('cap-cana', 'Cap Cana', 18.465, -68.405,
   'El segmento de lujo: villas, marina y Juanillo. Pocas propiedades con tarifas muy altas.',
   'The luxury segment: villas, marina and Juanillo beach. Few properties with very high rates.',
   ARRAY['Segmento lujo', 'Marina y playa Juanillo', 'Inversión de entrada alta'],
   ARRAY['Luxury segment', 'Marina and Juanillo beach', 'High entry investment'],
   620, 18, 480000, 66, 54, 66, 60, 52, 7),
  ('bayahibe', 'Bayahibe · Dominicus', 18.370, -68.840,
   'Pueblo costero tranquilo cerca de Saona. Menos oferta, buena demanda europea.',
   'Quiet coastal village near Saona island. Less supply, strong European demand.',
   ARRAY['Puerta a Isla Saona', 'Demanda europea', 'A 1 h de Punta Cana'],
   ARRAY['Gateway to Saona Island', 'European demand', '1 h from Punta Cana'],
   700, 20, 140000, 64, 70, 62, 55, 76, 8)
ON CONFLICT (slug) DO NOTHING;

-- 24 meses (nov-2024 a oct-2026) = base de la zona × estacionalidad × tendencia de año.
-- Estacionalidad de Punta Cana: alta dic–abr (Semana Santa), media jul–ago, baja sep–oct.
WITH base(slug, occ, adr) AS (
  VALUES ('bavaro', 52.0, 118.0), ('cortecito', 54.0, 128.0), ('cana-bay', 55.0, 145.0),
         ('uvero-alto', 47.0, 160.0), ('veron', 50.0, 72.0), ('punta-cana', 53.0, 190.0),
         ('cap-cana', 44.0, 420.0), ('bayahibe', 49.0, 98.0)
), season(month, occ_f, adr_f) AS (
  VALUES (1, 1.22, 1.18), (2, 1.25, 1.20), (3, 1.25, 1.18), (4, 1.12, 1.08),
         (5, 0.88, 0.90), (6, 0.88, 0.88), (7, 1.05, 0.98), (8, 0.98, 0.95),
         (9, 0.70, 0.82), (10, 0.72, 0.84), (11, 0.92, 0.92), (12, 1.10, 1.15)
), periods AS (
  SELECT d::date AS d FROM generate_series('2024-11-01'::date, '2026-10-01'::date, interval '1 month') AS d
)
INSERT INTO public.market_monthly (zone_slug, year, month, occupancy, adr, is_estimate, source)
SELECT b.slug,
       extract(year FROM p.d)::smallint,
       extract(month FROM p.d)::smallint,
       -- Año anterior: algo más de ocupación y tarifa más baja (la oferta nueva presiona la ocupación)
       least(95, round((b.occ * s.occ_f * CASE WHEN p.d < '2025-11-01' THEN 1.04 ELSE 1.0 END)::numeric, 1)),
       round((b.adr * s.adr_f * CASE WHEN p.d < '2025-11-01' THEN 0.95 ELSE 1.0 END)::numeric, 0),
       true,
       'Estimado de referencia Cana Escapes'
FROM base b
CROSS JOIN periods p
JOIN season s ON s.month = extract(month FROM p.d)
ON CONFLICT (zone_slug, year, month) DO NOTHING;

INSERT INTO public.market_notes (kind, value, title_es, title_en, body_es, body_en, source, source_url, sort_order) VALUES
  ('stat', '11.7M', 'Turistas en RD en 2025', 'Visitors to the DR in 2025',
   'Récord histórico de llegadas. La meta para 2026 supera los 12 millones.',
   'All-time record arrivals. The 2026 target is over 12 million.',
   'MITUR / Banco Central RD', 'https://www.bancentral.gov.do/a/d/2537-sector-turismo', 1),
  ('stat', '≈ 2/3', 'Llegadas por el aeropuerto de Punta Cana', 'Arrivals through Punta Cana airport',
   'PUJ recibe la mayoría de los turistas aéreos del país: la demanda se concentra en esta zona.',
   'PUJ handles most of the country''s air tourists, concentrating demand in this area.',
   'Banco Central RD — llegadas por aeropuerto', 'https://www.bancentral.gov.do/a/d/2537-sector-turismo', 2),
  ('stat', '18%', 'ITBIS sobre el ingreso bruto', 'ITBIS (VAT) on gross income',
   'Airbnb no lo cobra en RD: el anfitrión debe registrarse en la DGII y pagarlo.',
   'Airbnb does not collect it in the DR: hosts must register with DGII and pay it.',
   'DGII', 'https://dgii.gov.do', 3),
  ('alert', '+47%', 'Oferta nueva en 2025', 'New supply in 2025',
   'Crecieron fuerte los anuncios nuevos en Punta Cana. El segmento genérico de $80–150 sufre bajadas de precio.',
   'New listings grew sharply in Punta Cana. The generic $80–150 segment faces price pressure.',
   'Análisis de mercado Cana Escapes (jun 2026)', NULL, 10),
  ('alert', NULL, 'Acceso a playa no incluido en Cana Bay', 'Beach access not included at Cana Bay',
   'El huésped paga entre $35 y $118 por el club de playa. Es la queja #1: dilo en las 3 primeras líneas del anuncio.',
   'Guests pay $35–118 for the beach club. It is the #1 complaint: say it in the first 3 lines of the listing.',
   'Reseñas de huéspedes analizadas por Cana Escapes', NULL, 11),
  ('alert', NULL, 'Regulación en camino', 'Regulation on the way',
   'MITUR prepara el marco de renta corta. Registrarse antes da ventaja.',
   'MITUR is preparing a short-term rental framework. Registering early is an advantage.',
   'MITUR', 'https://www.mitur.gob.do', 12),
  ('opportunity', '+15–25%', 'Carrito de golf incluido', 'Golf cart included',
   'Casi ningún competidor lo ofrece y permite subir la tarifa por noche.',
   'Almost no competitor offers it, and it lifts the nightly rate.',
   'Análisis de mercado Cana Escapes (jun 2026)', NULL, 20),
  ('opportunity', '$2–4K/año', 'Servicios extra', 'Upsells',
   'Late check-out, early check-in y traslados: la mayoría de anfitriones no los vende.',
   'Late check-out, early check-in and transfers: most hosts don''t sell them.',
   'Análisis de mercado Cana Escapes (jun 2026)', NULL, 21),
  ('opportunity', '15.5% → 12%', 'Multicanal', 'Multi-channel',
   'Mezclar Airbnb, VRBO, Booking y reservas directas baja la comisión promedio y llega al viajero europeo.',
   'Mixing Airbnb, VRBO, Booking and direct bookings lowers average commission and reaches European travellers.',
   'Análisis de mercado Cana Escapes (jun 2026)', NULL, 22);
