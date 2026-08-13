-- ─────────────────────────────────────────────────────────────────────────────
-- 001_initial.sql — Second Thought Phase 1 Schema
-- ─────────────────────────────────────────────────────────────────────────────
-- Tables: profiles, investigation_sessions, investigation_inputs
-- Includes: triggers, RLS policies (SELECT + INSERT + UPDATE), indexes
--
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. profiles
--    Extends auth.users with application-level data.
--    Created automatically by trigger on new user signup.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id              uuid        primary key
                              references auth.users(id) on delete cascade,
  display_name    text,
  avatar_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is
  'Application-level user profile extending auth.users.';

-- Auto-create profile row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. investigation_sessions
--    One session per content submission. Tracks lifecycle status.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.investigation_sessions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null
                            references public.profiles(id) on delete cascade,
  status        text        not null default 'pending'
                            check (status in ('pending', 'processing', 'complete', 'error')),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

comment on table public.investigation_sessions is
  'One session per investigation submission. Tracks processing lifecycle.';
comment on column public.investigation_sessions.status is
  'pending → processing → complete | error. Phase 1 goes directly pending → complete.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. investigation_inputs
--    The raw submitted content for each session.
--    Phase 1: text only. Phase 2+: url, image.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.investigation_inputs (
  id            uuid        primary key default gen_random_uuid(),
  session_id    uuid        not null
                            references public.investigation_sessions(id) on delete cascade,
  content_type  text        not null
                            check (content_type in ('text', 'url', 'image')),
  raw_text      text,
  source_url    text,
  file_path     text,
  created_at    timestamptz not null default now(),

  -- Ensure at least one content field is populated
  constraint text_or_url_or_file
    check (raw_text is not null or source_url is not null or file_path is not null)
);

comment on table public.investigation_inputs is
  'Raw submitted content. Phase 1: text only.';


-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles              enable row level security;
alter table public.investigation_sessions enable row level security;
alter table public.investigation_inputs   enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────────

create policy "profiles: own select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id);

-- profiles INSERT is handled by the trigger (security definer function)
-- No direct client INSERT policy needed.

-- ── investigation_sessions ────────────────────────────────────────────────────

create policy "sessions: own select"
  on public.investigation_sessions for select
  using (auth.uid() = user_id);

-- Allow authenticated users to insert their own sessions.
-- The backend uses the user's JWT (user-scoped client) so auth.uid() is set.
create policy "sessions: own insert"
  on public.investigation_sessions for insert
  with check (auth.uid() = user_id);

-- Allow users to update the status of their own sessions.
create policy "sessions: own update"
  on public.investigation_sessions for update
  using (auth.uid() = user_id);

-- ── investigation_inputs ──────────────────────────────────────────────────────

create policy "inputs: own select"
  on public.investigation_inputs for select
  using (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

-- Allow inserting inputs for sessions the user owns.
create policy "inputs: own insert"
  on public.investigation_inputs for insert
  with check (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Lookup sessions by user (dashboard, auth checks)
create index if not exists idx_investigation_sessions_user_id
  on public.investigation_sessions (user_id);

-- Sort sessions by recency
create index if not exists idx_investigation_sessions_created_at
  on public.investigation_sessions (created_at desc);

-- Lookup inputs by session
create index if not exists idx_investigation_inputs_session_id
  on public.investigation_inputs (session_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Notes
-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2+ tables (lens_findings, reflection_steps, etc.) are intentionally
-- absent. They will be added in separate numbered migration files when the
-- corresponding features are implemented.
--
-- The backend uses the user's Supabase JWT (postgrest.auth(token)) for all
-- DB operations. This means all writes are scoped to the authenticated user
-- and are validated by the RLS policies above. No service role key is used.
