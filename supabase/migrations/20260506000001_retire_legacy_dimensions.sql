-- Retire legacy 6-dimension columns, replace with proper P1-P6 parameters
-- P1=Market Readiness, P2=Market Potential, P3=IP & Defensibility,
-- P4=Founder & Team, P5=Structural Impact, P6=Financials

-- Step 1: Add P1-P6 score columns
ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS p1_score INTEGER CHECK (p1_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS p2_score INTEGER CHECK (p2_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS p3_score INTEGER CHECK (p3_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS p4_score INTEGER CHECK (p4_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS p5_score INTEGER CHECK (p5_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS p6_score INTEGER CHECK (p6_score BETWEEN 0 AND 100);

-- Step 2: Backfill P1-P6 from iq_breakdown JSON for rows that have it
UPDATE qscore_history
SET
  p1_score = ROUND((COALESCE((iq_breakdown->'parameters'->0->>'averageScore')::numeric, 0) * 20)),
  p2_score = ROUND((COALESCE((iq_breakdown->'parameters'->1->>'averageScore')::numeric, 0) * 20)),
  p3_score = ROUND((COALESCE((iq_breakdown->'parameters'->2->>'averageScore')::numeric, 0) * 20)),
  p4_score = ROUND((COALESCE((iq_breakdown->'parameters'->3->>'averageScore')::numeric, 0) * 20)),
  p5_score = ROUND((COALESCE((iq_breakdown->'parameters'->4->>'averageScore')::numeric, 0) * 20)),
  p6_score = ROUND((COALESCE((iq_breakdown->'parameters'->5->>'averageScore')::numeric, 0) * 20))
WHERE iq_breakdown IS NOT NULL
  AND jsonb_typeof(iq_breakdown->'parameters') = 'array'
  AND jsonb_array_length(iq_breakdown->'parameters') >= 6;

-- Step 3: Drop legacy columns
ALTER TABLE qscore_history
  DROP COLUMN IF EXISTS market_score,
  DROP COLUMN IF EXISTS product_score,
  DROP COLUMN IF EXISTS gtm_score,
  DROP COLUMN IF EXISTS financial_score,
  DROP COLUMN IF EXISTS team_score,
  DROP COLUMN IF EXISTS traction_score;

-- Step 4: Recreate qscore_with_delta view with P1-P6 columns
CREATE OR REPLACE VIEW qscore_with_delta AS
SELECT
  cur.id,
  cur.user_id,
  cur.assessment_id,
  cur.previous_score_id,
  cur.overall_score,
  cur.percentile,
  cur.grade,
  cur.p1_score,
  cur.p2_score,
  cur.p3_score,
  cur.p4_score,
  cur.p5_score,
  cur.p6_score,
  cur.calculated_at,

  -- Overall change
  cur.overall_score - COALESCE(prev.overall_score, cur.overall_score) AS overall_change,

  -- Parameter changes
  cur.p1_score - COALESCE(prev.p1_score, cur.p1_score) AS p1_change,
  cur.p2_score - COALESCE(prev.p2_score, cur.p2_score) AS p2_change,
  cur.p3_score - COALESCE(prev.p3_score, cur.p3_score) AS p3_change,
  cur.p4_score - COALESCE(prev.p4_score, cur.p4_score) AS p4_change,
  cur.p5_score - COALESCE(prev.p5_score, cur.p5_score) AS p5_change,
  cur.p6_score - COALESCE(prev.p6_score, cur.p6_score) AS p6_change

FROM qscore_history cur
LEFT JOIN qscore_history prev ON cur.previous_score_id = prev.id;
