-- Soft-delete for reservations
alter table public.reservations
  add column if not exists deleted_at timestamptz default null;
