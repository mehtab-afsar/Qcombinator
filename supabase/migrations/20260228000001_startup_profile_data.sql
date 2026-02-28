-- ============================================================
-- Startup Profile Data — rich form data from the 6-step
-- Startup Deep Dive form (startup-profile page).
-- Stored as JSONB to avoid 30+ column proliferation.
-- ============================================================

ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS startup_profile_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS startup_profile_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_founder_profiles_startup_profile_completed
  ON founder_profiles (startup_profile_completed)
  WHERE startup_profile_completed = true;
