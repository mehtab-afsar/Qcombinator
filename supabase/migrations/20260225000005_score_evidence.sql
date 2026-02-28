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
