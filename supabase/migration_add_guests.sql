-- Add guests column to reservations table
alter table public.reservations
  add column if not exists guests integer not null default 1;
