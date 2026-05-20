-- Email confirmation + drip tracking columns for investor_profiles
-- Mirrors the same columns added to founder_profiles in migration 20260520000001

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS email_confirmed_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_confirm_token UUID        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_day1_sent     BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_day7_sent     BOOLEAN     DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_investor_profiles_confirm_token
  ON investor_profiles(email_confirm_token)
  WHERE email_confirm_token IS NOT NULL;
