-- Tours 360: logo/marca de agua del propietario (en todas las fotos, con enlace opcional)
-- y WhatsApp propio del tour (el botón verde escribe al propietario en vez de solo compartir).
alter table public.tours
  add column if not exists brand_logo_url text,
  add column if not exists brand_logo_path text,
  add column if not exists brand_link text,
  add column if not exists brand_position text not null default 'bottom-right', -- bottom-right | bottom-left | top-right | top-left
  add column if not exists brand_size int not null default 110,                 -- ancho en px (en teléfono se limita)
  add column if not exists whatsapp text;                                       -- número con código de país

-- Estilo de la música de fondo del tour (zen | lounge | tropical | bossa), se elige en Ajustes
alter table public.tours add column if not exists music_style text not null default 'zen';
