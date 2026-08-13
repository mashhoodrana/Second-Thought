-- Allow authenticated users to delete their own investigation sessions
CREATE POLICY "sessions: own delete"
  ON public.investigation_sessions FOR DELETE
  USING (auth.uid() = user_id);
