-- ============================================================
-- Cana Escapes — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Enable UUID extension (already enabled by default on Supabase)
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM: user role
-- ============================================================
create type public.user_role as enum ('admin', 'guest');

-- ============================================================
-- TABLE: profiles
-- Mirrors auth.users; one row per authenticated user.
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  role        public.user_role not null default 'guest',
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'guest'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TABLE: platform_configs
-- Vacation rental platforms with their commission structures.
-- ============================================================
create table public.platform_configs (
  id                uuid primary key default uuid_generate_v4(),
  platform          text not null,
  commission_pct    numeric(5, 2) not null default 0,
  fixed_amount_usd  numeric(10, 2) not null default 0,
  notes             text,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- profiles: users can only read their own row
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can read all profiles (useful for future admin features)
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- platform_configs: all authenticated users can read
alter table public.platform_configs enable row level security;

create policy "Authenticated users can read platform_configs"
  on public.platform_configs for select
  using (auth.role() = 'authenticated');

-- Only admins can insert
create policy "Admins can insert platform_configs"
  on public.platform_configs for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can update
create policy "Admins can update platform_configs"
  on public.platform_configs for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can delete
create policy "Admins can delete platform_configs"
  on public.platform_configs for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- SEED: sample platforms (optional — remove if not needed)
-- ============================================================
insert into public.platform_configs (platform, commission_pct, fixed_amount_usd, notes, active)
values
  ('Airbnb',   14.20, 0.00, 'Comisión sobre el subtotal de la reserva', true),
  ('VRBO',     8.00,  0.00, 'Tarifa de servicio para propietarios',     true),
  ('Booking',  15.00, 0.00, 'Comisión estándar de alojamiento',         true),
  ('Directo',  0.00,  25.00, 'Reservas directas — solo cargo de procesamiento', true);

-- ============================================================
-- HOW TO CREATE YOUR FIRST ADMIN USER
-- ============================================================
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user" and create the user with email + password
-- 3. Then run this SQL (replace with the real user UUID and email):
--
--   update public.profiles
--   set role = 'admin'
--   where email = 'admin@tudominio.com';
--
-- OR pass role in user metadata when creating via the API:
--   { "data": { "role": "admin" } }
-- ============================================================
