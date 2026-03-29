-- ============================================================
-- Consolidates:
--   20260327000001_iq_score_version.sql
--   20260327000002_sector_weight_profiles.sql
--   20260327000003_qscore_benchmarks.sql
--   20260327000004_qscore_reconciliation_log.sql
--   20260327000005_iq_score_v2_history_columns.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260327000001_iq_score_version.sql
-- ============================================================

-- ============================================================================
-- Edge Alpha IQ Score v2 — Migration 1: score_version column + is_impact_focused
-- Freeze legacy v1_prd scores, new submissions tagged v2_iq
-- ============================================================================

-- 1. Add score_version to qscore_history (safely idempotent)
ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS score_version TEXT NOT NULL DEFAULT 'v1_prd';

-- Backfill existing rows as legacy
UPDATE qscore_history
  SET score_version = 'v1_prd'
  WHERE score_version IS NULL OR score_version = '';

-- 2. Add is_impact_focused to founder_profiles
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS is_impact_focused BOOLEAN NOT NULL DEFAULT false;

-- 3. Index for version-filtered queries (dashboard/investor portal)
CREATE INDEX IF NOT EXISTS qscore_history_version_idx
  ON qscore_history(user_id, score_version, calculated_at DESC);

-- ============================================================
-- SOURCE: 20260327000002_sector_weight_profiles.sql
-- ============================================================

-- ============================================================================
-- Edge Alpha IQ Score v2 — Migration 2: sector_weight_profiles table
-- DB-driven sector weights for all 6 parameters (P1–P6)
-- Weights must sum to 1.00 per sector (enforced by constraint)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sector_weight_profiles (
  sector      TEXT PRIMARY KEY,
  p1_weight   NUMERIC(4,2) NOT NULL,
  p2_weight   NUMERIC(4,2) NOT NULL,
  p3_weight   NUMERIC(4,2) NOT NULL,
  p4_weight   NUMERIC(4,2) NOT NULL,
  p5_weight   NUMERIC(4,2) NOT NULL,
  p6_weight   NUMERIC(4,2) NOT NULL,
  rationale   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT weights_sum CHECK (
    ROUND(p1_weight + p2_weight + p3_weight + p4_weight + p5_weight + p6_weight, 2) = 1.00
  )
);

-- RLS: readable by all authenticated users, writable only by service role
ALTER TABLE sector_weight_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sector weights"
  ON sector_weight_profiles FOR SELECT USING (true);

CREATE POLICY "Service role manage sector weights"
  ON sector_weight_profiles FOR ALL USING (auth.role() = 'service_role');

-- ─── Seed: 11 sector profiles ─────────────────────────────────────────────────
-- Weights: P1=Market Readiness, P2=Market Potential, P3=IP/Defensibility,
--          P4=Founder/Team, P5=Structural Impact, P6=Financials
-- Source: SaaS Capital, Bessemer, a16z, CB Insights, OpenView 2024

INSERT INTO sector_weight_profiles
  (sector, p1_weight, p2_weight, p3_weight, p4_weight, p5_weight, p6_weight, rationale)
VALUES
  ('b2b_saas',   0.24, 0.18, 0.10, 0.16, 0.05, 0.27,
   'Revenue metrics and financial efficiency dominate for SaaS; IP matters less than distribution'),
  ('biotech',    0.08, 0.18, 0.32, 0.26, 0.08, 0.08,
   'IP and team credentials are primary signals; revenue comes late'),
  ('marketplace', 0.28, 0.24, 0.08, 0.16, 0.06, 0.18,
   'Supply/demand balance and market size matter most; margins moderate'),
  ('fintech',    0.20, 0.18, 0.18, 0.20, 0.08, 0.16,
   'Regulatory/IP moat and team credibility balanced with financial scale'),
  ('consumer',   0.26, 0.22, 0.06, 0.14, 0.06, 0.26,
   'Growth velocity and market potential dominant; IP rarely matters'),
  ('climate',    0.14, 0.20, 0.22, 0.18, 0.18, 0.08,
   'Impact credibility and IP moat key; P5 carries real weight for climate track'),
  ('hardware',   0.12, 0.20, 0.28, 0.22, 0.06, 0.12,
   'Build complexity and team depth are the core moat for hardware'),
  ('edtech',     0.18, 0.20, 0.10, 0.16, 0.12, 0.24,
   'Financial sustainability and market scale matter; some impact weight'),
  ('healthtech', 0.16, 0.18, 0.22, 0.20, 0.10, 0.14,
   'Clinical IP and expert team required; financial secondary pre-clearance'),
  ('ai_ml',               0.20, 0.20, 0.18, 0.22, 0.06, 0.14,
   'Team is the moat for AI; data/IP moat secondary; market opportunity large'),
  ('enterprise_software', 0.22, 0.18, 0.12, 0.18, 0.06, 0.24,
   'Sales efficiency and net revenue retention dominate enterprise software evaluation'),
  ('logistics',           0.20, 0.20, 0.10, 0.16, 0.08, 0.26,
   'Network density and unit economics critical; winner-take-most dynamics'),
  ('agriculture',         0.14, 0.20, 0.18, 0.18, 0.16, 0.14,
   'Impact and distribution matter; IP moat through data and domain expertise'),
  ('proptech',            0.18, 0.22, 0.10, 0.16, 0.08, 0.26,
   'Market timing and unit economics critical; fragmented incumbent landscape'),
  ('default',             0.20, 0.20, 0.17, 0.18, 0.08, 0.17,
   'Balanced weights for unknown or mixed sectors')

ON CONFLICT (sector) DO UPDATE SET
  p1_weight  = EXCLUDED.p1_weight,
  p2_weight  = EXCLUDED.p2_weight,
  p3_weight  = EXCLUDED.p3_weight,
  p4_weight  = EXCLUDED.p4_weight,
  p5_weight  = EXCLUDED.p5_weight,
  p6_weight  = EXCLUDED.p6_weight,
  rationale  = EXCLUDED.rationale,
  updated_at = NOW();

-- ============================================================
-- SOURCE: 20260327000003_qscore_benchmarks.sql
-- ============================================================

-- ============================================================================
-- Edge Alpha IQ Score v2 — Migration 3: qscore_benchmarks table
-- Stores percentile distributions per indicator × sector × stage
-- Monthly cron refreshes these from qscore_history aggregate
-- ============================================================================

CREATE TABLE IF NOT EXISTS qscore_benchmarks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id TEXT NOT NULL,   -- '1.1', '2.3', '6.1', etc.
  sector       TEXT NOT NULL,
  stage        TEXT NOT NULL,   -- 'early' | 'mid' | 'growth'
  p10          NUMERIC(4,2),
  p25          NUMERIC(4,2),
  p50          NUMERIC(4,2),
  p75          NUMERIC(4,2),
  p90          NUMERIC(4,2),
  sample_size  INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(indicator_id, sector, stage)
);

CREATE INDEX IF NOT EXISTS qscore_benchmarks_lookup_idx
  ON qscore_benchmarks(indicator_id, sector, stage);

ALTER TABLE qscore_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read benchmarks"
  ON qscore_benchmarks FOR SELECT USING (true);

CREATE POLICY "Service role manage benchmarks"
  ON qscore_benchmarks FOR ALL USING (auth.role() = 'service_role');

-- ─── Seed: 75 rows (5 key indicators × 5 sectors × 3 stages) ─────────────────
-- Indicators: 6.1 Revenue Scale, 6.2 Burn Efficiency, 6.3 Runway,
--             6.4 Unit Economics, 1.2 Willingness to Pay
-- Sources: SaaS Capital 2024, Bessemer, OpenView, Carta, internal curation

INSERT INTO qscore_benchmarks
  (indicator_id, sector, stage, p10, p25, p50, p75, p90, sample_size)
VALUES
-- ── 6.1 Revenue Scale ────────────────────────────────────────────────────────
  ('6.1','b2b_saas','early', 1.0, 1.5, 2.0, 2.5, 3.0, 50),
  ('6.1','b2b_saas','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 120),
  ('6.1','b2b_saas','growth',3.0, 3.5, 4.0, 4.5, 5.0, 80),
  ('6.1','marketplace','early',1.0, 1.5, 2.0, 2.5, 3.0, 30),
  ('6.1','marketplace','mid',  2.0, 2.5, 3.0, 3.5, 4.0, 60),
  ('6.1','marketplace','growth',3.0, 3.5, 4.0, 4.5, 5.0, 45),
  ('6.1','fintech','early', 1.0, 1.5, 2.0, 2.5, 3.0, 25),
  ('6.1','fintech','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 55),
  ('6.1','fintech','growth',3.0, 3.5, 4.0, 4.5, 5.0, 40),
  ('6.1','consumer','early',1.0, 1.5, 2.0, 2.5, 3.0, 40),
  ('6.1','consumer','mid',  2.0, 2.5, 3.0, 3.5, 4.0, 70),
  ('6.1','consumer','growth',2.5, 3.0, 3.5, 4.0, 4.5, 50),
  ('6.1','ai_ml','early', 1.0, 1.5, 2.0, 3.0, 3.5, 35),
  ('6.1','ai_ml','mid',   2.0, 2.5, 3.0, 3.5, 4.5, 65),
  ('6.1','ai_ml','growth',3.0, 3.5, 4.0, 4.5, 5.0, 40),

-- ── 6.2 Burn Efficiency ───────────────────────────────────────────────────────
  ('6.2','b2b_saas','early', 1.0, 1.5, 2.0, 2.5, 3.0, 50),
  ('6.2','b2b_saas','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 120),
  ('6.2','b2b_saas','growth',2.5, 3.0, 3.5, 4.0, 4.5, 80),
  ('6.2','marketplace','early',1.0, 1.5, 2.0, 2.5, 3.0, 30),
  ('6.2','marketplace','mid',  1.5, 2.0, 2.5, 3.0, 3.5, 60),
  ('6.2','marketplace','growth',2.0, 2.5, 3.0, 3.5, 4.0, 45),
  ('6.2','fintech','early', 1.0, 1.5, 2.0, 2.5, 3.0, 25),
  ('6.2','fintech','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 55),
  ('6.2','fintech','growth',2.5, 3.0, 3.5, 4.0, 4.5, 40),
  ('6.2','consumer','early',1.0, 1.0, 1.5, 2.0, 2.5, 40),
  ('6.2','consumer','mid',  1.5, 2.0, 2.5, 3.0, 3.5, 70),
  ('6.2','consumer','growth',2.0, 2.5, 3.0, 3.5, 4.0, 50),
  ('6.2','ai_ml','early', 1.0, 1.5, 2.0, 2.5, 3.0, 35),
  ('6.2','ai_ml','mid',   1.5, 2.0, 2.5, 3.0, 3.5, 65),
  ('6.2','ai_ml','growth',2.0, 2.5, 3.0, 3.5, 4.0, 40),

-- ── 6.3 Runway ────────────────────────────────────────────────────────────────
  ('6.3','b2b_saas','early', 1.5, 2.0, 2.5, 3.0, 3.5, 50),
  ('6.3','b2b_saas','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 120),
  ('6.3','b2b_saas','growth',2.5, 3.0, 3.5, 4.0, 4.5, 80),
  ('6.3','marketplace','early',1.5, 2.0, 2.5, 3.0, 3.5, 30),
  ('6.3','marketplace','mid',  2.0, 2.5, 3.0, 3.5, 4.0, 60),
  ('6.3','marketplace','growth',2.5, 3.0, 3.5, 4.0, 4.5, 45),
  ('6.3','fintech','early', 1.5, 2.0, 2.5, 3.0, 3.5, 25),
  ('6.3','fintech','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 55),
  ('6.3','fintech','growth',2.5, 3.0, 3.5, 4.0, 4.5, 40),
  ('6.3','consumer','early',1.0, 1.5, 2.0, 2.5, 3.0, 40),
  ('6.3','consumer','mid',  1.5, 2.0, 2.5, 3.0, 3.5, 70),
  ('6.3','consumer','growth',2.0, 2.5, 3.0, 3.5, 4.0, 50),
  ('6.3','ai_ml','early', 1.5, 2.0, 2.5, 3.0, 3.5, 35),
  ('6.3','ai_ml','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 65),
  ('6.3','ai_ml','growth',2.5, 3.0, 3.5, 4.0, 4.5, 40),

-- ── 6.4 Unit Economics ────────────────────────────────────────────────────────
  ('6.4','b2b_saas','early', 1.5, 2.0, 2.5, 3.0, 3.5, 50),
  ('6.4','b2b_saas','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 120),
  ('6.4','b2b_saas','growth',2.5, 3.0, 3.5, 4.0, 4.5, 80),
  ('6.4','marketplace','early',1.0, 1.5, 2.0, 2.5, 3.0, 30),
  ('6.4','marketplace','mid',  1.5, 2.0, 2.5, 3.0, 3.5, 60),
  ('6.4','marketplace','growth',2.0, 2.5, 3.0, 3.5, 4.0, 45),
  ('6.4','fintech','early', 1.5, 2.0, 2.5, 3.0, 3.5, 25),
  ('6.4','fintech','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 55),
  ('6.4','fintech','growth',2.5, 3.0, 3.5, 4.0, 4.5, 40),
  ('6.4','consumer','early',1.0, 1.5, 2.0, 2.5, 3.0, 40),
  ('6.4','consumer','mid',  1.5, 2.0, 2.5, 3.0, 3.5, 70),
  ('6.4','consumer','growth',2.0, 2.5, 3.0, 3.5, 4.0, 50),
  ('6.4','ai_ml','early', 1.5, 2.0, 2.5, 3.0, 3.5, 35),
  ('6.4','ai_ml','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 65),
  ('6.4','ai_ml','growth',2.5, 3.0, 3.5, 4.0, 4.5, 40),

-- ── 1.2 Willingness to Pay ────────────────────────────────────────────────────
  ('1.2','b2b_saas','early', 1.0, 1.5, 2.0, 2.5, 3.0, 50),
  ('1.2','b2b_saas','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 120),
  ('1.2','b2b_saas','growth',3.0, 3.5, 4.0, 4.5, 5.0, 80),
  ('1.2','marketplace','early',1.0, 1.5, 2.0, 2.5, 3.0, 30),
  ('1.2','marketplace','mid',  1.5, 2.0, 2.5, 3.0, 3.5, 60),
  ('1.2','marketplace','growth',2.5, 3.0, 3.5, 4.0, 4.5, 45),
  ('1.2','fintech','early', 1.0, 1.5, 2.5, 3.0, 3.5, 25),
  ('1.2','fintech','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 55),
  ('1.2','fintech','growth',3.0, 3.5, 4.0, 4.5, 5.0, 40),
  ('1.2','consumer','early',1.0, 1.5, 2.0, 2.5, 3.0, 40),
  ('1.2','consumer','mid',  1.5, 2.0, 2.5, 3.0, 3.5, 70),
  ('1.2','consumer','growth',2.0, 2.5, 3.0, 3.5, 4.0, 50),
  ('1.2','ai_ml','early', 1.0, 1.5, 2.0, 3.0, 3.5, 35),
  ('1.2','ai_ml','mid',   2.0, 2.5, 3.0, 3.5, 4.0, 65),
  ('1.2','ai_ml','growth',3.0, 3.5, 4.0, 4.5, 5.0, 40)

ON CONFLICT (indicator_id, sector, stage) DO UPDATE SET
  p10 = EXCLUDED.p10, p25 = EXCLUDED.p25, p50 = EXCLUDED.p50,
  p75 = EXCLUDED.p75, p90 = EXCLUDED.p90,
  sample_size = EXCLUDED.sample_size,
  last_updated = NOW();

-- ============================================================
-- SOURCE: 20260327000004_qscore_reconciliation_log.sql
-- ============================================================

-- ============================================================================
-- Edge Alpha IQ Score v2 — Migration 4: qscore_reconciliation_log table
-- Observability: per-submission AI reconciliation audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS qscore_reconciliation_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_id         TEXT NOT NULL,
  founder_value        JSONB,
  ai_estimate          JSONB,
  deviation            NUMERIC,
  anomaly_severity     TEXT,   -- 'none' | 'low' | 'high' | 'extreme'
  confidence_adjustment NUMERIC,
  vc_alert             TEXT,
  applied              BOOLEAN NOT NULL DEFAULT false,
  error                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reconciliation_log_user_idx
  ON qscore_reconciliation_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reconciliation_log_indicator_idx
  ON qscore_reconciliation_log(indicator_id, created_at DESC);

ALTER TABLE qscore_reconciliation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own reconciliation logs"
  ON qscore_reconciliation_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manage reconciliation logs"
  ON qscore_reconciliation_log FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SOURCE: 20260327000005_iq_score_v2_history_columns.sql
-- ============================================================

-- ============================================================================
-- Edge Alpha IQ Score v2 — Migration 5: qscore_history v2 columns
-- Adds iq_breakdown JSONB and available_iq for the new scoring system
-- Adds track column (commercial | impact) for P5 routing
-- ============================================================================

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS iq_breakdown       JSONB,
  ADD COLUMN IF NOT EXISTS available_iq       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS track              TEXT DEFAULT 'commercial',
  ADD COLUMN IF NOT EXISTS reconciliation_flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS validation_warnings  JSONB DEFAULT '[]';

-- Index for fast version-filtered queries
CREATE INDEX IF NOT EXISTS qscore_history_v2_idx
  ON qscore_history(user_id, score_version, calculated_at DESC)
  WHERE score_version = 'v2_iq';
