-- Add columns that are defined in the squashed migration but not yet in the live DB.
-- Using IF NOT EXISTS so this is safe to run multiple times.

ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS founder_background    TEXT[]  DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS market_size_estimate  TEXT,
  ADD COLUMN IF NOT EXISTS gtm_strategy          TEXT,
  ADD COLUMN IF NOT EXISTS startup_profile_data  JSONB   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS email_confirm_token   UUID    DEFAULT NULL;

-- Indexes for the new columns (safe to create if they don't exist)
CREATE INDEX IF NOT EXISTS idx_founder_profiles_email_confirm_token
  ON founder_profiles(email_confirm_token)
  WHERE email_confirm_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_founder_profiles_founder_background
  ON founder_profiles USING GIN (founder_background);
