-- Email confirmation + drip email tracking columns on founder_profiles
-- Free-tier Supabase: no pg_cron — drip logic lives in Vercel cron routes

ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS email_confirmed_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_confirm_token UUID        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_day1_sent     BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_day7_sent     BOOLEAN     DEFAULT FALSE;

-- Token lookup index — only exists while token is set (partial, space-efficient)
CREATE INDEX IF NOT EXISTS idx_founder_profiles_confirm_token
  ON founder_profiles(email_confirm_token)
  WHERE email_confirm_token IS NOT NULL;
