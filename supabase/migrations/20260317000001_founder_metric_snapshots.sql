-- founder_metric_snapshots
-- Stores raw metric values + dimension scores after every Q-Score calculation.
-- Used by the cohort scorer to compute percentile ranks without hardcoded thresholds.
-- Cohort scoring activates automatically once MIN_COHORT_SIZE (30) rows exist.

CREATE TABLE IF NOT EXISTS founder_metric_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  qscore_history_id   uuid REFERENCES qscore_history(id) ON DELETE SET NULL,
  sector              text NOT NULL DEFAULT 'default',

  -- Raw numeric metric values extracted from assessment
  -- Stored as JSONB for schema flexibility — add new metrics without migrations
  metrics             jsonb NOT NULL DEFAULT '{}',
  -- Example:
  -- {
  --   "tam": 5000000,
  --   "conversion_rate": 2.5,
  --   "activity_rate": 15.0,
  --   "ltv_cac_ratio": 4.2,
  --   "gross_margin_pct": 68.0,
  --   "arr": 120000,
  --   "runway_months": 14,
  --   "projected_growth_pct": 150,
  --   "channels_tried": 3,
  --   "channel_results": 2,
  --   "cac_ratio": 0.8,
  --   "conversation_count": 25,
  --   "build_time_days": 14
  -- }

  -- Computed dimension scores (0–100) from this assessment
  -- Used directly for cohort percentile calculation — no need to recompute
  dimension_scores    jsonb NOT NULL DEFAULT '{}',
  -- Example:
  -- {
  --   "market": 72,
  --   "product": 65,
  --   "goToMarket": 58,
  --   "financial": 81,
  --   "team": 70,
  --   "traction": 44
  -- }

  overall_score       numeric(5,2),
  calculated_at       timestamptz DEFAULT now()
);

-- Indexes for cohort queries
CREATE INDEX idx_fms_sector          ON founder_metric_snapshots(sector);
CREATE INDEX idx_fms_calculated_at   ON founder_metric_snapshots(calculated_at DESC);
CREATE INDEX idx_fms_user_id         ON founder_metric_snapshots(user_id);
-- GIN index for JSONB metric lookups (e.g. where metrics->>'arr' is not null)
CREATE INDEX idx_fms_metrics         ON founder_metric_snapshots USING GIN(metrics);
CREATE INDEX idx_fms_dimension_scores ON founder_metric_snapshots USING GIN(dimension_scores);

-- RLS: founders can only read their own snapshots
ALTER TABLE founder_metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own metric snapshots"
  ON founder_metric_snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used in API routes) can insert/read all
CREATE POLICY "Service role full access"
  ON founder_metric_snapshots FOR ALL
  USING (true)
  WITH CHECK (true);
