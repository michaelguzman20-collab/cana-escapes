-- Tours 360: área de cada foto (Entrada, Comedor, Habitación…) que se muestra como "Tour (Área)",
-- y opacidad del logo del suelo para que tape el trípode sin ser invasivo.

ALTER TABLE public.tour_scenes ADD COLUMN IF NOT EXISTS area text;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS nadir_opacity smallint NOT NULL DEFAULT 70 CHECK (nadir_opacity BETWEEN 10 AND 100);
