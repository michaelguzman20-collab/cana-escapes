-- =============================================================
-- Cana Escapes — Datos de ejemplo
-- Ejecutar DESPUÉS de schema.sql y schema_v2.sql
-- Supabase Dashboard → SQL Editor → New query
-- =============================================================

-- ─── 1. RPC para que el admin vea lista de usuarios guest ─────
create or replace function public.get_guest_users()
returns table(id uuid, email text, property_id uuid, property_name text)
language sql
security definer
as $$
  select
    p.id,
    p.email,
    prop.id         as property_id,
    prop.name       as property_name
  from public.profiles p
  left join public.properties prop on prop.owner_profile_id = p.id
  where p.role = 'guest'
    and exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid() and admin_p.role = 'admin'
    )
  order by p.email;
$$;

grant execute on function public.get_guest_users() to authenticated;

-- ─── 2. Propiedad de ejemplo ──────────────────────────────────
insert into public.properties (id, name, owner_name, reference_rate, active)
values (
  'a1b2c3d4-0000-0000-0000-ef1234567890',
  'Villa Coral',
  'Carlos & María Santana',
  60.0,
  true
)
on conflict (id) do nothing;

-- ─── 3. Reservas de ejemplo — Mayo 2026 ──────────────────────
-- Propiedad: Villa Coral | Bracket: 80/20 (bruto USD ~$1,160)
-- Reserva 1 — James & Sarah Thompson · Airbnb
insert into public.reservations (
  property_id, period_month, period_year,
  checkin, checkout, nights, guest_name, platform,
  currency, payment_type, gross_amount,
  platform_comm_pct, platform_comm_usd,
  card_fee_pct, card_fee_usd,
  extra_pct, extra_usd,
  net_amount, owner_pct, owner_amount, ce_pct, ce_amount,
  exchange_rate, owner_rds, status, notes
) values (
  'a1b2c3d4-0000-0000-0000-ef1234567890', 5, 2026,
  '2026-05-01', '2026-05-03', 2, 'James & Sarah Thompson', 'Airbnb',
  'USD', 'Tarjeta', 190.00,
  18, 34.20, 4, 7.60, 0, 0,
  148.20, 80, 118.56, 20, 29.64,
  60.0, 7113.60, 'Completada', '2 noches × $95 | Airbnb'
) on conflict do nothing;

-- Reserva 2 — Carlos Mendoza · Booking.com
insert into public.reservations (
  property_id, period_month, period_year,
  checkin, checkout, nights, guest_name, platform,
  currency, payment_type, gross_amount,
  platform_comm_pct, platform_comm_usd,
  card_fee_pct, card_fee_usd,
  extra_pct, extra_usd,
  net_amount, owner_pct, owner_amount, ce_pct, ce_amount,
  exchange_rate, owner_rds, status, notes
) values (
  'a1b2c3d4-0000-0000-0000-ef1234567890', 5, 2026,
  '2026-05-05', '2026-05-08', 3, 'Carlos Mendoza', 'Booking.com',
  'USD', 'Tarjeta', 300.00,
  16, 48.00, 4, 12.00, 0, 0,
  240.00, 80, 192.00, 20, 48.00,
  60.2, 11558.40, 'Completada', '3 noches × $100'
) on conflict do nothing;

-- Reserva 3 — Famille Dubois · Expedia (con deducción A/C $60)
insert into public.reservations (
  property_id, period_month, period_year,
  checkin, checkout, nights, guest_name, platform,
  currency, payment_type, gross_amount,
  platform_comm_pct, platform_comm_usd,
  card_fee_pct, card_fee_usd,
  extra_pct, extra_usd,
  net_amount, owner_pct, owner_amount, ce_pct, ce_amount,
  exchange_rate, owner_rds, status, notes
) values (
  'a1b2c3d4-0000-0000-0000-ef1234567890', 5, 2026,
  '2026-05-10', '2026-05-12', 2, 'Famille Dubois', 'Expedia',
  'USD', 'Transferencia', 180.00,
  18, 32.40, 0, 0.00, 0, 60.00,
  87.60, 80, 70.08, 20, 17.52,
  60.1, 4211.81, 'Completada', '2n × $90 | A/C: $60'
) on conflict do nothing;

-- Reserva 4 — Ramón & Carmen Peña · Directo (en RD$)
insert into public.reservations (
  property_id, period_month, period_year,
  checkin, checkout, nights, guest_name, platform,
  currency, payment_type, gross_amount,
  platform_comm_pct, platform_comm_usd,
  card_fee_pct, card_fee_usd,
  extra_pct, extra_usd,
  net_amount, owner_pct, owner_amount, ce_pct, ce_amount,
  exchange_rate, owner_rds, status, notes
) values (
  'a1b2c3d4-0000-0000-0000-ef1234567890', 5, 2026,
  '2026-05-15', '2026-05-17', 2, 'Ramón & Carmen Peña', 'Directo',
  'RD$', 'Efectivo', 11400.00,
  0, 0.00, 0, 0.00, 0, 0.00,
  11400.00, 80, 9120.00, 20, 2280.00,
  60.3, 9120.00, 'Completada', 'Pago directo efectivo'
) on conflict do nothing;

-- Reserva 5 — Emma Johansson · Airbnb
insert into public.reservations (
  property_id, period_month, period_year,
  checkin, checkout, nights, guest_name, platform,
  currency, payment_type, gross_amount,
  platform_comm_pct, platform_comm_usd,
  card_fee_pct, card_fee_usd,
  extra_pct, extra_usd,
  net_amount, owner_pct, owner_amount, ce_pct, ce_amount,
  exchange_rate, owner_rds, status, notes
) values (
  'a1b2c3d4-0000-0000-0000-ef1234567890', 5, 2026,
  '2026-05-20', '2026-05-22', 2, 'Emma Johansson', 'Airbnb',
  'USD', 'Tarjeta', 190.00,
  18, 34.20, 4, 7.60, 0, 0,
  148.20, 80, 118.56, 20, 29.64,
  60.0, 7113.60, 'Completada', null
) on conflict do nothing;

-- Reserva 6 — Yolanda Castillo · Booking.com (en RD$)
insert into public.reservations (
  property_id, period_month, period_year,
  checkin, checkout, nights, guest_name, platform,
  currency, payment_type, gross_amount,
  platform_comm_pct, platform_comm_usd,
  card_fee_pct, card_fee_usd,
  extra_pct, extra_usd,
  net_amount, owner_pct, owner_amount, ce_pct, ce_amount,
  exchange_rate, owner_rds, status, notes
) values (
  'a1b2c3d4-0000-0000-0000-ef1234567890', 5, 2026,
  '2026-05-22', '2026-05-24', 2, 'Yolanda Castillo', 'Booking.com',
  'RD$', 'Efectivo', 12000.00,
  16, 1920.00, 0, 0.00, 0, 0.00,
  10080.00, 80, 8064.00, 20, 2016.00,
  60.5, 8064.00, 'Completada', null
) on conflict do nothing;

-- Reserva 7 — Michael & Lisa Chen · Directo (PENDIENTE)
insert into public.reservations (
  property_id, period_month, period_year,
  checkin, checkout, nights, guest_name, platform,
  currency, payment_type, gross_amount,
  platform_comm_pct, platform_comm_usd,
  card_fee_pct, card_fee_usd,
  extra_pct, extra_usd,
  net_amount, owner_pct, owner_amount, ce_pct, ce_amount,
  exchange_rate, owner_rds, status, notes
) values (
  'a1b2c3d4-0000-0000-0000-ef1234567890', 5, 2026,
  '2026-05-26', '2026-05-29', 3, 'Michael & Lisa Chen', 'Directo',
  'USD', 'Transferencia', 300.00,
  0, 0.00, 0, 0.00, 0, 0.00,
  300.00, 78, 234.00, 22, 66.00,
  60.2, 14086.80, 'Pendiente', '3n × $100 | Check-out pendiente'
) on conflict do nothing;
