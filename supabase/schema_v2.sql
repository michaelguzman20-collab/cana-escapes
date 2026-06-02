-- =============================================================
-- Cana Escapes — Schema v2
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =============================================================

-- ─── Properties ───────────────────────────────────────────────
create table if not exists public.properties (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  owner_name       text not null,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  reference_rate   numeric(8,2) not null default 60,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.properties enable row level security;

create policy "Admin full access on properties"
  on public.properties for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Guest reads own property"
  on public.properties for select
  using (owner_profile_id = auth.uid());

-- ─── Reservations ─────────────────────────────────────────────
create table if not exists public.reservations (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references public.properties(id) on delete cascade,
  period_month        smallint not null check (period_month between 1 and 12),
  period_year         smallint not null,
  checkin             date not null,
  checkout            date not null,
  nights              smallint not null,
  guest_name          text not null,
  platform            text not null,
  currency            text not null default 'USD',
  payment_type        text not null default 'Tarjeta',
  gross_amount        numeric(10,2) not null,
  platform_comm_pct   numeric(5,2) not null default 0,
  platform_comm_usd   numeric(10,2) not null default 0,
  card_fee_pct        numeric(5,2) not null default 0,
  card_fee_usd        numeric(10,2) not null default 0,
  extra_pct           numeric(5,2) not null default 0,
  extra_usd           numeric(10,2) not null default 0,
  net_amount          numeric(10,2) not null,
  owner_pct           numeric(5,2) not null,
  owner_amount        numeric(10,2) not null,
  ce_pct              numeric(5,2) not null,
  ce_amount           numeric(10,2) not null,
  exchange_rate       numeric(8,2) not null default 60,
  owner_rds           numeric(12,2) not null default 0,
  status              text not null default 'Pendiente',
  notes               text,
  created_at          timestamptz not null default now()
);

alter table public.reservations enable row level security;

create policy "Admin full access on reservations"
  on public.reservations for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Guest reads own property reservations"
  on public.reservations for select
  using (exists (
    select 1 from public.properties
    where properties.id = reservations.property_id
      and properties.owner_profile_id = auth.uid()
  ));

-- ─── Brackets ─────────────────────────────────────────────────
create table if not exists public.brackets (
  id          uuid primary key default gen_random_uuid(),
  range_min   numeric(10,2) not null default 0,
  range_max   numeric(10,2),             -- null = no upper limit
  owner_pct   numeric(5,2) not null,
  ce_pct      numeric(5,2) not null,
  description text,
  sort_order  smallint not null default 0
);

alter table public.brackets enable row level security;

create policy "Authenticated read brackets"
  on public.brackets for select
  using (auth.uid() is not null);

create policy "Admin full access on brackets"
  on public.brackets for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Seed the 5 default brackets
insert into public.brackets (range_min, range_max, owner_pct, ce_pct, description, sort_order) values
  (0,       1200,   80, 20, 'Modelo base de inicio',        1),
  (1200.01, 1600,   78, 22, 'Nivel 2',                      2),
  (1600.01, 2000,   75, 25, 'Nivel 3',                      3),
  (2000.01, 2500,   73, 27, 'Nivel 4',                      4),
  (2500.01, null,   70, 30, 'Nivel máximo — alto volumen',   5)
on conflict do nothing;
