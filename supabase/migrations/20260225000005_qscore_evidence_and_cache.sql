-- ============================================================
-- Consolidates:
--   20260225000005_score_evidence.sql
--   20260225000012_qscore_assessment_data.sql
--   20260225000015_portfolio_views.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260225000005_score_evidence.sql
-- ============================================================

-- Score Evidence Attachments
-- Founders can attach proof documents (Stripe screenshots, LOIs, contracts, analytics)
-- to specific Q-Score dimensions. Verified evidence bumps dimension scores.

CREATE TABLE IF NOT EXISTS score_evidence (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension       TEXT NOT NULL, -- market | product | goToMarket | financial | team | traction
  evidence_type   TEXT NOT NULL, -- stripe_screenshot | loi | contract | analytics | customer_email | other
  title           TEXT NOT NULL,
  description     TEXT,
  file_url        TEXT,          -- Supabase storage URL (optional)
  data_value      TEXT,          -- numeric claim e.g. "MRR $12,000" or "3 signed LOIs"
  status          TEXT DEFAULT 'pending', -- pending | verified | rejected
  points_awarded  INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

-- RLS
ALTER TABLE score_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own evidence"
  ON score_evidence FOR ALL
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS score_evidence_user_id_idx ON score_evidence (user_id);
CREATE INDEX IF NOT EXISTS score_evidence_dimension_idx ON score_evidence (user_id, dimension);

-- qscore_history assessment_data column and index
-- defined in 20260200000001_qscore_history_squashed.sql

-- ============================================================
-- SOURCE: 20260225000015_portfolio_views.sql
-- ============================================================

-- Track when investors (or anyone) view a founder's public portfolio page.
-- Inserted via service-role client (no auth required on the public route).
-- Founders read their own analytics via RLS.

CREATE TABLE IF NOT EXISTS portfolio_views (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id  UUID        NOT NULL,
  viewer_ip   TEXT,
  referrer    TEXT,
  viewed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolio_views_founder_idx
  ON portfolio_views (founder_id, viewed_at DESC);

ALTER TABLE portfolio_views ENABLE ROW LEVEL SECURITY;

-- Founders can SELECT only their own rows (authenticated reads via analytics API)
CREATE POLICY "founders_read_own_views"
  ON portfolio_views FOR SELECT
  USING (auth.uid() = founder_id);

-- Service-role inserts bypass RLS, so no INSERT policy needed for the public route.
-- If you want anon inserts too, uncomment:
-- CREATE POLICY "public_insert_views"
--   ON portfolio_views FOR INSERT
--   WITH CHECK (true);
