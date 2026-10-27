-- Tours 360: logo del suelo totalmente opaco por defecto (al 95% aún se intuía el trípode).
ALTER TABLE public.tours ALTER COLUMN nadir_opacity SET DEFAULT 100;
UPDATE public.tours SET nadir_opacity = 100 WHERE nadir_opacity = 95;
