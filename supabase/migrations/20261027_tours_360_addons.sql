-- Tours 360: los puntos pasan a ser "addons" como en Kuula (ícono, texto o imagen), con acción al tocar,
-- estilo (tamaño, opacidad, rotación, color, posición 2D/pared/piso/techo, etiqueta, animación) y opción
-- "master" (se ve en todas las fotos del tour). Zoom inicial pasa a guardarse en grados (fov_initial).

ALTER TABLE public.tour_hotspots
  ADD COLUMN IF NOT EXISTS kind        text NOT NULL DEFAULT 'icon',
  ADD COLUMN IF NOT EXISTS icon        text,                       -- id de ícono de la galería (ver tourAddons.ts)
  ADD COLUMN IF NOT EXISTS image_url   text,                       -- imagen propia (addon imagen o ícono propio)
  ADD COLUMN IF NOT EXISTS image_path  text,
  ADD COLUMN IF NOT EXISTS action      text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS url         text,                       -- acción "abrir enlace" / video de la tarjeta
  ADD COLUMN IF NOT EXISTS style       jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS master      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_in     uuid[] NOT NULL DEFAULT '{}';

-- Convertir los puntos existentes
UPDATE public.tour_hotspots SET kind = 'icon', icon = 'chevron', action = 'scene' WHERE type = 'link';
UPDATE public.tour_hotspots SET kind = 'icon', icon = 'info', action = 'card' WHERE type = 'info';

ALTER TABLE public.tour_hotspots DROP CONSTRAINT IF EXISTS tour_hotspots_check;
ALTER TABLE public.tour_hotspots DROP CONSTRAINT IF EXISTS tour_hotspots_type_check;
ALTER TABLE public.tour_hotspots DROP COLUMN IF EXISTS type;
ALTER TABLE public.tour_hotspots
  ADD CONSTRAINT tour_hotspots_kind_check CHECK (kind IN ('icon', 'text', 'image')),
  ADD CONSTRAINT tour_hotspots_action_check CHECK (action IN ('none', 'scene', 'card', 'url')),
  ADD CONSTRAINT tour_hotspots_scene_target_check CHECK (action <> 'scene' OR target_scene_id IS NOT NULL);

-- Zoom inicial en grados de campo de visión (antes 0-100 relativo a los límites)
ALTER TABLE public.tour_scenes ADD COLUMN IF NOT EXISTS fov_initial smallint;
UPDATE public.tour_scenes
  SET fov_initial = round(fov_max - (zoom_initial / 100.0) * (fov_max - fov_min))
  WHERE fov_initial IS NULL;
ALTER TABLE public.tour_scenes
  ALTER COLUMN fov_initial SET DEFAULT 75,
  ALTER COLUMN fov_initial SET NOT NULL,
  ADD CONSTRAINT tour_scenes_fov_initial_check CHECK (fov_initial BETWEEN 10 AND 120);
ALTER TABLE public.tour_scenes DROP COLUMN IF EXISTS zoom_initial;
ALTER TABLE public.tour_scenes ALTER COLUMN fov_max SET DEFAULT 100;
