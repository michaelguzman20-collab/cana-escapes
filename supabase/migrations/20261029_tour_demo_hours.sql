-- Agenda de demostraciones: horas bloqueadas (no solo días completos) y hora libre elegida por el cliente.
-- blocked_slots: [{"date": "2026-11-03", "from": "10:00", "to": "13:00"}, …] en hora de RD.
-- Las citas ya no tienen que caer en la cuadrícula: cualquier hora cada 15 min dentro del horario,
-- siempre que no se cruce con otra cita activa ni con un bloqueo.
alter table public.tour_demo_settings add column if not exists blocked_slots jsonb not null default '[]'::jsonb;

create or replace function public.tour_demo_availability()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'days', s.days,
    'start_time', to_char(s.start_time, 'HH24:MI'),
    'end_time', to_char(s.end_time, 'HH24:MI'),
    'slot_minutes', s.slot_minutes,
    'min_notice_hours', s.min_notice_hours,
    'max_days_ahead', s.max_days_ahead,
    'blocked_dates', s.blocked_dates,
    'blocked_slots', s.blocked_slots,
    'taken', coalesce((
      select json_agg(b.slot_start order by b.slot_start)
      from public.tour_demo_bookings b
      where b.status <> 'cancelada' and b.slot_start >= now() - interval '1 day'
    ), '[]'::json),
    'busy', coalesce((
      select json_agg(json_build_object('start', b.slot_start, 'minutes', b.slot_minutes) order by b.slot_start)
      from public.tour_demo_bookings b
      where b.status <> 'cancelada' and b.slot_start >= now() - interval '1 day'
    ), '[]'::json)
  )
  from public.tour_demo_settings s where s.id = 1;
$$;

create or replace function public.book_tour_demo(
  p_slot timestamptz, p_name text, p_phone text, p_email text, p_company text,
  p_client_type text, p_meeting text, p_notes text, p_lang text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.tour_demo_settings;
  local_ts timestamp := p_slot at time zone 'America/Santo_Domingo';
  slot_end timestamptz;
  new_id uuid;
begin
  -- Una reserva a la vez: evita que dos personas tomen horas que se cruzan al mismo tiempo
  perform pg_advisory_xact_lock(hashtext('book_tour_demo'));
  select * into s from public.tour_demo_settings where id = 1;
  slot_end := p_slot + make_interval(mins => s.slot_minutes);
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then raise exception 'missing_fields'; end if;
  if length(p_name) > 120 or length(p_phone) > 40 or length(coalesce(p_email, '')) > 160
     or length(coalesce(p_company, '')) > 160 or length(coalesce(p_notes, '')) > 1000 then raise exception 'too_long'; end if;
  if p_slot < now() + make_interval(hours => s.min_notice_hours) or p_slot > now() + make_interval(days => s.max_days_ahead) then
    raise exception 'out_of_range';
  end if;
  if not (extract(dow from local_ts)::int = any (s.days)) or local_ts::date = any (s.blocked_dates) then raise exception 'closed'; end if;
  if local_ts::time < s.start_time or local_ts::time + make_interval(mins => s.slot_minutes) > s.end_time
     or extract(minute from local_ts)::int % 15 <> 0 or extract(second from local_ts) <> 0 then raise exception 'bad_slot'; end if;
  -- Horas bloqueadas de ese día
  if exists (
    select 1 from jsonb_array_elements(s.blocked_slots) bs
    where (bs->>'date')::date = local_ts::date
      and local_ts::time < (bs->>'to')::time
      and local_ts::time + make_interval(mins => s.slot_minutes) > (bs->>'from')::time
  ) then raise exception 'closed'; end if;
  -- Se cruza con otra cita
  if exists (
    select 1 from public.tour_demo_bookings b
    where b.status <> 'cancelada'
      and b.slot_start < slot_end
      and b.slot_start + make_interval(mins => b.slot_minutes) > p_slot
  ) then raise exception 'taken'; end if;
  if (select count(*) from public.tour_demo_bookings
      where regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
        and status = 'pendiente' and slot_start > now()) >= 3 then raise exception 'too_many'; end if;
  begin
    insert into public.tour_demo_bookings (slot_start, slot_minutes, name, phone, email, company, client_type, meeting, notes, lang)
    values (p_slot, s.slot_minutes, trim(p_name), trim(p_phone), nullif(trim(p_email), ''), nullif(trim(p_company), ''),
            nullif(trim(p_client_type), ''), case when p_meeting = 'presencial' then 'presencial' else 'virtual' end,
            nullif(trim(p_notes), ''), p_lang)
    returning id into new_id;
  exception when unique_violation then
    raise exception 'taken';
  end;
  return new_id;
end;
$$;

revoke all on function public.tour_demo_availability() from public;
revoke all on function public.book_tour_demo(timestamptz, text, text, text, text, text, text, text, text) from public;
grant execute on function public.tour_demo_availability() to anon, authenticated;
grant execute on function public.book_tour_demo(timestamptz, text, text, text, text, text, text, text, text) to anon, authenticated;
