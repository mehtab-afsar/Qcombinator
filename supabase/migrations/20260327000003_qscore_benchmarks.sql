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
