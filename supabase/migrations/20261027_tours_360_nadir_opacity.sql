-- Tours 360: el logo del suelo debe tapar bien el trípode (antes 70% dejaba ver el piso a través).
ALTER TABLE public.tours ALTER COLUMN nadir_opacity SET DEFAULT 95;
UPDATE public.tours SET nadir_opacity = 95 WHERE nadir_opacity = 70;
