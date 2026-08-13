-- ─────────────────────────────────────────────────────────────────────────────
-- 004_history.sql — Second Thought Phase 4 History Title Support
-- ─────────────────────────────────────────────────────────────────────────────

-- Add title column to investigation_sessions to hold truncated claim titles
ALTER TABLE public.investigation_sessions 
ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.investigation_sessions.title IS
  'Deterministic claim preview (first 60-80 chars) for navigation history.';
