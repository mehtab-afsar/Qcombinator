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
