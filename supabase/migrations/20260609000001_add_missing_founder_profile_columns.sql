-- Add columns that are defined in the squashed migration but not yet in the live DB.
-- Using IF NOT EXISTS so this is safe to run multiple times.
--
-- ⚠️ REPLAY-GUARDED (20 Jul 2026, FU-003): founder_profiles is created by the July squash
-- (20260700000001), which replays AFTER this June file — its CREATE TABLE already contains
-- all five columns, and it builds equivalent indexes (idx_founder_profiles_confirm_token,
-- idx_founder_profiles_background). So on a rebuild-from-empty this file safely no-ops;
-- nothing needs recreating. Production ran it in June against the live table; applied
-- migrations are never re-run.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'founder_profiles') THEN
    ALTER TABLE founder_profiles
      ADD COLUMN IF NOT EXISTS founder_background    TEXT[]  DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS market_size_estimate  TEXT,
      ADD COLUMN IF NOT EXISTS gtm_strategy          TEXT,
      ADD COLUMN IF NOT EXISTS startup_profile_data  JSONB   DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS email_confirm_token   UUID    DEFAULT NULL;

    CREATE INDEX IF NOT EXISTS idx_founder_profiles_email_confirm_token
      ON founder_profiles(email_confirm_token)
      WHERE email_confirm_token IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_founder_profiles_founder_background
      ON founder_profiles USING GIN (founder_background);
  END IF;
END $$;
