-- Tours 360: herramientas de edición estilo Kuula.
-- Por escena: nivelación, zoom inicial y límites, límite vertical, filtros (aplicados a la foto).
-- Por tour: logo de Cana Escapes en el suelo (nadir) para tapar el trípode.

ALTER TABLE public.tour_scenes
  ADD COLUMN IF NOT EXISTS correction_roll  double precision NOT NULL DEFAULT 0,  -- grados, nivelación (giro)
  ADD COLUMN IF NOT EXISTS correction_tilt  double precision NOT NULL DEFAULT 0,  -- grados, inclinación adelante/atrás
  ADD COLUMN IF NOT EXISTS zoom_initial     smallint NOT NULL DEFAULT 50 CHECK (zoom_initial BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS fov_min          smallint NOT NULL DEFAULT 30 CHECK (fov_min BETWEEN 10 AND 120),  -- zoom máximo
  ADD COLUMN IF NOT EXISTS fov_max          smallint NOT NULL DEFAULT 90 CHECK (fov_max BETWEEN 10 AND 120),  -- zoom mínimo
  ADD COLUMN IF NOT EXISTS pitch_limit      smallint NOT NULL DEFAULT 90 CHECK (pitch_limit BETWEEN 0 AND 90),
  ADD COLUMN IF NOT EXISTS filters          jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {brightness, contrast, saturation, hdr, sharpness}
  ADD COLUMN IF NOT EXISTS base_url         text,                                -- foto sin filtros (si se aplicaron filtros)
  ADD COLUMN IF NOT EXISTS base_path        text;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS nadir_logo  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nadir_size  smallint NOT NULL DEFAULT 22 CHECK (nadir_size BETWEEN 5 AND 45);  -- grados desde el suelo
