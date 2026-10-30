-- Visitas: no contar al equipo, país/ciudad y de dónde llegan.
-- · internal_visitors: navegadores del equipo (se marcan solos al abrir el panel). Siguen registrándose,
--   pero visit_stats los deja fuera salvo que se pida incluirlos; así también se limpian las pruebas viejas.
-- · site_visits gana país, ciudad (de Vercel, sin IP), fuente (utm_source / ?src= / app de Instagram o Facebook)
--   y campaña (utm_campaign).

create table if not exists public.internal_visitors (
  visitor uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  label text check (char_length(label) <= 80),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.internal_visitors enable row level security;
drop policy if exists admin_all on public.internal_visitors;
create policy admin_all on public.internal_visitors for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::user_role))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::user_role));

-- El panel llama esto al abrirse: este navegador queda como "del equipo"
create or replace function public.mark_internal_visitor(p_visitor uuid, p_label text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor is null or not exists (select 1 from profiles where id = auth.uid() and role = 'admin'::user_role) then
    return;
  end if;
  insert into internal_visitors (visitor, user_id, label) values (p_visitor, auth.uid(), left(p_label, 80))
  on conflict (visitor) do update set last_seen = now(), user_id = excluded.user_id, label = coalesce(excluded.label, internal_visitors.label);
end;
$$;
revoke all on function public.mark_internal_visitor(uuid, text) from public;
revoke execute on function public.mark_internal_visitor(uuid, text) from anon;
grant execute on function public.mark_internal_visitor(uuid, text) to authenticated;

alter table public.site_visits add column if not exists country text check (char_length(country) <= 2);
alter table public.site_visits add column if not exists city text check (char_length(city) <= 60);
alter table public.site_visits add column if not exists source text check (char_length(source) <= 40);
alter table public.site_visits add column if not exists campaign text check (char_length(campaign) <= 60);

drop function if exists public.record_visit(uuid, text, text, uuid, uuid, text, text);
create function public.record_visit(
  p_visitor uuid,
  p_path text,
  p_device text,
  p_tour_id uuid default null,
  p_scene_id uuid default null,
  p_referrer text default null,
  p_lang text default null,
  p_country text default null,
  p_city text default null,
  p_source text default null,
  p_campaign text default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if p_visitor is null or p_path is null or p_device not in ('phone', 'tablet', 'desktop') then
    return null;
  end if;
  -- Freno contra scripts: máximo 300 registros por visitante por hora
  if (select count(*) from site_visits where visitor = p_visitor and created_at > now() - interval '1 hour') >= 300 then
    return null;
  end if;
  -- Solo tours publicados y escenas de ese tour
  if p_tour_id is not null and not exists (select 1 from tours where id = p_tour_id and published) then
    return null;
  end if;
  if p_scene_id is not null and not exists (select 1 from tour_scenes where id = p_scene_id and tour_id = p_tour_id) then
    p_scene_id := null;
  end if;
  insert into site_visits (visitor, path, tour_id, scene_id, device, referrer, lang, country, city, source, campaign)
  values (p_visitor, left(p_path, 200), p_tour_id, p_scene_id, p_device, left(p_referrer, 100), left(p_lang, 5),
          case when p_country ~ '^[A-Z]{2}$' then p_country end, left(p_city, 60),
          nullif(left(lower(p_source), 40), ''), nullif(left(p_campaign, 60), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.record_visit(uuid, text, text, uuid, uuid, text, text, text, text, text, text) from public;
grant execute on function public.record_visit(uuid, text, text, uuid, uuid, text, text, text, text, text, text) to anon, authenticated;

-- Canal de llegada: la fuente marcada en el enlace o, si no, el sitio de donde vino
create or replace function public.visit_channel(p_source text, p_referrer text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_source, p_referrer) is null then 'directo'
    when coalesce(p_source, p_referrer) ~* 'whatsapp|wa\.me' then 'whatsapp'
    when coalesce(p_source, p_referrer) ~* 'instagram' then 'instagram'
    when coalesce(p_source, p_referrer) ~* 'facebook|^fb$|fb\.com|fbclid' then 'facebook'
    when coalesce(p_source, p_referrer) ~* 'google' then 'google'
    when coalesce(p_source, p_referrer) ~* 'bing|yahoo|duckduckgo|ecosia' then 'buscadores'
    when coalesce(p_source, p_referrer) ~* 'tiktok' then 'tiktok'
    when coalesce(p_source, p_referrer) ~* '(^|\.)t\.co$|twitter|^x\.com$|^x$' then 'x'
    when coalesce(p_source, p_referrer) ~* 'linkedin|lnkd' then 'linkedin'
    when coalesce(p_source, p_referrer) ~* 'airbnb|booking|vrbo|expedia' then 'plataformas'
    when coalesce(p_source, p_referrer) ~* 'mail|correo|outlook|gmail' then 'correo'
    when coalesce(p_source, p_referrer) ~* 'qr' then 'qr'
    else lower(coalesce(p_source, p_referrer))
  end;
$$;

-- Resumen para /admin/visitas; p_path filtra una página (por ejemplo '/' o '/tour/cocotal').
-- p_internal = true incluye las visitas del equipo. Corre con los permisos de quien la llama.
drop function if exists public.visit_stats(int, text);
drop function if exists public.visit_stats(int, text, boolean);
create function public.visit_stats(p_days int default 30, p_path text default null, p_internal boolean default false)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with allv as (
    select sv.*, (iv.visitor is not null) internal from site_visits sv left join internal_visitors iv on iv.visitor = sv.visitor
     where sv.created_at > now() - make_interval(days => greatest(1, least(p_days, 366)))
       and (p_path is null or sv.path = p_path)
  ),
  v as (select *, visit_channel(source, referrer) channel from allv where p_internal or not internal),
  pages as (select * from v where scene_id is null),
  ev as (select e.* from site_events e join pages p on p.id = e.visit_id),
  -- Primera visita de cada visitante (de siempre) para separar nuevos y recurrentes
  firsts as (
    select visitor, min(created_at) first_at from site_visits
     where scene_id is null and visitor in (select visitor from pages) group by 1
  )
  select jsonb_build_object(
    'visits', (select count(*) from pages),
    'visitors', (select count(distinct visitor) from pages),
    'new_visitors', (select count(*) from firsts where first_at > now() - make_interval(days => greatest(1, least(p_days, 366)))),
    'internal_hidden', (select count(*) from allv where internal and scene_id is null and not p_internal),
    'tour_visits', (select count(*) from pages where tour_id is not null),
    'photo_views', (select count(*) from v where scene_id is not null),
    'avg_duration', (select round(avg(duration_s)) from pages where duration_s is not null),
    'avg_scroll', (select round(avg(scroll_pct)) from pages where scroll_pct is not null),
    'interacted', (select count(distinct visit_id) from ev),
    'contacts', (select coalesce(jsonb_object_agg(kind, n), '{}') from (
      select kind, count(*) n from ev where kind in ('whatsapp', 'phone', 'email') group by 1
    ) c),
    'devices', (select coalesce(jsonb_object_agg(device, n), '{}') from (select device, count(*) n from pages group by 1) d),
    'langs', (select coalesce(jsonb_agg(jsonb_build_object('lang', lang, 'visits', n) order by n desc), '[]') from (
      select coalesce(nullif(lang, ''), '?') lang, count(*) n from pages group by 1 order by 2 desc limit 8
    ) l),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', dt, 'visits', n, 'visitors', u) order by dt), '[]') from (
      select (created_at at time zone 'America/Santo_Domingo')::date dt, count(*) n, count(distinct visitor) u from pages group by 1
    ) d),
    'hours', (select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'visits', n) order by h), '[]') from (
      select extract(hour from created_at at time zone 'America/Santo_Domingo')::int h, count(*) n from pages group by 1
    ) d),
    'top_pages', (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'visits', n) order by n desc), '[]') from (
      select path, count(*) n from pages where tour_id is null group by 1 order by 2 desc limit 15
    ) p),
    'channels', (select coalesce(jsonb_agg(jsonb_build_object('channel', channel, 'visits', n) order by n desc), '[]') from (
      select channel, count(*) n from pages group by 1 order by 2 desc limit 12
    ) c),
    'referrers', (select coalesce(jsonb_agg(jsonb_build_object('host', referrer, 'visits', n) order by n desc), '[]') from (
      select referrer, count(*) n from pages where referrer is not null group by 1 order by 2 desc limit 10
    ) r),
    'campaigns', (select coalesce(jsonb_agg(jsonb_build_object('campaign', campaign, 'visits', n) order by n desc), '[]') from (
      select campaign, count(*) n from pages where campaign is not null group by 1 order by 2 desc limit 10
    ) c),
    'countries', (select coalesce(jsonb_agg(jsonb_build_object('country', country, 'visits', n) order by n desc), '[]') from (
      select country, count(*) n from pages where country is not null group by 1 order by 2 desc limit 12
    ) c),
    'cities', (select coalesce(jsonb_agg(jsonb_build_object('city', city, 'country', country, 'visits', n) order by n desc), '[]') from (
      select city, country, count(*) n from pages where city is not null group by 1, 2 order by 3 desc limit 12
    ) c),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'label', label, 'count', n) order by n desc), '[]') from (
      select kind, label, count(*) n from ev group by 1, 2 order by 3 desc limit 20
    ) e),
    'recent', (select coalesce(jsonb_agg(r order by r.visited_at desc), '[]') from (
      select p.created_at visited_at, p.path, p.device, p.referrer, p.channel, p.campaign, p.lang, p.country, p.city,
             p.duration_s duration, p.scroll_pct scroll, p.internal,
             (select coalesce(jsonb_agg(coalesce(e.label, e.kind) order by e.created_at), '[]') from site_events e where e.visit_id = p.id) events,
             (select count(*) from v s where s.scene_id is not null and s.visitor = p.visitor and s.tour_id = p.tour_id
                and s.created_at between p.created_at and p.created_at + interval '6 hours') photos
        from pages p order by p.created_at desc limit 40
    ) r),
    'tours', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'slug', t.slug,
        'visits', (select count(*) from pages p where p.tour_id = t.id),
        'visitors', (select count(distinct visitor) from pages p where p.tour_id = t.id),
        'photo_views', (select count(*) from v where v.tour_id = t.id and v.scene_id is not null),
        'avg_duration', (select round(avg(duration_s)) from pages p where p.tour_id = t.id and duration_s is not null),
        'contacts', (select count(*) from ev join pages p on p.id = ev.visit_id where p.tour_id = t.id and ev.kind in ('whatsapp', 'phone', 'email')),
        'scenes', (select coalesce(jsonb_agg(jsonb_build_object('title', coalesce(nullif(s.area, ''), s.title), 'views', s.n) order by s.n desc), '[]') from (
          select ts.area, ts.title, count(*) n from v join tour_scenes ts on ts.id = v.scene_id
          where v.tour_id = t.id group by ts.id, ts.area, ts.title order by 3 desc limit 10
        ) s)
      ) order by (select count(*) from pages p where p.tour_id = t.id) desc), '[]')
      from tours t where t.published and (p_path is null or p_path = '/tour/' || t.slug))
  );
$$;
revoke all on function public.visit_stats(int, text, boolean) from public;
revoke execute on function public.visit_stats(int, text, boolean) from anon; -- Supabase lo concede por defecto
grant execute on function public.visit_stats(int, text, boolean) to authenticated;

-- Lista de páginas con visitas para el selector del panel (sin las del equipo)
drop function if exists public.visit_paths(int);
create function public.visit_paths(p_days int default 30)
returns table (path text, visits bigint, title text)
language sql
stable
security invoker
set search_path = public
as $$
  select v.path, count(*), max(t.title)
    from site_visits v
    left join tours t on v.path = '/tour/' || t.slug
   where v.scene_id is null and v.created_at > now() - make_interval(days => greatest(1, least(p_days, 366)))
     and not exists (select 1 from internal_visitors iv where iv.visitor = v.visitor)
   group by 1 order by 2 desc limit 100;
$$;
revoke all on function public.visit_paths(int) from public;
revoke execute on function public.visit_paths(int) from anon;
grant execute on function public.visit_paths(int) to authenticated;
