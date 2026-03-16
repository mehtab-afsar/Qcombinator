-- ─────────────────────────────────────────────────────────────────────────────
-- Q-Score Dynamic Thresholds
--
-- Replaces hardcoded if/else chains in dimension calculators with DB-driven
-- tier configurations. Changing a threshold = UPDATE row, no code deploy.
--
-- Architecture:
--   qscore_thresholds      — tiered point allocations per numeric metric
--   qscore_dimension_weights — per-sector dimension weights (replaces PRD_WEIGHTS)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Threshold tiers ─────────────────────────────────────────────────────────
-- Each row is one tier in a metric's point table.
-- Scoring: iterate tiers by tier_rank ASC, award points from first matching tier
-- (min_value <= value AND (max_value IS NULL OR value <= max_value))
-- A tier with min_value=NULL and max_value=NULL is a catch-all fallback.

CREATE TABLE IF NOT EXISTS qscore_thresholds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension   text NOT NULL,       -- 'market', 'financial', 'traction', 'gtm', 'product', 'team'
  metric      text NOT NULL,       -- 'tam', 'arr', 'runway_months', etc.
  tier_rank   int  NOT NULL,       -- 1 = first checked (highest priority / best case)
  min_value   numeric,             -- value >= min_value qualifies (NULL = no lower bound)
  max_value   numeric,             -- value <= max_value qualifies (NULL = no upper bound)
  points      int  NOT NULL,       -- points awarded when this tier matches
  max_points  int  NOT NULL,       -- max possible for this metric (informational, for UI)
  label       text NOT NULL,       -- human description e.g. "$1M+ ARR"
  is_active   boolean DEFAULT true,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (dimension, metric, tier_rank)
);

-- ─── Dimension weights ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qscore_dimension_weights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector      text NOT NULL DEFAULT 'default',  -- 'default', 'saas_b2b', 'deeptech', etc.
  dimension   text NOT NULL,                    -- 'market', 'product', etc.
  weight      numeric NOT NULL,                 -- 0–1, must sum to 1.0 per sector
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (sector, dimension)
);

-- RLS: public read (config data), service role manages
ALTER TABLE qscore_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE qscore_dimension_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read qscore_thresholds" ON qscore_thresholds FOR SELECT USING (true);
CREATE POLICY "Public read qscore_dimension_weights" ON qscore_dimension_weights FOR SELECT USING (true);
CREATE POLICY "Service manages qscore_thresholds" ON qscore_thresholds FOR ALL TO service_role USING (true);
CREATE POLICY "Service manages qscore_dimension_weights" ON qscore_dimension_weights FOR ALL TO service_role USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: All hardcoded thresholds extracted from dimension calculators
-- Sources: OpenView SaaS 2024, Bessemer Cloud Index, NFX/a16z, YC benchmarks
-- ─────────────────────────────────────────────────────────────────────────────

-- ── MARKET dimension ─────────────────────────────────────────────────────────

-- market.tam (TAM = targetCustomers × LTV, max 40 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('market', 'tam', 1, 1000000000, NULL,       40, 40, '$1B+ TAM (venture scale)'),
  ('market', 'tam', 2, 100000000,  NULL,        35, 40, '$100M+ TAM'),
  ('market', 'tam', 3, 10000000,   NULL,        28, 40, '$10M+ TAM'),
  ('market', 'tam', 4, 1000000,    NULL,        20, 40, '$1M+ TAM'),
  ('market', 'tam', 5, NULL,       NULL,        10, 40, 'Under $1M TAM (niche)');

-- market.conversion_rate (%, range checks, max 30 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('market', 'conversion_rate', 1, 0.5,  5,    30, 30, 'Realistic range (0.5–5%)'),
  ('market', 'conversion_rate', 2, 0.1,  10,   20, 30, 'Somewhat realistic (0.1–10%)'),
  ('market', 'conversion_rate', 3, NULL, 0.5,  10, 30, 'Too conservative (<0.5%)'),
  ('market', 'conversion_rate', 4, 10,   NULL,  5, 30, 'Unrealistic (>10%)');

-- market.activity_rate (daily active ÷ total customers %, range, max 20 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('market', 'activity_rate', 1, 10, 50,   20, 20, 'Realistic engagement (10–50%)'),
  ('market', 'activity_rate', 2, 5,  70,   15, 20, 'Somewhat realistic (5–70%)'),
  ('market', 'activity_rate', 3, NULL, NULL, 5, 20, 'Unrealistic assumptions');

-- market.ltv_cac_ratio (max 10 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('market', 'ltv_cac_ratio', 1, 3,    NULL, 10, 10, 'Excellent LTV:CAC (≥3:1)'),
  ('market', 'ltv_cac_ratio', 2, 2,    NULL,  7, 10, 'Good LTV:CAC (2:1)'),
  ('market', 'ltv_cac_ratio', 3, 1,    NULL,  4, 10, 'Breakeven (1:1)'),
  ('market', 'ltv_cac_ratio', 4, NULL, NULL,  0, 10, 'Negative unit economics');

-- ── FINANCIAL dimension ───────────────────────────────────────────────────────

-- financial.gross_margin_pct (%, max 20 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('financial', 'gross_margin_pct', 1, 80, NULL, 20, 20, 'Excellent margin (≥80%)'),
  ('financial', 'gross_margin_pct', 2, 70, NULL, 17, 20, 'Great margin (70–80%)'),
  ('financial', 'gross_margin_pct', 3, 60, NULL, 14, 20, 'Good margin (60–70%)'),
  ('financial', 'gross_margin_pct', 4, 50, NULL, 10, 20, 'Acceptable margin (50–60%)'),
  ('financial', 'gross_margin_pct', 5, 40, NULL,  6, 20, 'Low margin (40–50%)'),
  ('financial', 'gross_margin_pct', 6, NULL, NULL, 2, 20, 'Poor margin (<40%)');

-- financial.arr (ARR in $, max 20 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('financial', 'arr', 1, 1000000, NULL, 20, 20, '$1M+ ARR'),
  ('financial', 'arr', 2, 500000,  NULL, 17, 20, '$500K+ ARR'),
  ('financial', 'arr', 3, 100000,  NULL, 14, 20, '$100K+ ARR'),
  ('financial', 'arr', 4, 50000,   NULL, 10, 20, '$50K+ ARR'),
  ('financial', 'arr', 5, 10000,   NULL,  6, 20, '$10K+ ARR'),
  ('financial', 'arr', 6, 1,       NULL,  3, 20, 'Some revenue'),
  ('financial', 'arr', 7, NULL,    NULL,  0, 20, 'Pre-revenue');

-- financial.runway_months (months, max 30 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('financial', 'runway_months', 1, 18, NULL, 30, 30, '18+ months runway'),
  ('financial', 'runway_months', 2, 12, NULL, 25, 30, '12–18 months runway'),
  ('financial', 'runway_months', 3,  9, NULL, 20, 30, '9–12 months runway'),
  ('financial', 'runway_months', 4,  6, NULL, 15, 30, '6–9 months runway'),
  ('financial', 'runway_months', 5,  3, NULL, 10, 30, '3–6 months runway'),
  ('financial', 'runway_months', 6, NULL, NULL, 5, 30, '<3 months (critical)');

-- financial.projected_growth_pct (YoY % growth projection, range, max 15 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('financial', 'projected_growth_pct', 1, 50,  300, 15, 15, 'Realistic ambitious growth (50–300%)'),
  ('financial', 'projected_growth_pct', 2, 20,  500, 12, 15, 'Plausible range (20–500%)'),
  ('financial', 'projected_growth_pct', 3,  0, NULL,  8, 15, 'Conservative or aggressive (≥0%)'),
  ('financial', 'projected_growth_pct', 4, NULL, NULL, 3, 15, 'Declining projections');

-- ── GTM dimension ─────────────────────────────────────────────────────────────

-- gtm.channels_tried_count (count, max 15 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('gtm', 'channels_tried_count', 1, 3,    NULL, 15, 15, '3+ channels tested'),
  ('gtm', 'channels_tried_count', 2, 2,    NULL, 12, 15, '2 channels tested'),
  ('gtm', 'channels_tried_count', 3, 1,    NULL,  8, 15, '1 channel tested'),
  ('gtm', 'channels_tried_count', 4, NULL, NULL,  3, 15, 'No channels tested');

-- gtm.channel_results_count (count, max 10 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('gtm', 'channel_results_count', 1, 3,    NULL, 10, 10, '3+ channels with results'),
  ('gtm', 'channel_results_count', 2, 2,    NULL,  8, 10, '2 channels with results'),
  ('gtm', 'channel_results_count', 3, 1,    NULL,  5, 10, '1 channel with results'),
  ('gtm', 'channel_results_count', 4, NULL, NULL,  0, 10, 'No channel results tracked');

-- gtm.cac_ratio (currentCAC ÷ targetCAC, lower is better, max 10 pts)
-- Note: higher ratio = worse (over target). Tiers ordered by max_value DESC.
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('gtm', 'cac_ratio', 1, NULL, 1.0, 10, 10, 'At or below CAC target'),
  ('gtm', 'cac_ratio', 2, NULL, 1.5,  7, 10, '1–1.5× target CAC'),
  ('gtm', 'cac_ratio', 3, NULL, 2.0,  4, 10, '1.5–2× target CAC'),
  ('gtm', 'cac_ratio', 4, NULL, NULL,  2, 10, '>2× target CAC');

-- ── TRACTION dimension ────────────────────────────────────────────────────────

-- traction.conversation_count (count, max 20 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('traction', 'conversation_count', 1, 100, NULL, 20, 20, '100+ customer conversations'),
  ('traction', 'conversation_count', 2,  50, NULL, 18, 20, '50–100 conversations'),
  ('traction', 'conversation_count', 3,  30, NULL, 15, 20, '30–50 conversations'),
  ('traction', 'conversation_count', 4,  20, NULL, 12, 20, '20–30 conversations'),
  ('traction', 'conversation_count', 5,  10, NULL,  8, 20, '10–20 conversations'),
  ('traction', 'conversation_count', 6,   5, NULL,  4, 20, '5–10 conversations'),
  ('traction', 'conversation_count', 7, NULL, NULL, 0, 20, 'Fewer than 5 conversations');

-- traction.arr (ARR in $, max 30 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('traction', 'arr', 1, 1000000, NULL, 30, 30, '$1M+ ARR (Series A scale)'),
  ('traction', 'arr', 2,  500000, NULL, 28, 30, '$500K+ ARR (strong seed)'),
  ('traction', 'arr', 3,  250000, NULL, 25, 30, '$250K+ ARR (growing seed)'),
  ('traction', 'arr', 4,  100000, NULL, 22, 30, '$100K+ ARR (early seed)'),
  ('traction', 'arr', 5,   50000, NULL, 18, 30, '$50K+ ARR (pre-seed success)'),
  ('traction', 'arr', 6,   25000, NULL, 14, 30, '$25K+ ARR (initial traction)'),
  ('traction', 'arr', 7,   10000, NULL, 10, 30, '$10K+ ARR (early revenue)'),
  ('traction', 'arr', 8,    5000, NULL,  6, 30, '$5K+ ARR (first revenue)'),
  ('traction', 'arr', 9,       1, NULL,  3, 30, 'Some revenue'),
  ('traction', 'arr', 10, NULL,  NULL,   0, 30, 'Pre-revenue');

-- ── PRODUCT dimension ─────────────────────────────────────────────────────────

-- product.conversation_count (count, max 20 pts)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('product', 'conversation_count', 1, 50,   NULL, 20, 20, '50+ conversations'),
  ('product', 'conversation_count', 2, 20,   NULL, 16, 20, '20–50 conversations'),
  ('product', 'conversation_count', 3, 10,   NULL, 12, 20, '10–20 conversations'),
  ('product', 'conversation_count', 4,  5,   NULL,  8, 20, '5–10 conversations'),
  ('product', 'conversation_count', 5, NULL, NULL,  4, 20, 'Fewer than 5 conversations');

-- product.build_time_days (days to MVP, lower is better, max 10 pts)
-- Tiers ordered by max_value ASC (smallest = best)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('product', 'build_time_days', 1, NULL,  7,  10, 10, '≤7 days to MVP (extreme velocity)'),
  ('product', 'build_time_days', 2, NULL, 14,   8, 10, '≤14 days to MVP'),
  ('product', 'build_time_days', 3, NULL, 30,   6, 10, '≤30 days to MVP'),
  ('product', 'build_time_days', 4, NULL, 60,   4, 10, '≤60 days to MVP'),
  ('product', 'build_time_days', 5, NULL, NULL, 2, 10, '>60 days to MVP');

-- ── TEAM dimension ────────────────────────────────────────────────────────────

-- team.build_time_days (days, lower is better, max 12 pts when combined with iteration)
INSERT INTO qscore_thresholds (dimension, metric, tier_rank, min_value, max_value, points, max_points, label) VALUES
  ('team', 'build_time_days', 1, NULL,  7,  12, 12, '≤7 days (rapid iteration)'),
  ('team', 'build_time_days', 2, NULL, 14,  10, 12, '≤14 days'),
  ('team', 'build_time_days', 3, NULL, 30,   8, 12, '≤30 days'),
  ('team', 'build_time_days', 4, NULL, 60,   5, 12, '≤60 days'),
  ('team', 'build_time_days', 5, NULL, NULL, 3, 12, '>60 days');

-- ── DIMENSION WEIGHTS ─────────────────────────────────────────────────────────

-- Default sector weights (matches current PRD_WEIGHTS)
INSERT INTO qscore_dimension_weights (sector, dimension, weight) VALUES
  ('default',    'market',     0.20),
  ('default',    'product',    0.18),
  ('default',    'goToMarket', 0.17),
  ('default',    'financial',  0.18),
  ('default',    'team',       0.15),
  ('default',    'traction',   0.12),

  -- SaaS B2B: revenue + GTM more important
  ('saas_b2b',   'market',     0.20),
  ('saas_b2b',   'product',    0.15),
  ('saas_b2b',   'goToMarket', 0.22),
  ('saas_b2b',   'financial',  0.20),
  ('saas_b2b',   'team',       0.12),
  ('saas_b2b',   'traction',   0.11),

  -- Deep Tech: product + team IP more important, traction less expected
  ('deeptech',   'market',     0.18),
  ('deeptech',   'product',    0.25),
  ('deeptech',   'goToMarket', 0.10),
  ('deeptech',   'financial',  0.15),
  ('deeptech',   'team',       0.22),
  ('deeptech',   'traction',   0.10),

  -- Consumer: traction + market size more important
  ('consumer',   'market',     0.22),
  ('consumer',   'product',    0.18),
  ('consumer',   'goToMarket', 0.18),
  ('consumer',   'financial',  0.15),
  ('consumer',   'team',       0.12),
  ('consumer',   'traction',   0.15),

  -- Healthtech: team credentials + product validation
  ('healthtech', 'market',     0.18),
  ('healthtech', 'product',    0.22),
  ('healthtech', 'goToMarket', 0.12),
  ('healthtech', 'financial',  0.15),
  ('healthtech', 'team',       0.23),
  ('healthtech', 'traction',   0.10),

  -- Fintech: financial + traction + regulatory (GTM) more important
  ('fintech',    'market',     0.18),
  ('fintech',    'product',    0.17),
  ('fintech',    'goToMarket', 0.18),
  ('fintech',    'financial',  0.22),
  ('fintech',    'team',       0.15),
  ('fintech',    'traction',   0.10),

  -- Climatetech: product mechanism + market potential
  ('climatetech','market',     0.20),
  ('climatetech','product',    0.22),
  ('climatetech','goToMarket', 0.13),
  ('climatetech','financial',  0.15),
  ('climatetech','team',       0.18),
  ('climatetech','traction',   0.12),

  -- Edtech: product + traction (retention) most important
  ('edtech',     'market',     0.18),
  ('edtech',     'product',    0.22),
  ('edtech',     'goToMarket', 0.15),
  ('edtech',     'financial',  0.15),
  ('edtech',     'team',       0.15),
  ('edtech',     'traction',   0.15);
