-- ============================================================
-- Consolidates:
--   20260225000007_outreach_sends.sql
--   20260225000008_susi_proposals_deals.sql
--   20260225000009_deployed_sites.sql
--   20260225000010_waitlist_signups.sql
--   20260225000011_deals_unique_contact.sql
--   20260227000001_legal_documents.sql
--   20260228000001_startup_profile_data.sql
--   20260228000003_founder_notification_preferences.sql
--   20260228000005_phase4_additions.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260225000007_outreach_sends.sql
-- ============================================================

-- outreach_sends: tracks every email Patel sends on behalf of a founder
-- Enables "Patel sent 47 emails today, 3 replied" reporting

CREATE TABLE IF NOT EXISTS outreach_sends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id     UUID,                             -- references agent_artifacts.id (nullable — may not be persisted yet)
  sequence_name   TEXT,                             -- e.g. "SaaS Founder Outreach"
  contact_email   TEXT NOT NULL,
  contact_name    TEXT,
  contact_company TEXT,
  contact_title   TEXT,
  step_index      INTEGER NOT NULL DEFAULT 0,       -- 0=first email, 1=follow-up, etc.
  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  resend_id       TEXT,                             -- Resend message ID for tracking
  status          TEXT NOT NULL DEFAULT 'sent'      -- sent | opened | clicked | replied | bounced
);

CREATE INDEX IF NOT EXISTS idx_outreach_sends_user    ON outreach_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sends_email   ON outreach_sends(contact_email);
CREATE INDEX IF NOT EXISTS idx_outreach_sends_sent_at ON outreach_sends(user_id, sent_at DESC);

-- RLS: founders only see their own sends
ALTER TABLE outreach_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outreach_sends' AND policyname='Founders see own sends') THEN
    CREATE POLICY "Founders see own sends" ON outreach_sends
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- pending_actions: approval queue for all agent actions before execution
CREATE TABLE IF NOT EXISTS pending_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,                      -- 'patel', 'felix', 'sage', etc.
  action_type   TEXT NOT NULL,                      -- 'send_outreach', 'deploy_site', 'send_invoice', etc.
  title         TEXT NOT NULL,                      -- "Send 47 emails to SaaS founders"
  summary       TEXT,                               -- "3 email steps, personalized per contact"
  payload       JSONB NOT NULL DEFAULT '{}',        -- full action data (contacts, content, etc.)
  status        TEXT NOT NULL DEFAULT 'pending',    -- pending | approved | rejected | executing | done | failed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  executed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_actions_user   ON pending_actions(user_id, status);

ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pending_actions' AND policyname='Founders manage own actions') THEN
    CREATE POLICY "Founders manage own actions" ON pending_actions
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- agent_activity: audit log of everything agents do
CREATE TABLE IF NOT EXISTS agent_activity (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,
  action_type   TEXT NOT NULL,
  description   TEXT NOT NULL,                      -- human-readable: "Sent 47 emails to SaaS founders"
  metadata      JSONB DEFAULT '{}',                 -- { count: 47, opens: 12, replies: 3 }
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_user ON agent_activity(user_id, created_at DESC);

ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_activity' AND policyname='Founders see own activity') THEN
    CREATE POLICY "Founders see own activity" ON agent_activity
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- SOURCE: 20260225000008_susi_proposals_deals.sql
-- ============================================================

-- Susi Sales Agent: proposals + deals pipeline

-- proposals: tracks every sent sales proposal
CREATE TABLE IF NOT EXISTS proposals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id      UUID,                           -- links to the sales_script agent_artifact
  prospect_name    TEXT NOT NULL,
  prospect_email   TEXT NOT NULL,
  prospect_company TEXT,
  prospect_title   TEXT,
  deal_value       TEXT,                           -- e.g. "$12,000/year"
  use_case         TEXT,                           -- what they want to solve
  subject          TEXT NOT NULL,
  proposal_html    TEXT NOT NULL,                  -- full HTML email body
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at        TIMESTAMPTZ,
  replied_at       TIMESTAMPTZ,
  resend_id        TEXT,
  status           TEXT NOT NULL DEFAULT 'sent'    -- sent | opened | replied | won | lost
);

CREATE INDEX IF NOT EXISTS idx_proposals_user     ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_prospect ON proposals(user_id, prospect_email);
CREATE INDEX IF NOT EXISTS idx_proposals_sent_at  ON proposals(user_id, sent_at DESC);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='proposals' AND policyname='Founders manage own proposals') THEN
    CREATE POLICY "Founders manage own proposals" ON proposals
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;


-- deals: lightweight CRM pipeline
CREATE TABLE IF NOT EXISTS deals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company          TEXT NOT NULL,
  contact_name     TEXT,
  contact_email    TEXT,
  contact_title    TEXT,
  stage            TEXT NOT NULL DEFAULT 'lead',   -- lead | qualified | proposal | negotiating | won | lost
  value            TEXT,                           -- deal value string e.g. "$5,000/mo"
  notes            TEXT,
  next_action      TEXT,                           -- what to do next
  next_action_date DATE,
  source           TEXT DEFAULT 'manual',          -- manual | susi_suggested | proposal_sent
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_user  ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(user_id, stage);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deals' AND policyname='Founders manage own deals') THEN
    CREATE POLICY "Founders manage own deals" ON deals
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- SOURCE: 20260225000009_deployed_sites.sql
-- ============================================================

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

-- ============================================================
-- SOURCE: 20260225000010_waitlist_signups.sql
-- ============================================================

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

-- ============================================================
-- SOURCE: 20260225000011_deals_unique_contact.sql
-- ============================================================

-- Add unique index on deals(user_id, contact_email) for upsert support
-- Partial index: only enforces uniqueness when contact_email is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_user_contact_email
  ON deals(user_id, contact_email)
  WHERE contact_email IS NOT NULL;

-- ============================================================
-- SOURCE: 20260227000001_legal_documents.sql
-- ============================================================

-- ============================================================
-- Legal Documents — NDAs, SAFEs, and other generated docs
-- ============================================================

CREATE TABLE IF NOT EXISTS legal_documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type          TEXT        NOT NULL CHECK (doc_type IN ('nda', 'safe', 'offer_letter', 'term_sheet')),
  counterparty_name TEXT,
  counterparty_email TEXT,
  content_html      TEXT,
  status            TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired')),
  sent_at           TIMESTAMPTZ,
  signed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS legal_documents_user_idx
  ON legal_documents (user_id, created_at DESC);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own legal documents"
  ON legal_documents FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SOURCE: 20260228000001_startup_profile_data.sql
-- ============================================================

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

-- ============================================================
-- SOURCE: 20260228000003_founder_notification_preferences.sql
-- ============================================================

-- Store founder notification preferences in a JSONB column.
-- Mirrors the investor_profiles.notification_preferences pattern.

ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN founder_profiles.notification_preferences IS
  'JSONB map of per-type notification flags: { emailNotifications, qScoreUpdates, investorMessages, weeklyDigest }';

-- ============================================================
-- SOURCE: 20260228000005_phase4_additions.sql
-- ============================================================

-- ============================================================
-- Phase 4 additions
-- 1. outreach_sends: add updated_at for webhook status updates
-- 2. deals: add win_reason + loss_reason for win/loss logging
-- 3. applications: add status for rejection tracking
-- ============================================================

-- Allow webhook to update status + timestamp on outreach_sends
ALTER TABLE outreach_sends
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for resend_id lookups (webhook events)
CREATE INDEX IF NOT EXISTS idx_outreach_sends_resend_id
  ON outreach_sends (resend_id)
  WHERE resend_id IS NOT NULL;

-- Index for contact_email lookups (webhook fallback)
CREATE INDEX IF NOT EXISTS idx_outreach_sends_contact_email
  ON outreach_sends (contact_email, user_id);

-- Win/loss reason logging on deals
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS win_reason  TEXT,
  ADD COLUMN IF NOT EXISTS loss_reason TEXT;

-- Application status for Harper rejection flow
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';  -- new | reviewed | rejected | accepted
