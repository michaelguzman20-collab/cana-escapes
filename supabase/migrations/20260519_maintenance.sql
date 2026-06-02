-- ══════════════════════════════════════════════════════════════════
-- Maintenance Module — Tickets + Scheduled Preventive Tasks
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.maintenance_tickets (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id),
  categoria       text not null default 'Otro',
  prioridad       text not null default 'Media',
  estado          text not null default 'Pendiente',
  titulo          text not null,
  descripcion     text,
  tecnico_nombre  text,
  tecnico_telefono text,
  costo_estimado  numeric(12,2) not null default 0,
  costo_real      numeric(12,2) not null default 0,
  currency        text not null default 'DOP',
  fecha_reporte   date not null default current_date,
  fecha_programada date,
  fecha_resuelto  date,
  fotos           text[] default '{}',
  notas           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.maintenance_schedules (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id),
  categoria       text not null,
  titulo          text not null,
  descripcion     text,
  tecnico_nombre  text,
  tecnico_telefono text,
  frecuencia_dias int not null default 30,
  costo_estimado  numeric(12,2) not null default 0,
  currency        text not null default 'DOP',
  ultima_ejecucion date,
  proxima_ejecucion date,
  activo          boolean not null default true,
  notas           text,
  created_at      timestamptz not null default now()
);

-- RLS
alter table public.maintenance_tickets enable row level security;
alter table public.maintenance_schedules enable row level security;

create policy "maintenance_tickets_admin" on public.maintenance_tickets
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "maintenance_schedules_admin" on public.maintenance_schedules
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Indexes
create index if not exists idx_maintenance_tickets_property on public.maintenance_tickets(property_id);
create index if not exists idx_maintenance_tickets_estado on public.maintenance_tickets(estado);
create index if not exists idx_maintenance_tickets_fecha on public.maintenance_tickets(fecha_reporte);
create index if not exists idx_maintenance_schedules_property on public.maintenance_schedules(property_id);
create index if not exists idx_maintenance_schedules_proxima on public.maintenance_schedules(proxima_ejecucion);
