-- Store profile builder flow state (flowMode, smartQuestions, smartQaIndex, extractionSummary)
-- so the fast-flow survives page refresh.
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS profile_builder_flow JSONB DEFAULT NULL;
