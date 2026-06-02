-- ─────────────────────────────────────────────────────────────────────────────
-- access_logs: tracks every login, logout, and page visit by all users
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.access_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users(id) on delete set null,
  user_email   text        not null,
  user_role    text,                          -- 'admin' | 'guest'
  action       text        not null,          -- 'login' | 'logout' | 'page_visit'
  page         text,                          -- pathname for page_visit
  metadata     jsonb,                         -- extra context (browser, etc.)
  created_at   timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists access_logs_created_at_idx  on public.access_logs (created_at desc);
create index if not exists access_logs_user_email_idx  on public.access_logs (user_email);
create index if not exists access_logs_action_idx      on public.access_logs (action);

-- RLS
alter table public.access_logs enable row level security;

-- Admin can read all logs
create policy "Admins read all access_logs"
  on public.access_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Any authenticated user can insert their own log entry
create policy "Authenticated users insert access_logs"
  on public.access_logs for insert
  with check (auth.uid() is not null);
