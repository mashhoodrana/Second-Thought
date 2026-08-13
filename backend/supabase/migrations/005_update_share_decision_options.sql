-- ─────────────────────────────────────────────────────────────────────────────
-- 005_update_share_decision_options.sql — Update share_decision options
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the old check constraint first so updates don't trigger validation errors
ALTER TABLE public.reflection_responses
  DROP CONSTRAINT IF EXISTS reflection_responses_share_decision_check;

-- 2. Update existing rows to the new naming convention
UPDATE public.reflection_responses 
SET share_decision = 'share_with_context' 
WHERE share_decision = 'share';

UPDATE public.reflection_responses 
SET share_decision = 'wait_and_verify' 
WHERE share_decision = 'wait_verify';

UPDATE public.reflection_responses 
SET share_decision = 'not_share' 
WHERE share_decision = 'no_share';

-- 3. Add the new constraint
ALTER TABLE public.reflection_responses
  ADD CONSTRAINT reflection_responses_share_decision_check
  CHECK (share_decision IN ('share_with_context', 'wait_and_verify', 'not_share', 'still_unsure'));
