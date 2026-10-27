-- Tours 360: recorridos virtuales propios (reemplazo de Kuula) en canaescapes.com/tours y /tour/:slug.
-- Aquí solo vive la información del tour (escenas, puntos, textos). Las fotos 360 se guardan fuera:
-- por ahora en el bucket público de prueba "tours-dev" (plan gratis = 1 GB, usar solo 1-2 tours),
-- y más adelante en Cloudflare R2. Ver src/lib/tourStorage.ts.

-- ── Tours ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tours (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title          text NOT NULL,
  description    text,
  cover_url      text,                       -- miniatura para la galería (normalmente la de la 1ª escena)
  published      boolean NOT NULL DEFAULT false,
  property_name  text,                       -- ej. 'Cana Rock 2B'
  location       text,                       -- ej. 'Cana Bay, Punta Cana'
  bedrooms       smallint,
  bathrooms      numeric(3,1),
  start_scene_id uuid,                       -- escena inicial (FK abajo)
  autorotate     boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Escenas (una foto 360 cada una) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tour_scenes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id        uuid NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  title          text NOT NULL DEFAULT '',
  image_url      text NOT NULL,              -- panorama equirectangular (WebP, máx. 8192x4096)
  thumb_url      text,                       -- miniatura pequeña
  storage_path   text,                       -- ruta en el almacenamiento, para poder borrarla
  sort_order     integer NOT NULL DEFAULT 0,
  initial_yaw    double precision NOT NULL DEFAULT 0,   -- radianes
  initial_pitch  double precision NOT NULL DEFAULT 0,   -- radianes
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tour_scenes_tour_idx ON public.tour_scenes (tour_id, sort_order);

ALTER TABLE public.tours
  DROP CONSTRAINT IF EXISTS tours_start_scene_fk,
  ADD CONSTRAINT tours_start_scene_fk FOREIGN KEY (start_scene_id)
    REFERENCES public.tour_scenes(id) ON DELETE SET NULL;

-- ── Puntos dentro de una escena: flecha "ir a" o punto de información ───────
CREATE TABLE IF NOT EXISTS public.tour_hotspots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id         uuid NOT NULL REFERENCES public.tour_scenes(id) ON DELETE CASCADE,
  type             text NOT NULL CHECK (type IN ('link', 'info')),
  yaw              double precision NOT NULL,
  pitch            double precision NOT NULL,
  target_scene_id  uuid REFERENCES public.tour_scenes(id) ON DELETE CASCADE,
  title            text,
  text             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (type <> 'link' OR target_scene_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS tour_hotspots_scene_idx ON public.tour_hotspots (scene_id);

-- ── Seguridad: el público solo ve tours publicados; escribe solo admin ──────
ALTER TABLE public.tours         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_scenes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_hotspots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select_published" ON public.tours FOR SELECT TO anon, authenticated
  USING (published);
CREATE POLICY "public_select_published" ON public.tour_scenes FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.tours t WHERE t.id = tour_id AND t.published));
CREATE POLICY "public_select_published" ON public.tour_hotspots FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.tour_scenes s JOIN public.tours t ON t.id = s.tour_id
                 WHERE s.id = scene_id AND t.published));

CREATE POLICY "admin_write" ON public.tours FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write" ON public.tour_scenes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write" ON public.tour_hotspots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

grant select on public.tours, public.tour_scenes, public.tour_hotspots to anon;
grant select, insert, update, delete on public.tours, public.tour_scenes, public.tour_hotspots to authenticated;
grant select, insert, update, delete on public.tours, public.tour_scenes, public.tour_hotspots to service_role;

-- ── Almacenamiento TEMPORAL de fotos: bucket público "tours-dev" ────────────
-- Solo para 1-2 tours de prueba hasta activar Cloudflare R2. Máx. 12 MB por archivo.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tours-dev', 'tours-dev', true, 12582912, ARRAY['image/webp', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "tours_dev_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tours-dev'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "tours_dev_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tours-dev'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "tours_dev_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tours-dev'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
