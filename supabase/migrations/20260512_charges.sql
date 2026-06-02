-- ══════════════════════════════════════════════════════════════════
-- Charges + line items for owner deductions
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.charges (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id),
  owner_id      uuid references public.owners(id),
  category      text not null default 'Otro',
  description   text not null,
  currency      text not null default 'USD',
  amount        numeric(12,2) not null default 0,
  exchange_rate numeric(10,2) not null default 1,
  amount_usd    numeric(12,2) not null default 0,
  date          date not null default current_date,
  status        text not null default 'Pendiente',
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists public.charge_items (
  id          uuid primary key default gen_random_uuid(),
  charge_id   uuid not null references public.charges(id) on delete cascade,
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  total       numeric(12,2) not null default 0,
  sort_order  int not null default 0
);

-- RLS
alter table public.charges enable row level security;
alter table public.charge_items enable row level security;

create policy "Admins full access to charges"
  on public.charges for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins full access to charge_items"
  on public.charge_items for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create index if not exists idx_charges_property on public.charges(property_id);
create index if not exists idx_charges_owner on public.charges(owner_id);
create index if not exists idx_charge_items_charge on public.charge_items(charge_id);
