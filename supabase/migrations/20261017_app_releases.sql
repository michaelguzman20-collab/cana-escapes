-- Apps descargables (APK) publicadas en canaescapes.com/apps.
-- Cada fila es una versión publicada; las apps consultan la última para avisar de actualizaciones.

CREATE TABLE IF NOT EXISTS public.app_releases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_slug      text NOT NULL,                 -- ej. 'cana-scanner'
  version_name  text NOT NULL,                 -- ej. '1.2.0' (lo que ve la gente)
  version_code  integer NOT NULL,              -- entero que siempre sube (Android versionCode)
  release_notes text,
  apk_url       text NOT NULL,
  apk_size      bigint,
  apk_sha256    text,
  published_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_slug, version_code)
);

CREATE INDEX IF NOT EXISTS app_releases_slug_code_idx ON public.app_releases (app_slug, version_code DESC);

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Cualquiera (incluso sin sesión) puede ver las versiones publicadas
CREATE POLICY "public_select" ON public.app_releases
  FOR SELECT TO anon, authenticated USING (true);

-- Solo administradores publican, editan o borran versiones
CREATE POLICY "admin_write" ON public.app_releases
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Bucket público para los archivos APK
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('apps', 'apps', true, 209715200,
        ARRAY['application/vnd.android.package-archive', 'application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "apps_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'apps' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "apps_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'apps' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "apps_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'apps' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
