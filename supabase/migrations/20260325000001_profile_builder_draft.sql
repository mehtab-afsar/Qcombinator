-- Profile Builder draft persistence
-- Stores partial answers so founders can resume mid-flow

ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS profile_builder_draft JSONB,
  ADD COLUMN IF NOT EXISTS profile_builder_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revenue_status TEXT,
  ADD COLUMN IF NOT EXISTS customer_proof TEXT,
  ADD COLUMN IF NOT EXISTS fundraising_status TEXT;
