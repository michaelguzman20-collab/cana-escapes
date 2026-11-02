-- Tours 360: metas y plan de cada semana (/admin/tours/prospectos › Resumen). Es la hoja "Avance" del
-- Excel de seguimiento: metas de contactos, conversaciones y ventas, y la lista de tareas de la semana.
-- week_start = el lunes de esa semana (hora de RD). tasks = [{ id, when, text, done, notes }].

create table if not exists public.tour_weeks (
  week_start         date primary key check (extract(isodow from week_start) = 1),
  goal_contacts      int not null default 15 check (goal_contacts between 0 and 1000),
  goal_conversations int not null default 5 check (goal_conversations between 0 and 1000),
  goal_sales         int not null default 2 check (goal_sales between 0 and 1000),
  tasks              jsonb not null default '[]'::jsonb,
  updated_at         timestamptz not null default now()
);

alter table public.tour_weeks enable row level security;
drop policy if exists "admin_all" on public.tour_weeks;
create policy "admin_all" on public.tour_weeks for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
revoke all on public.tour_weeks from anon;
grant select, insert, update, delete on public.tour_weeks to authenticated, service_role;

-- Semana 1 del lanzamiento (2–7 nov 2026), tal como estaba en el Excel
insert into public.tour_weeks (week_start, goal_contacts, goal_conversations, goal_sales, tasks) values (
  '2026-11-02', 15, 5, 2,
  '[
    {"id": "t1",  "when": "Lun 2 nov",     "text": "Seguimiento a las 2 personas que ya tienen el PDF (mensaje 5)", "done": false, "notes": ""},
    {"id": "t2",  "when": "Lun 2 nov",     "text": "Escribir a los 3–4 contactos puntuales (mensaje 1 o 2)", "done": false, "notes": ""},
    {"id": "t3",  "when": "Lun 2 nov",     "text": "Anotar cada envío en Prospectos", "done": false, "notes": ""},
    {"id": "t4",  "when": "Lun 2 nov",     "text": "Comprar papel mate 160–200 g tamaño carta y tinta", "done": false, "notes": ""},
    {"id": "t5",  "when": "Mar–Mié 3–4 nov", "text": "Imprimir 10 hojas informativas", "done": false, "notes": ""},
    {"id": "t6",  "when": "Mar–Mié 3–4 nov", "text": "Buscar en Google Maps 10 inmobiliarias (dirección y horario)", "done": false, "notes": ""},
    {"id": "t7",  "when": "Mar–Mié 3–4 nov", "text": "Pedir referidos a cada contacto interesado (mensaje 6)", "done": false, "notes": ""},
    {"id": "t8",  "when": "Jue–Vie 5–6 nov", "text": "Visitar 5 oficinas de 9:30 a 11:30 (guion de visita)", "done": false, "notes": ""},
    {"id": "t9",  "when": "Jue–Vie 5–6 nov", "text": "Mensaje 4 a cada oficina visitada, el mismo día", "done": false, "notes": ""},
    {"id": "t10", "when": "Sáb 7 nov",     "text": "Revisar quién respondió, pidió precio o quiere demo", "done": false, "notes": ""},
    {"id": "t11", "when": "Sáb 7 nov",     "text": "Ofrecer precio de lanzamiento a los 3 más interesados", "done": false, "notes": ""},
    {"id": "t12", "when": "Protección",    "text": "Registrar el nombre comercial en ONAPI", "done": false, "notes": ""},
    {"id": "t13", "when": "Protección",    "text": "Revisar que cada tour tenga logo y botón de WhatsApp", "done": false, "notes": ""}
  ]'::jsonb
) on conflict (week_start) do nothing;
