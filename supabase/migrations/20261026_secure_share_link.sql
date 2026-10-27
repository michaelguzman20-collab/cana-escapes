-- Enlace compartido /compartir/:token seguro.
-- Antes: políticas anon dejaban leer TODAS las propiedades con share_enabled
-- (incluido su share_token) y TODAS sus reservas (nombre/teléfono/email del huésped)
-- sin conocer el token. Ahora el acceso anónimo es solo por RPC con el token
-- y devuelve únicamente las columnas que usa ShareView.

drop policy if exists "Anon read shared properties" on public.properties;
drop policy if exists "Anon read shared reservations" on public.reservations;
drop policy if exists "Anon read brackets" on public.brackets;

create or replace function public.get_shared_property(p_token uuid)
returns table (id uuid, name text, owner_name text, reference_rate numeric, share_enabled boolean)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.owner_name, p.reference_rate, p.share_enabled
  from properties p
  where p.share_token = p_token and p.share_enabled;
$$;

create or replace function public.get_shared_reservations(p_token uuid, p_month int, p_year int)
returns table (
  id uuid, checkin date, checkout date, nights int, platform text, currency text,
  payment_type text, status text, gross_amount numeric, net_amount numeric,
  owner_amount numeric, owner_rds numeric, platform_comm_usd numeric,
  card_fee_usd numeric, extra_usd numeric
)
language sql stable security definer set search_path = public
as $$
  select r.id, r.checkin, r.checkout, r.nights::int, r.platform, r.currency,
         r.payment_type, r.status, r.gross_amount, r.net_amount,
         r.owner_amount, r.owner_rds, r.platform_comm_usd, r.card_fee_usd, r.extra_usd
  from reservations r
  join properties p on p.id = r.property_id
  where p.share_token = p_token and p.share_enabled
    and r.period_month = p_month and r.period_year = p_year
  order by r.checkin;
$$;

create or replace function public.get_shared_brackets(p_token uuid)
returns setof public.brackets
language sql stable security definer set search_path = public
as $$
  select b.*
  from brackets b
  join properties p on p.share_token = p_token and p.share_enabled
  where b.property_id is null or b.property_id = p.id
  order by b.sort_order;
$$;

revoke all on function public.get_shared_property(uuid) from public;
revoke all on function public.get_shared_reservations(uuid, int, int) from public;
revoke all on function public.get_shared_brackets(uuid) from public;
grant execute on function public.get_shared_property(uuid) to anon, authenticated;
grant execute on function public.get_shared_reservations(uuid, int, int) to anon, authenticated;
grant execute on function public.get_shared_brackets(uuid) to anon, authenticated;
