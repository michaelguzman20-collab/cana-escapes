-- =============================================================
-- Cana Escapes — Schema v3: Enlace público de propietario
-- Supabase Dashboard → SQL Editor → New query
-- =============================================================

-- Agregar columnas de compartir a properties
alter table public.properties
  add column if not exists share_token uuid not null default gen_random_uuid(),
  add column if not exists share_enabled boolean not null default false;

-- ─── Políticas para acceso anónimo (enlace público) ───────────

-- Propiedades: leer si share_enabled = true
create policy "Anon read shared properties"
  on public.properties for select
  to anon
  using (share_enabled = true);

-- Reservas: leer si la propiedad tiene share_enabled = true
create policy "Anon read shared reservations"
  on public.reservations for select
  to anon
  using (exists (
    select 1 from public.properties p
    where p.id = reservations.property_id
      and p.share_enabled = true
  ));

-- Brackets: acceso anónimo (necesario para calcular bracket activo)
create policy "Anon read brackets"
  on public.brackets for select
  to anon
  using (true);
