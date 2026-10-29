-- Tours 360: portada propia del tour y agenda de demostraciones.

-- Portada en /tours: además de las ilustraciones (card_image = villa, apartamento…), una foto o el
-- logo de la propiedad (card_image = 'foto' | 'logo', la imagen en card_image_url).
alter table public.tours add column if not exists card_image_url text;
alter table public.tours add column if not exists card_image_path text;

-- ── Horario disponible para demostraciones (una sola fila) ──────────────────
create table if not exists public.tour_demo_settings (
  id               int primary key default 1 check (id = 1),
  days             int[] not null default '{1,2,3,4,5,6}', -- 0 = domingo … 6 = sábado
  start_time       time not null default '09:00',
  end_time         time not null default '17:00',
  slot_minutes     int not null default 45 check (slot_minutes between 15 and 240),
  min_notice_hours int not null default 12 check (min_notice_hours between 0 and 168),
  max_days_ahead   int not null default 30 check (max_days_ahead between 1 and 120),
  blocked_dates    date[] not null default '{}',
  updated_at       timestamptz not null default now()
);
insert into public.tour_demo_settings (id) values (1) on conflict (id) do nothing;
alter table public.tour_demo_settings enable row level security;
create policy "admin_all" on public.tour_demo_settings for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
grant select, insert, update on public.tour_demo_settings to authenticated, service_role;

-- ── Citas ──────────────────────────────────────────────────────────────────
create table if not exists public.tour_demo_bookings (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  slot_start   timestamptz not null,
  slot_minutes int not null,
  name         text not null,
  phone        text not null,
  email        text,
  company      text,
  client_type  text,
  meeting      text not null default 'virtual' check (meeting in ('virtual', 'presencial')),
  notes        text,
  lang         text,
  status       text not null default 'pendiente' check (status in ('pendiente', 'confirmada', 'realizada', 'cancelada')),
  admin_notes  text,
  intake_id    uuid references public.tour_intakes(id) on delete set null
);
-- Un horario no se puede reservar dos veces (salvo que la cita anterior se cancele)
create unique index if not exists tour_demo_bookings_slot_unique on public.tour_demo_bookings (slot_start) where status <> 'cancelada';
alter table public.tour_demo_bookings enable row level security;
create policy "admin_all" on public.tour_demo_bookings for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
grant select, insert, update, delete on public.tour_demo_bookings to authenticated, service_role;

-- ── Lo que ve el público: horario + horas ya ocupadas (sin datos de nadie) ──
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
    'taken', coalesce((
      select json_agg(b.slot_start order by b.slot_start)
      from public.tour_demo_bookings b
      where b.status <> 'cancelada' and b.slot_start >= now() - interval '1 day'
    ), '[]'::json)
  )
  from public.tour_demo_settings s where s.id = 1;
$$;

-- ── Reservar (público): valida el horario y guarda la cita ──────────────────
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
  mins int;
  new_id uuid;
begin
  select * into s from public.tour_demo_settings where id = 1;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then raise exception 'missing_fields'; end if;
  if length(p_name) > 120 or length(p_phone) > 40 or length(coalesce(p_email, '')) > 160
     or length(coalesce(p_company, '')) > 160 or length(coalesce(p_notes, '')) > 1000 then raise exception 'too_long'; end if;
  if p_slot < now() + make_interval(hours => s.min_notice_hours) or p_slot > now() + make_interval(days => s.max_days_ahead) then
    raise exception 'out_of_range';
  end if;
  if not (extract(dow from local_ts)::int = any (s.days)) or local_ts::date = any (s.blocked_dates) then raise exception 'closed'; end if;
  mins := extract(epoch from (local_ts::time - s.start_time))::int / 60;
  if local_ts::time < s.start_time or local_ts::time + make_interval(mins => s.slot_minutes) > s.end_time
     or mins % s.slot_minutes <> 0 or extract(second from local_ts) <> 0 then raise exception 'bad_slot'; end if;
  -- Evita abuso: como mucho 3 citas futuras pendientes por teléfono
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

-- Sin acceso directo para visitantes (solo por las funciones de arriba)
revoke all on public.tour_demo_bookings, public.tour_demo_settings, public.tour_intakes from anon;
