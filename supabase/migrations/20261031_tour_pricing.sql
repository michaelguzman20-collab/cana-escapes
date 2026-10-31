-- Tours 360: lista de precios, tasa del dólar y costos fijos del negocio (una sola fila).
-- La página /admin/tours/precios guarda aquí todo lo que se ajusta (data jsonb); si la fila está
-- vacía usa los valores sugeridos del código (src/lib/tourPricing.ts). Solo el administrador.
create table if not exists public.tour_pricing (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.tour_pricing (id) values (1) on conflict (id) do nothing;
alter table public.tour_pricing enable row level security;
drop policy if exists "admin_all" on public.tour_pricing;
create policy "admin_all" on public.tour_pricing for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
revoke all on public.tour_pricing from anon;
grant select, insert, update on public.tour_pricing to authenticated, service_role;
