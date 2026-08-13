-- ─────────────────────────────────────────────────────────────────────────────
-- 002_lens_findings.sql — Second Thought Phase 2 Schema
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend investigation_sessions with optional processing error tracking
alter table public.investigation_sessions 
  add column if not exists error_message text;

-- 2. Extend investigation_inputs with sanitized_text for the pre-processed query
alter table public.investigation_inputs 
  add column if not exists sanitized_text text;

-- 3. Create lens_findings table to store output from each AI lens
create table if not exists public.lens_findings (
  id            uuid        primary key default gen_random_uuid(),
  session_id    uuid        not null
                            references public.investigation_sessions(id) on delete cascade,
  lens_type     text        not null
                            check (lens_type in ('source', 'emotion', 'evidence', 'synthesis')),
  findings      jsonb       not null,
  created_at    timestamptz not null default now(),
  
  -- Ensure only one record per lens type per investigation session
  constraint unique_session_lens unique (session_id, lens_type)
);

comment on table public.lens_findings is
  'Stores structured lens-specific output and synthesis reports.';

-- 4. Enable Row Level Security (RLS)
alter table public.lens_findings enable row level security;

-- 5. Establish RLS policies for lens_findings
-- Users can read findings only if they own the parent investigation session
create policy "lens_findings: own select"
  on public.lens_findings for select
  using (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

-- Users can insert findings only if they own the parent investigation session
create policy "lens_findings: own insert"
  on public.lens_findings for insert
  with check (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

-- Users can update findings only if they own the parent investigation session
create policy "lens_findings: own update"
  on public.lens_findings for update
  using (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

-- 6. Indexes
create index if not exists idx_lens_findings_session_id
  on public.lens_findings (session_id);
