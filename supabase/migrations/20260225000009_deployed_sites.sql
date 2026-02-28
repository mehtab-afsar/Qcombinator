-- Netlify deployed sites tracker
CREATE TABLE IF NOT EXISTS deployed_sites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id      UUID,
  site_name        TEXT NOT NULL,
  netlify_site_id  TEXT,
  url              TEXT,
  deploy_type      TEXT DEFAULT 'landing_page',  -- landing_page | website | blog
  deployed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployed_sites_user ON deployed_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_deployed_sites_artifact ON deployed_sites(artifact_id);

ALTER TABLE deployed_sites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deployed_sites' AND policyname='Founders manage own sites') THEN
    CREATE POLICY "Founders manage own sites" ON deployed_sites
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Investor updates log (Felix + Sage)
CREATE TABLE IF NOT EXISTS investor_updates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject          TEXT NOT NULL,
  body_html        TEXT NOT NULL,
  metrics_snapshot JSONB DEFAULT '{}',
  recipients       TEXT[] DEFAULT '{}',
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resend_id        TEXT
);

CREATE INDEX IF NOT EXISTS idx_investor_updates_user ON investor_updates(user_id);

ALTER TABLE investor_updates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='investor_updates' AND policyname='Founders manage own updates') THEN
    CREATE POLICY "Founders manage own updates" ON investor_updates
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Survey responses (Nova)
CREATE TABLE IF NOT EXISTS survey_responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id         UUID NOT NULL,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- the founder who owns the survey
  respondent_email  TEXT,
  answers           JSONB NOT NULL DEFAULT '{}',
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user   ON survey_responses(user_id);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Founder can read responses to their surveys; anyone can insert (public survey)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='survey_responses' AND policyname='Founders read own survey responses') THEN
    CREATE POLICY "Founders read own survey responses" ON survey_responses
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='survey_responses' AND policyname='Anyone can submit survey response') THEN
    CREATE POLICY "Anyone can submit survey response" ON survey_responses
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Job applications (Harper)
CREATE TABLE IF NOT EXISTS applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_slug        TEXT NOT NULL,
  role_title       TEXT,
  applicant_name   TEXT NOT NULL,
  applicant_email  TEXT NOT NULL,
  resume_url       TEXT,
  resume_text      TEXT,
  score            INT,
  score_notes      TEXT,
  status           TEXT DEFAULT 'new',  -- new | reviewed | shortlisted | rejected | offered
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_role ON applications(user_id, role_slug);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='applications' AND policyname='Founders manage own applications') THEN
    CREATE POLICY "Founders manage own applications" ON applications
      FOR ALL USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='applications' AND policyname='Anyone can apply') THEN
    CREATE POLICY "Anyone can apply" ON applications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Tracked competitors (Atlas)
CREATE TABLE IF NOT EXISTS tracked_competitors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  url         TEXT,
  last_scraped_at  TIMESTAMPTZ,
  last_price_data  JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tracked_competitors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tracked_competitors' AND policyname='Founders manage own competitors') THEN
    CREATE POLICY "Founders manage own competitors" ON tracked_competitors
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Investor contacts (Sage)
CREATE TABLE IF NOT EXISTS investor_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  firm       TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE investor_contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='investor_contacts' AND policyname='Founders manage own investor contacts') THEN
    CREATE POLICY "Founders manage own investor contacts" ON investor_contacts
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
