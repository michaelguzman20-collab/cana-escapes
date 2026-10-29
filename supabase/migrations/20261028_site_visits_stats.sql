-- Resumen de visitas para /admin/visitas. Corre con los permisos de quien la llama:
-- la regla de site_visits solo deja leer a los administradores.
-- "Visitas" = páginas abiertas (sin contar cada foto de un tour); las fotos se cuentan en tour_scenes.

create or replace function public.visit_stats(p_days int default 30)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with v as (
    select * from site_visits where created_at > now() - make_interval(days => greatest(1, least(p_days, 366)))
  ),
  pages as (select * from v where scene_id is null)
  select jsonb_build_object(
    'visits', (select count(*) from pages),
    'visitors', (select count(distinct visitor) from pages),
    'tour_visits', (select count(*) from pages where tour_id is not null),
    'devices', (select coalesce(jsonb_object_agg(device, n), '{}') from (select device, count(*) n from pages group by 1) d),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', dt, 'visits', n, 'visitors', u) order by dt), '[]') from (
      select (created_at at time zone 'America/Santo_Domingo')::date dt, count(*) n, count(distinct visitor) u from pages group by 1
    ) d),
    'top_pages', (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'visits', n) order by n desc), '[]') from (
      select path, count(*) n from pages where tour_id is null group by 1 order by 2 desc limit 15
    ) p),
    'referrers', (select coalesce(jsonb_agg(jsonb_build_object('host', referrer, 'visits', n) order by n desc), '[]') from (
      select referrer, count(*) n from pages where referrer is not null group by 1 order by 2 desc limit 10
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
      from tours t where t.published)
  );
$$;

revoke all on function public.visit_stats(int) from public;
revoke execute on function public.visit_stats(int) from anon; -- Supabase lo concede por defecto
grant execute on function public.visit_stats(int) to authenticated;
