-- Tours 360: prospectos y seguimiento comercial (/admin/tours/prospectos). Pasa a la web la hoja
-- "Contactos" del Excel de seguimiento: una fila por persona a la que se le habló o se le mandó el PDF,
-- el link o la hoja impresa. Las listas (tipo, zona, cómo llegó…) se guardan como claves cortas; sus
-- nombres viven en src/lib/tourProspects.ts. JARVIS leerá estas tablas para avisar por Telegram.

create table if not exists public.tour_prospects (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  name            text not null default '' check (char_length(name) <= 120),
  company         text check (char_length(company) <= 160),
  kind            text check (kind in ('inmobiliaria', 'administrador', 'dueno', 'agente', 'proyecto', 'hotel', 'alianza', 'otro')),
  phone           text check (char_length(phone) <= 40),
  email           text check (char_length(email) <= 160),
  zone            text check (zone in ('bavaro', 'punta_cana', 'cap_cana', 'uvero_alto', 'cocotal', 'otra')),
  source          text check (source in ('propio', 'referido', 'visita', 'redes', 'web', 'otro')),
  referred_by     text check (char_length(referred_by) <= 120),
  referred_by_id  uuid references public.tour_prospects(id) on delete set null, -- si quien lo refirió también es prospecto
  received        text[] not null default '{}', -- pdf, link, hoja, demo (puede ser varias)
  first_sent_at   date,                          -- fecha del 1er envío
  last_contact_at date,                          -- último contacto (los días sin contacto se calculan)
  responded       boolean not null default false,
  interest        text check (interest in ('alto', 'medio', 'bajo')),
  properties      int check (properties between 0 and 9999),
  status          text not null default 'por_contactar'
                  check (status in ('por_contactar', 'enviado', 'respondio', 'demo', 'propuesta', 'cliente', 'no_interesa')),
  next_step       text check (char_length(next_step) <= 200),
  next_step_date  date,
  quoted_usd      numeric(12, 2), -- a mano (lo que traía el Excel); las cotizaciones ligadas se suman aparte
  sold_usd        numeric(12, 2), -- a mano; las ventas ligadas (tour_sales) se suman aparte
  notes           text check (char_length(notes) <= 4000)
);
create index if not exists tour_prospects_status_idx on public.tour_prospects (status);
create index if not exists tour_prospects_next_idx on public.tour_prospects (next_step_date) where status not in ('cliente', 'no_interesa');

-- Bitácora: cada mensaje, llamada, visita o respuesta. Sirve para "contactos por semana" y para JARVIS.
create table if not exists public.tour_prospect_events (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.tour_prospects(id) on delete cascade,
  created_at  timestamptz not null default now(),
  happened_on date not null default ((now() at time zone 'America/Santo_Domingo')::date),
  kind        text not null check (kind in ('whatsapp', 'llamada', 'visita', 'envio', 'respuesta', 'demo', 'nota', 'estado')),
  template    text check (char_length(template) <= 40), -- qué plantilla de WhatsApp se usó (m1…m7)
  note        text check (char_length(note) <= 2000)
);
create index if not exists tour_prospect_events_prospect_idx on public.tour_prospect_events (prospect_id, happened_on desc);
create index if not exists tour_prospect_events_day_idx on public.tour_prospect_events (happened_on desc);

-- Lo que ya existe se liga al prospecto (cotización, venta, ficha, demo y tour publicado)
alter table public.tour_quotes        add column if not exists prospect_id uuid references public.tour_prospects(id) on delete set null;
alter table public.tour_sales         add column if not exists prospect_id uuid references public.tour_prospects(id) on delete set null;
alter table public.tour_intakes       add column if not exists prospect_id uuid references public.tour_prospects(id) on delete set null;
alter table public.tour_demo_bookings add column if not exists prospect_id uuid references public.tour_prospects(id) on delete set null;
alter table public.tours              add column if not exists prospect_id uuid references public.tour_prospects(id) on delete set null;
create index if not exists tour_quotes_prospect_idx on public.tour_quotes (prospect_id) where prospect_id is not null;
create index if not exists tour_sales_prospect_idx on public.tour_sales (prospect_id) where prospect_id is not null;
create index if not exists tour_intakes_prospect_idx on public.tour_intakes (prospect_id) where prospect_id is not null;
create index if not exists tour_demo_bookings_prospect_idx on public.tour_demo_bookings (prospect_id) where prospect_id is not null;
create index if not exists tours_prospect_idx on public.tours (prospect_id) where prospect_id is not null;

-- Solo el administrador (igual que el resto de Tours 360)
alter table public.tour_prospects enable row level security;
alter table public.tour_prospect_events enable row level security;
drop policy if exists "admin_all" on public.tour_prospects;
create policy "admin_all" on public.tour_prospects for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
drop policy if exists "admin_all" on public.tour_prospect_events;
create policy "admin_all" on public.tour_prospect_events for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
revoke all on public.tour_prospects, public.tour_prospect_events from anon;
grant select, insert, update, delete on public.tour_prospects, public.tour_prospect_events to authenticated, service_role;
