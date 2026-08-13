-- ─────────────────────────────────────────────────────────────────────────────
-- 003_phase3.sql — Second Thought Phase 3 Schema
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend lens_findings check constraint to support context and ai lenses
alter table public.lens_findings
  drop constraint if exists lens_findings_lens_type_check;

alter table public.lens_findings
  add constraint lens_findings_lens_type_check
  check (lens_type in ('source', 'emotion', 'evidence', 'synthesis', 'context', 'ai'));

-- 2. Create thinking_questions table to store generated questions for each session
create table if not exists public.thinking_questions (
  id            uuid        primary key default gen_random_uuid(),
  session_id    uuid        not null
                            references public.investigation_sessions(id) on delete cascade,
  question_text text        not null,
  category      text        not null,
  rationale     text        not null,
  created_at    timestamptz not null default now()
);

comment on table public.thinking_questions is
  'Stores generated critical-thinking questions for an investigation session.';

-- 3. Create reflection_responses table to store user reflection inputs and share decisions
create table if not exists public.reflection_responses (
  session_id             uuid        primary key
                                     references public.investigation_sessions(id) on delete cascade,
  initial_reaction       text        check (initial_reaction in ('believe', 'doubt', 'unsure', 'share')),
  post_analysis_reaction text        check (post_analysis_reaction in ('more_confident', 'less_confident', 'still_unsure', 'need_evidence')),
  what_changed           text,
  share_decision         text        check (share_decision in ('share_with_context', 'wait_and_verify', 'not_share', 'still_unsure')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.reflection_responses is
  'Stores user reflection inputs, reactions, and share-readiness decisions for a session.';

-- 4. Enable Row Level Security (RLS)
alter table public.thinking_questions enable row level security;
alter table public.reflection_responses enable row level security;

-- 5. RLS Policies for thinking_questions
create policy "thinking_questions: own select"
  on public.thinking_questions for select
  using (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

create policy "thinking_questions: own insert"
  on public.thinking_questions for insert
  with check (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

-- 6. RLS Policies for reflection_responses
create policy "reflection_responses: own select"
  on public.reflection_responses for select
  using (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

create policy "reflection_responses: own insert"
  on public.reflection_responses for insert
  with check (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

create policy "reflection_responses: own update"
  on public.reflection_responses for update
  using (
    exists (
      select 1
      from public.investigation_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

-- 7. Indexes
create index if not exists idx_thinking_questions_session_id
  on public.thinking_questions (session_id);
