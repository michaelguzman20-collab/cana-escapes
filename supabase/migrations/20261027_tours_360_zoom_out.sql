-- Tours 360: las fotos se abren lo más alejadas posible (campo de visión máximo permitido, 120°).
ALTER TABLE public.tour_scenes
  ALTER COLUMN fov_max SET DEFAULT 120,
  ALTER COLUMN fov_initial SET DEFAULT 120;

UPDATE public.tour_scenes SET fov_max = 120, fov_initial = 120;
