-- Tours 360: solo los tours marcados como ejemplo salen en la página pública /tours.
-- Los tours de clientes se comparten por su enlace directo (/tour/:slug) y no se listan junto a otros clientes.
alter table public.tours add column if not exists showcase boolean not null default false;
