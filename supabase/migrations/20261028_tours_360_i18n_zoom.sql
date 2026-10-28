-- Tours 360: textos en inglés (botón ES/EN del visor) y zoom inicial un poco más cerca.
-- area_en / description_en son opcionales: si faltan, el visor traduce el área solo (translateArea).
alter table public.tours add column if not exists description_en text;
alter table public.tour_scenes add column if not exists area_en text;

-- Totalmente alejado (120°) se veía deformado en los laterales: se entra a 110° (~8% más cerca)
alter table public.tour_scenes alter column fov_initial set default 110;
update public.tour_scenes set fov_initial = 110 where fov_initial >= 120 and fov_max >= 110;
