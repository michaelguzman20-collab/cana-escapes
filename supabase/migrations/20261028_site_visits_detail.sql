-- Detalle de visitas: cuánto tiempo se queda la persona, hasta dónde baja y qué toca.
-- record_visit ahora devuelve el id de la visita; el navegador lo usa para end_visit y record_event.
-- Solo el mismo visitante (su identificador al azar) puede completar su visita, y solo durante 6 horas.

alter table public.site_visits add column if not exists duration_s int check (duration_s between 0 and 14400);
alter table public.site_visits add column if not exists scroll_pct smallint check (scroll_pct between 0 and 100);

create table if not exists public.site_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  visit_id bigint not null references public.site_visits(id) on delete cascade,
  kind text not null check (kind in ('whatsapp', 'phone', 'email', 'link', 'click')),
  label text check (char_length(label) <= 80)
);
create index if not exists site_events_visit_idx on public.site_events (visit_id);
create index if not exists site_events_created_idx on public.site_events (created_at desc);

alter table public.site_events enable row level security;
drop policy if exists admin_read on public.site_events;
create policy admin_read on public.site_events for select to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::user_role));

drop function if exists public.record_visit(uuid, text, text, uuid, uuid, text, text);
create function public.record_visit(
  p_visitor uuid,
  p_path text,
  p_device text,
  p_tour_id uuid default null,
  p_scene_id uuid default null,
  p_referrer text default null,
  p_lang text default null
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
  insert into site_visits (visitor, path, tour_id, scene_id, device, referrer, lang)
  values (p_visitor, left(p_path, 200), p_tour_id, p_scene_id, p_device, left(p_referrer, 100), left(p_lang, 5))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.end_visit(p_id bigint, p_visitor uuid, p_seconds int, p_scroll int default null)
returns void
language sql
security definer
set search_path = public
as $$
  update site_visits
     set duration_s = greatest(0, least(p_seconds, 14400)),
         scroll_pct = case when p_scroll is null then scroll_pct else greatest(0, least(p_scroll, 100)) end
   where id = p_id and visitor = p_visitor and scene_id is null and created_at > now() - interval '6 hours';
$$;

create or replace function public.record_event(p_visit bigint, p_visitor uuid, p_kind text, p_label text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('whatsapp', 'phone', 'email', 'link', 'click') then
    return;
  end if;
  if not exists (select 1 from site_visits where id = p_visit and visitor = p_visitor and created_at > now() - interval '6 hours') then
    return;
  end if;
  -- Máximo 200 interacciones por visita
  if (select count(*) from site_events where visit_id = p_visit) >= 200 then
    return;
  end if;
  insert into site_events (visit_id, kind, label) values (p_visit, p_kind, left(p_label, 80));
end;
$$;

revoke all on function public.record_visit(uuid, text, text, uuid, uuid, text, text) from public;
revoke all on function public.end_visit(bigint, uuid, int, int) from public;
revoke all on function public.record_event(bigint, uuid, text, text) from public;
grant execute on function public.record_visit(uuid, text, text, uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.end_visit(bigint, uuid, int, int) to anon, authenticated;
grant execute on function public.record_event(bigint, uuid, text, text) to anon, authenticated;

-- Resumen para /admin/visitas; p_path filtra una página (por ejemplo '/' o '/tour/cocotal').
-- Corre con los permisos de quien la llama: solo los administradores pueden leer las tablas.
drop function if exists public.visit_stats(int);
create or replace function public.visit_stats(p_days int default 30, p_path text default null)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with v as (
    select * from site_visits
     where created_at > now() - make_interval(days => greatest(1, least(p_days, 366)))
       and (p_path is null or path = p_path)
  ),
  pages as (select * from v where scene_id is null),
  ev as (select e.* from site_events e join pages p on p.id = e.visit_id)
  select jsonb_build_object(
    'visits', (select count(*) from pages),
    'visitors', (select count(distinct visitor) from pages),
    'tour_visits', (select count(*) from pages where tour_id is not null),
    'avg_duration', (select round(avg(duration_s)) from pages where duration_s is not null),
    'avg_scroll', (select round(avg(scroll_pct)) from pages where scroll_pct is not null),
    'interacted', (select count(distinct visit_id) from ev),
    'devices', (select coalesce(jsonb_object_agg(device, n), '{}') from (select device, count(*) n from pages group by 1) d),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', dt, 'visits', n, 'visitors', u) order by dt), '[]') from (
      select (created_at at time zone 'America/Santo_Domingo')::date dt, count(*) n, count(distinct visitor) u from pages group by 1
    ) d),
    'hours', (select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'visits', n) order by h), '[]') from (
      select extract(hour from created_at at time zone 'America/Santo_Domingo')::int h, count(*) n from pages group by 1
    ) d),
    'top_pages', (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'visits', n) order by n desc), '[]') from (
      select path, count(*) n from pages where tour_id is null group by 1 order by 2 desc limit 15
    ) p),
    'referrers', (select coalesce(jsonb_agg(jsonb_build_object('host', referrer, 'visits', n) order by n desc), '[]') from (
      select referrer, count(*) n from pages where referrer is not null group by 1 order by 2 desc limit 10
    ) r),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'label', label, 'count', n) order by n desc), '[]') from (
      select kind, label, count(*) n from ev group by 1, 2 order by 3 desc limit 20
    ) e),
    'recent', (select coalesce(jsonb_agg(r order by r.visited_at desc), '[]') from (
      select p.created_at visited_at, p.path, p.device, p.referrer, p.lang, p.duration_s duration, p.scroll_pct scroll,
             (select coalesce(jsonb_agg(coalesce(e.label, e.kind) order by e.created_at), '[]') from site_events e where e.visit_id = p.id) events,
             (select count(*) from v s where s.scene_id is not null and s.visitor = p.visitor and s.tour_id = p.tour_id
                and s.created_at between p.created_at and p.created_at + interval '6 hours') photos
        from pages p order by p.created_at desc limit 40
    ) r),
    'tours', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'slug', t.slug,
        'visits', (select count(*) from pages p where p.tour_id = t.id),
        'visitors', (select count(distinct visitor) from pages p where p.tour_id = t.id),
        'scenes', (select coalesce(jsonb_agg(jsonb_build_object('title', coalesce(nullif(s.area, ''), s.title), 'views', s.n) order by s.n desc), '[]') from (
          select ts.area, ts.title, count(*) n from v join tour_scenes ts on ts.id = v.scene_id
          where v.tour_id = t.id group by ts.id, ts.area, ts.title order by 3 desc limit 10
        ) s)
      ) order by (select count(*) from pages p where p.tour_id = t.id) desc), '[]')
      from tours t where t.published and (p_path is null or p_path = '/tour/' || t.slug))
  );
$$;

revoke all on function public.visit_stats(int, text) from public;
revoke execute on function public.visit_stats(int, text) from anon; -- Supabase lo concede por defecto
grant execute on function public.visit_stats(int, text) to authenticated;

-- Lista de páginas con visitas, para el selector del panel (los tours llevan su nombre)
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
   group by 1 order by 2 desc limit 100;
$$;
revoke all on function public.visit_paths(int) from public;
revoke execute on function public.visit_paths(int) from anon;
grant execute on function public.visit_paths(int) to authenticated;
