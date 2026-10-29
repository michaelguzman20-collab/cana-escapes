-- Registro de visitas del sitio público y de los Tours 360 (sin datos personales).
-- visitor: identificador al azar que el navegador guarda (para contar visitantes únicos).
-- Nadie de afuera puede leer la tabla; solo se escribe con record_visit(), que valida los datos.

create table if not exists public.site_visits (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  visitor uuid not null,
  path text not null check (char_length(path) <= 200),
  tour_id uuid references public.tours(id) on delete cascade,
  scene_id uuid references public.tour_scenes(id) on delete set null,
  device text not null check (device in ('phone', 'tablet', 'desktop')),
  referrer text check (char_length(referrer) <= 100),
  lang text check (char_length(lang) <= 5)
);

create index if not exists site_visits_created_idx on public.site_visits (created_at desc);
create index if not exists site_visits_tour_idx on public.site_visits (tour_id, created_at desc) where tour_id is not null;
create index if not exists site_visits_visitor_idx on public.site_visits (visitor, created_at desc);

alter table public.site_visits enable row level security;

drop policy if exists admin_read on public.site_visits;
create policy admin_read on public.site_visits for select to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::user_role));

create or replace function public.record_visit(
  p_visitor uuid,
  p_path text,
  p_device text,
  p_tour_id uuid default null,
  p_scene_id uuid default null,
  p_referrer text default null,
  p_lang text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor is null or p_path is null or p_device not in ('phone', 'tablet', 'desktop') then
    return;
  end if;
  -- Freno contra scripts: máximo 300 registros por visitante por hora
  if (select count(*) from site_visits where visitor = p_visitor and created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;
  -- Solo tours publicados y escenas de ese tour
  if p_tour_id is not null and not exists (select 1 from tours where id = p_tour_id and published) then
    return;
  end if;
  if p_scene_id is not null and not exists (select 1 from tour_scenes where id = p_scene_id and tour_id = p_tour_id) then
    p_scene_id := null;
  end if;
  insert into site_visits (visitor, path, tour_id, scene_id, device, referrer, lang)
  values (p_visitor, left(p_path, 200), p_tour_id, p_scene_id, p_device, left(p_referrer, 100), left(p_lang, 5));
end;
$$;

revoke all on function public.record_visit(uuid, text, text, uuid, uuid, text, text) from public;
grant execute on function public.record_visit(uuid, text, text, uuid, uuid, text, text) to anon, authenticated;
