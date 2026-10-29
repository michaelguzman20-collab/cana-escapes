-- Tours 360: fichas de clientes (la entrevista con el propietario antes de crear su tour).
-- Los campos de la ficha van en `data` (mismas claves que el PDF rellenable: src/content/tourIntakeSchema.json).
-- Solo el administrador las ve. La foto/PDF de la ficha va al bucket PRIVADO "tour-intakes" (datos personales).
CREATE TABLE IF NOT EXISTS public.tour_intakes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name     text,
  company         text,
  property_name   text,
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachment_path text,           -- ruta en el bucket tour-intakes (foto o PDF de la ficha)
  attachment_type text,           -- mime type
  tour_id         uuid REFERENCES public.tours(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON public.tour_intakes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_intakes TO authenticated, service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tour-intakes', 'tour-intakes', false, 15728640, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tour_intakes_admin_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tour-intakes'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "tour_intakes_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tour-intakes'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "tour_intakes_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tour-intakes'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "tour_intakes_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tour-intakes'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
