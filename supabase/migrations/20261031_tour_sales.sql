-- Tours 360: ventas cerradas, para ver ingresos, costos y ganancia por mes en /admin/tours/precios.
-- amount_usd = lo cobrado al inicio (sin ITBIS, todas las propiedades); monthly_usd = la cuota de la
-- suscripción al mes (todas las propiedades), que cuenta desde el mes siguiente durante `months` meses.
create table if not exists public.tour_sales (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  sale_date   date not null default current_date,
  client_name text not null default '',
  pack        text check (pack in ('e', 'p', 'l')),
  size        text check (size in ('s', 'm', 'l', 'x')),
  pay         text not null default 'unico' check (pay in ('unico', 'suscripcion')),
  qty         int not null default 1 check (qty >= 1),
  amount_usd  numeric(12, 2) not null default 0,
  monthly_usd numeric(12, 2) not null default 0,
  months      int not null default 12 check (months between 0 and 120),
  cost_usd    numeric(12, 2) not null default 0, -- tu tiempo y traslados de esta venta
  status      text not null default 'activa' check (status in ('activa', 'cancelada')),
  quote_id    uuid references public.tour_quotes(id) on delete set null,
  notes       text
);
create index if not exists tour_sales_date_idx on public.tour_sales (sale_date desc);
alter table public.tour_sales enable row level security;
drop policy if exists "admin_all" on public.tour_sales;
create policy "admin_all" on public.tour_sales for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
revoke all on public.tour_sales from anon;
grant select, insert, update, delete on public.tour_sales to authenticated, service_role;
