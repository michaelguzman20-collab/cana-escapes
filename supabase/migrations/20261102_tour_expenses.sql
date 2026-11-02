-- Tours 360: gastos del negocio (papel, tinta, comisiones, alianzas con dueños que prestan su propiedad…)
-- para medir si cada gasto o alianza valió la pena (/admin/tours/prospectos › Dinero). Es una lista
-- sencilla: no pide NCF ni RNC; lo que tenga factura fiscal se registra aparte en Contabilidad.
-- Se puede anotar en RD$ o US$; amount_usd guarda el valor en dólares con la tasa de ese día.

create table if not exists public.tour_expenses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  spent_on    date not null default ((now() at time zone 'America/Santo_Domingo')::date),
  category    text not null default 'otro'
              check (category in ('impresion', 'comision', 'alianza', 'publicidad', 'transporte', 'equipo', 'software', 'otro')),
  description text not null default '' check (char_length(description) <= 200),
  amount      numeric(12, 2) not null check (amount >= 0),
  currency    text not null default 'rd' check (currency in ('rd', 'usd')),
  rate        numeric(8, 2) not null default 60 check (rate > 0), -- RD$ por US$1 ese día
  amount_usd  numeric(12, 2) not null default 0,
  prospect_id uuid references public.tour_prospects(id) on delete set null, -- alianza, referido que cobró comisión…
  tour_id     uuid references public.tours(id) on delete set null,
  notes       text check (char_length(notes) <= 2000)
);
create index if not exists tour_expenses_spent_idx on public.tour_expenses (spent_on desc);
create index if not exists tour_expenses_prospect_idx on public.tour_expenses (prospect_id) where prospect_id is not null;

alter table public.tour_expenses enable row level security;
drop policy if exists "admin_all" on public.tour_expenses;
create policy "admin_all" on public.tour_expenses for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
revoke all on public.tour_expenses from anon;
grant select, insert, update, delete on public.tour_expenses to authenticated, service_role;

-- Visitas por tour (sin las del equipo) para compararlas con lo que pagó el cliente
create or replace function public.tour_visit_totals(p_days int default 30)
returns table (tour_id uuid, visits bigint, visitors bigint, visits_recent bigint, visitors_recent bigint, first_visit timestamptz, last_visit timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select v.tour_id,
         count(*),
         count(distinct v.visitor),
         count(*) filter (where v.created_at >= now() - make_interval(days => p_days)),
         count(distinct v.visitor) filter (where v.created_at >= now() - make_interval(days => p_days)),
         min(v.created_at),
         max(v.created_at)
  from site_visits v
  where v.tour_id is not null
    and not exists (select 1 from internal_visitors i where i.visitor = v.visitor)
  group by v.tour_id;
$$;
revoke all on function public.tour_visit_totals(int) from public;
revoke execute on function public.tour_visit_totals(int) from anon;
grant execute on function public.tour_visit_totals(int) to authenticated;
