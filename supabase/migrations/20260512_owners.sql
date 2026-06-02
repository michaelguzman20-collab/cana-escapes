-- ══════════════════════════════════════════════════════════════════
-- Owners table + link to properties
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.owners (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  co_owner_name text,                       -- spouse / partner
  email         text,
  phone         text,
  cedula_pasaporte text,
  nationality   text,
  address       text,
  bank_name     text,
  bank_account  text,
  bank_account_type text,                   -- ahorro / corriente
  contract_start date,
  contract_end   date,
  commission_notes text,
  emergency_contact text,
  emergency_phone   text,
  notes         text,
  active        boolean not null default true,
  profile_id    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

-- Link properties → owners
alter table public.properties
  add column if not exists owner_id uuid references public.owners(id);

-- RLS
alter table public.owners enable row level security;

create policy "Admins full access to owners"
  on public.owners for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Index for FK lookups
create index if not exists idx_properties_owner_id on public.properties(owner_id);
