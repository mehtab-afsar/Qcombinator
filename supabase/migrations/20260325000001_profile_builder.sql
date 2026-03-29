-- ============================================================
-- Consolidates:
--   20260325000001_profile_builder_draft.sql
--   20260325000002_profile_builder.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260325000001_profile_builder_draft.sql
-- ============================================================

-- Profile Builder draft persistence
-- Stores partial answers so founders can resume mid-flow

ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS profile_builder_draft JSONB,
  ADD COLUMN IF NOT EXISTS profile_builder_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revenue_status TEXT,
  ADD COLUMN IF NOT EXISTS customer_proof TEXT,
  ADD COLUMN IF NOT EXISTS fundraising_status TEXT;

-- ============================================================
-- SOURCE: 20260325000002_profile_builder.sql
-- ============================================================

-- Profile Builder: new tables + columns on founder_profiles

-- ── profile_builder_data ──────────────────────────────────────────────────────
-- One row per user per section (1-5). Upserted as the founder progresses.
CREATE TABLE IF NOT EXISTS profile_builder_data (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users NOT NULL,
  section           int  NOT NULL CHECK (section BETWEEN 1 AND 5),
  raw_conversation  text,
  uploaded_documents jsonb,
  extracted_fields  jsonb,
  confidence_map    jsonb,
  completion_score  int  CHECK (completion_score BETWEEN 0 AND 100),
  completed_at      timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (user_id, section)
);

-- ── profile_builder_uploads ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_builder_uploads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users NOT NULL,
  section        int  NOT NULL,
  filename       text,
  file_type      text,
  storage_path   text,
  extracted_text text,
  parsed_data    jsonb,
  confidence     numeric(3,2),
  uploaded_at    timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE profile_builder_data    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_builder_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_builder_data_owner"
  ON profile_builder_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_builder_uploads_owner"
  ON profile_builder_uploads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── founder_profiles — new columns ────────────────────────────────────────────
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS company_name              text,
  ADD COLUMN IF NOT EXISTS website                   text,
  ADD COLUMN IF NOT EXISTS founded_date              text,
  ADD COLUMN IF NOT EXISTS incorporation_type        text,
  ADD COLUMN IF NOT EXISTS description               text,
  ADD COLUMN IF NOT EXISTS revenue_status            text,
  ADD COLUMN IF NOT EXISTS funding_status            text,
  ADD COLUMN IF NOT EXISTS team_size                 text,
  ADD COLUMN IF NOT EXISTS founder_name              text,
  ADD COLUMN IF NOT EXISTS linkedin_url              text,
  ADD COLUMN IF NOT EXISTS cofounder_count           int,
  ADD COLUMN IF NOT EXISTS years_on_problem          text,
  ADD COLUMN IF NOT EXISTS prior_experience          text,
  ADD COLUMN IF NOT EXISTS registration_completed    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_builder_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_builder_completed_at timestamptz;
