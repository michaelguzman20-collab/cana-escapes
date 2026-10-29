-- Tours 360: imagen de presentación del tour en /tours (ilustración según el tipo de propiedad,
-- para no mostrar la foto real antes de entrar). Valores: villa, apartamento, casa, penthouse,
-- local, oficina, proyecto. null = villa.
alter table public.tours add column if not exists card_image text;
