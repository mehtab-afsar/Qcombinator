-- Investor Pipeline CRM
-- Investors can track founders through deal stages with private notes

CREATE TABLE IF NOT EXISTS investor_pipeline (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  founder_user_id   UUID NOT NULL,
  stage             TEXT NOT NULL DEFAULT 'watching'
                    CHECK (stage IN ('watching', 'interested', 'meeting', 'in_dd', 'portfolio', 'passed')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investor_user_id, founder_user_id)
);

-- RLS: investors can only see their own pipeline
ALTER TABLE investor_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors manage own pipeline"
  ON investor_pipeline
  FOR ALL
  USING (investor_user_id = auth.uid())
  WITH CHECK (investor_user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_investor_pipeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investor_pipeline_updated_at
  BEFORE UPDATE ON investor_pipeline
  FOR EACH ROW EXECUTE FUNCTION update_investor_pipeline_updated_at();
