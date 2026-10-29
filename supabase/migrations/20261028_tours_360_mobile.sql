-- Versión de cada foto para teléfono (5760 px de ancho, WebP calidad 85): el teléfono ya muestra las
-- fotos a ese tamaño, así que se ve igual y descarga ~37 % menos. Se guarda junto a la foto como <nombre>-m.webp.
-- null = la foto no tiene versión para teléfono (es pequeña o aún no se generó): el teléfono usa image_url.
alter table public.tour_scenes add column if not exists mobile_url text;
