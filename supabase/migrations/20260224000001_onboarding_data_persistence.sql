-- ============================================================
-- Migration: Add onboarding data persistence columns
-- ============================================================

-- Store extracted data from onboarding conversation
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS onboarding_extracted_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_chat_history JSONB DEFAULT '[]';

-- Track data source for each Q-Score entry (onboarding vs assessment vs combined)
ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'assessment'
    CHECK (data_source IN ('onboarding', 'assessment', 'combined'));
