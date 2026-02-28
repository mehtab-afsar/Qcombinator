-- Waitlist signups for Nova fake-door tests
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID NOT NULL,   -- references the fake-door artifact id
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT,
  source        TEXT,            -- utm_source or referrer
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_test ON waitlist_signups(test_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_user ON waitlist_signups(user_id);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='waitlist_signups' AND policyname='Founders read own signups') THEN
    CREATE POLICY "Founders read own signups" ON waitlist_signups
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='waitlist_signups' AND policyname='Anyone can join waitlist') THEN
    CREATE POLICY "Anyone can join waitlist" ON waitlist_signups
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Linear tokens per founder (for Sage OKR sync)
CREATE TABLE IF NOT EXISTS linear_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  api_key     TEXT NOT NULL,
  team_id     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE linear_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='linear_tokens' AND policyname='Founders manage own Linear token') THEN
    CREATE POLICY "Founders manage own Linear token" ON linear_tokens
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
