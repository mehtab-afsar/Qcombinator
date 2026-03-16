-- ============================================================================
-- Edge Alpha IQ — Dynamic Scoring Engine
-- 25-indicator investment-readiness matrix, fully DB-driven
-- ============================================================================

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- 25 indicator definitions (config-driven — change thresholds without code deploy)
CREATE TABLE IF NOT EXISTS iq_indicators (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE NOT NULL,      -- '1.1', '2.3', etc.
  parameter_id     int NOT NULL,              -- 1–5
  name             text NOT NULL,
  description      text NOT NULL,
  data_field       text NOT NULL,             -- maps to AssessmentData field or artifact field
  score_1_max      numeric,                   -- raw value ≤ this → score 1
  score_3_max      numeric,                   -- raw value ≤ this → score 3
  score_5_min      numeric,                   -- raw value ≥ this → score 5
  higher_is_better boolean DEFAULT true,
  ai_reconciled    boolean DEFAULT false,
  is_active        boolean DEFAULT true,
  unit             text,                      -- '%', '$', 'months', 'count', 'ratio'
  benchmark_source text,                      -- citation for threshold values
  notes            text,
  updated_at       timestamptz DEFAULT now()
);

-- Parameter weights per sector
CREATE TABLE IF NOT EXISTS iq_parameter_weights (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector       text NOT NULL,
  parameter_id int NOT NULL,
  weight       numeric NOT NULL CHECK (weight >= 0 AND weight <= 1),
  UNIQUE(sector, parameter_id)
);

-- IQ score per founder (one row per calculation run)
CREATE TABLE IF NOT EXISTS iq_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score       numeric(5,2) NOT NULL,   -- 0–5 effective weighted average
  normalized_score    int NOT NULL,            -- 0–100 for display
  grade               text,
  parameter_scores    jsonb NOT NULL DEFAULT '{}',  -- { "p1": 3.2, "p2": 4.1, ... }
  indicators_used     int NOT NULL DEFAULT 0,
  indicators_excluded int NOT NULL DEFAULT 0,
  scoring_method      text NOT NULL DEFAULT 'partial', -- 'full' | 'partial' | 'estimated'
  sector              text,
  calculated_at       timestamptz DEFAULT now(),
  previous_score_id   uuid REFERENCES iq_scores(id)
);

-- Per-indicator breakdown with full audit trail
CREATE TABLE IF NOT EXISTS iq_indicator_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iq_score_id         uuid REFERENCES iq_scores(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_code      text NOT NULL,
  raw_score           numeric(3,1),             -- 1–5 before confidence
  confidence          numeric(4,3),             -- 0.0–1.0
  effective_score     numeric(5,3),             -- raw_score × confidence
  data_source         text NOT NULL,
  raw_value           numeric,
  reasoning           text,
  evidence_citations  jsonb DEFAULT '[]',
  consistency_flags   jsonb DEFAULT '[]',
  calculated_at       timestamptz DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS iq_scores_user_idx ON iq_scores(user_id);
CREATE INDEX IF NOT EXISTS iq_scores_calculated_idx ON iq_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS iq_indicator_scores_score_idx ON iq_indicator_scores(iq_score_id);
CREATE INDEX IF NOT EXISTS iq_indicator_scores_user_idx ON iq_indicator_scores(user_id);
CREATE INDEX IF NOT EXISTS iq_indicators_parameter_idx ON iq_indicators(parameter_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE iq_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE iq_indicator_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE iq_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE iq_parameter_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own IQ scores"
  ON iq_scores FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own indicator scores"
  ON iq_indicator_scores FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public read indicator config"
  ON iq_indicators FOR SELECT USING (true);

CREATE POLICY "Public read parameter weights"
  ON iq_parameter_weights FOR SELECT USING (true);

-- Service role can update indicator config (admin)
CREATE POLICY "Service role manage indicators"
  ON iq_indicators FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manage weights"
  ON iq_parameter_weights FOR ALL USING (auth.role() = 'service_role');

-- ─── Seed: 25 Indicators ─────────────────────────────────────────────────────
-- Thresholds sourced from: OpenView SaaS Benchmarks 2024, Bessemer Cloud Index 2024,
-- SaaS Capital 2024, NFX Marketplace Report, a16z Fintech Data, CB Insights Deeptech,
-- Carta Retention Data 2023

INSERT INTO iq_indicators (code, parameter_id, name, description, data_field, score_1_max, score_3_max, score_5_min, higher_is_better, ai_reconciled, unit, benchmark_source, notes) VALUES

-- ── Parameter 1: Market Readiness ─────────────────────────────────────────
('1.1', 1, 'Revenue Intensity',
 'Annual revenue relative to company age (ARR ÷ years since founding)',
 'financial.arr / company_age_years',
 10000, 200000, 500000, true, false, '$/year',
 'OpenView SaaS Benchmarks 2024',
 'Score 1: <$10K/yr | Score 3: $50K–200K/yr | Score 5: >$500K/yr. Use ARR from Felix artifact if available, else MRR×12.'),

('1.2', 1, 'Revenue Growth Velocity',
 'Period-over-period revenue growth rate (YoY %)',
 'financial.arr_growth_pct',
 0, 100, 200, true, false, '%',
 'Bessemer Cloud Index 2024',
 'Score 1: negative/0% | Score 3: 20–100% YoY | Score 5: >200% YoY. Requires 2 data points.'),

('1.3', 1, 'Revenue Quality Ratio',
 'Recurring revenue share (MRR ÷ total revenue)',
 'financial.mrr_ratio',
 0.20, 0.70, 0.85, true, false, 'ratio',
 'SaaS Capital Annual SaaS Survey 2024',
 'Score 1: <20% recurring | Score 3: 40–70% | Score 5: >85%.'),

('1.4', 1, 'Customer Concentration',
 'Revenue dependency on largest client (top client % of total revenue)',
 'financial.top_client_revenue_pct',
 0.80, 0.40, 0.15, false, false, 'ratio',
 'Bessemer Cloud Index — customer concentration thresholds',
 'LOWER is better. Score 1: >80% in one client | Score 3: 30–40% | Score 5: <15%.'),

('1.5', 1, 'Paying Customer Density',
 'Paying customers relative to company age (customers ÷ years)',
 'financial.paying_customers / company_age_years',
 5, 50, 200, true, false, 'customers/year',
 'OpenView PLG Benchmarks 2024',
 'Score 1: <5 customers/yr | Score 3: 20–50/yr | Score 5: >200/yr.'),

-- ── Parameter 2: Market Potential ─────────────────────────────────────────
('2.1', 2, 'Serviceable Market Size (SAM)',
 'Realistic addressable market (AI reconciled against web data)',
 'market.sam_usd',
 5000000, 500000000, 5000000000, true, true, '$',
 'Bessemer / a16z market sizing frameworks',
 'AI RECONCILED — Tavily market size search injected. Score 1: <$5M SAM | Score 3: $50M–500M | Score 5: >$5B.'),

('2.2', 2, 'Gross Margin Potential',
 'Structural margin capability (gross margin %)',
 'financial.gross_margin_pct',
 0.30, 0.60, 0.80, true, false, '%',
 'OpenView SaaS Benchmarks 2024',
 'Score 1: <30% | Score 3: 50–70% | Score 5: >80%. High-margin SaaS targets 80%+.'),

('2.3', 2, 'LTV / CAC Ratio',
 'Customer profitability efficiency (lifetime value ÷ acquisition cost)',
 'financial.ltv_cac_ratio',
 1.0, 3.5, 5.0, true, false, 'ratio',
 'NFX/a16z standard — LTV:CAC benchmarks by stage',
 'Score 1: <1:1 (losing money) | Score 3: 2–4:1 | Score 5: >5:1. Pre-seed minimum is 3:1.'),

('2.4', 2, 'Operating Leverage Ratio',
 'Revenue growth vs cost growth (revenue_growth_pct / opex_growth_pct)',
 'financial.operating_leverage',
 0.80, 1.50, 2.50, true, false, 'ratio',
 'Bessemer Cloud Index — operating leverage benchmarks',
 'Score 1: costs grow faster than revenue (<0.8) | Score 3: balanced (1.2–1.5) | Score 5: strong leverage (>2.5).'),

('2.5', 2, 'Competitive Density',
 'Direct competition intensity (AI cross-checked against web data)',
 'competitive.competitor_count',
 20, 8, 2, false, true, 'count',
 'Internal competitive intelligence framework',
 'AI RECONCILED — Atlas artifact + Tavily. LOWER is better for saturated markets. Score 1: >20 direct competitors | Score 3: 5–10 | Score 5: <3 with structural differentiation.'),

-- ── Parameter 3: IP / Defensibility ───────────────────────────────────────
('3.1', 3, 'Registered IP Strength',
 'Granted + weighted filed patents (granted=1pt, filed=0.5pt)',
 'ip.weighted_patent_score',
 0, 2, 5, true, false, 'score',
 'USPTO / EPO filing data norms',
 'Score 1: 0 IP | Score 3: 1–2 filed | Score 5: 3+ granted or 5+ filed. Self-reported until patent API integrated.'),

('3.2', 3, 'R&D Intensity',
 'R&D spend relative to total expenses (R&D ÷ opex %)',
 'financial.rd_intensity_pct',
 0.05, 0.20, 0.40, true, false, '%',
 'CB Insights DeepTech Benchmarks 2024',
 'Score 1: <5% | Score 3: 15–25% | Score 5: >40%. Deeptech/biotech targets 40%+.'),

('3.3', 3, 'Technical Team Density',
 'Engineers as % of total headcount',
 'team.engineering_pct',
 0.10, 0.40, 0.70, true, false, '%',
 'First Round / Carta team composition benchmarks',
 'Score 1: <10% technical (ops-heavy) | Score 3: 30–50% | Score 5: >70% engineering-led.'),

('3.4', 3, 'Core Technology Development Time',
 'Months to build working MVP (proxy for technical depth)',
 'assessment.buildTime',
 1, 6, 18, true, false, 'months',
 'Internal — build time as moat signal',
 'Score 1: <1 month (template/no-code) | Score 3: 3–9 months | Score 5: >18 months (hard tech). Longer = harder to replicate.'),

('3.5', 3, 'Replication Cost',
 'Capital required to rebuild product from scratch (AI reconciled)',
 'derived.replication_cost_usd',
 50000, 500000, 5000000, true, true, '$',
 'Internal framework — team size × dev time × burn rate',
 'AI RECONCILED — injects product description + team + R&D. Score 1: <$50K | Score 3: $200K–500K | Score 5: >$5M.'),

-- ── Parameter 4: Founder / Team ────────────────────────────────────────────
('4.1', 4, 'Founder Domain Depth',
 'Years immersed in core problem space before founding',
 'assessment.founder_domain_years',
 1, 5, 10, true, false, 'years',
 'First Round Capital founder-market fit research',
 'Score 1: <1 year | Score 3: 3–7 years | Score 5: >10 years or lived the problem personally.'),

('4.2', 4, 'Founder–Market Alignment',
 'Structured checklist: 5 alignment signals (0–5 count)',
 'assessment.founder_market_signals',
 1, 3, 5, true, false, 'signals',
 'YC / a16z founder-market fit frameworks',
 'Signals: (1) lived the pain, (2) domain expert, (3) industry network, (4) prior customers in this space, (5) regulatory/IP advantage. Count → score.'),

('4.3', 4, 'Prior Founding Experience',
 'Number of prior ventures (any outcome counts)',
 'assessment.prior_ventures',
 0, 1, 3, true, false, 'count',
 'Kauffman Foundation serial founder data',
 'Score 1: 0 prior | Score 3: 1 prior | Score 5: 3+ ventures. Outcome quality captured in 4.2.'),

('4.4', 4, 'Technical Leadership Presence',
 'Technical founder representation in C-suite',
 'team.has_technical_cofounder',
 0, 0.5, 1, true, false, 'binary',
 'First Round / YC team composition norms',
 'Score 1: no technical leadership | Score 3: technical advisor only | Score 5: CTO/technical co-founder.'),

('4.5', 4, 'Team Stability',
 'Employee retention rate (1 - annual churn %)',
 'team.retention_rate',
 0.50, 0.75, 0.90, true, false, 'ratio',
 'Carta State of Private Markets 2023',
 'Score 1: >50% annual churn | Score 3: 20–30% churn | Score 5: <10% churn. Requires Harper artifact or self-reported.'),

-- ── Parameter 5: Structural & Systemic Impact ──────────────────────────────
('5.1', 5, 'Carbon Intensity Reduction',
 'CO₂ reduced per unit of output (if applicable)',
 'impact.carbon_reduction_pct',
 0, 0.20, 0.50, true, false, 'ratio',
 'GHG Protocol / Science Based Targets initiative',
 'Score 1: no measurable reduction | Score 3: 10–30% reduction | Score 5: >50% vs baseline. AI sanity-checks extreme claims.'),

('5.2', 5, 'Resource Efficiency',
 'Output relative to input (efficiency ratio vs industry baseline)',
 'impact.resource_efficiency_ratio',
 0.80, 1.20, 2.0, true, false, 'ratio',
 'Ellen MacArthur Foundation circular economy benchmarks',
 'Score 1: less efficient than industry | Score 3: 10–30% better | Score 5: 2× more efficient.'),

('5.3', 5, 'SDG Breadth',
 'Number of materially impacted UN SDGs (capped at 8 for scoring)',
 'impact.sdg_count',
 0, 3, 6, true, true, 'count',
 'UN SDG Impact Standards',
 'AI RECONCILED — product description → LLM classifies SDG alignment. Score 1: 0 SDGs | Score 3: 2–4 | Score 5: 5+ material SDGs. Cap at 8 to prevent over-claiming.'),

('5.4', 5, 'SDG Revenue Share',
 'Revenue directly tied to SDG-aligned activity (%)',
 'impact.sdg_revenue_pct',
 0.05, 0.40, 0.75, true, false, '%',
 'Impact Management Project standards',
 'Score 1: <5% | Score 3: 25–50% | Score 5: >75% of revenue is SDG-core.'),

('5.5', 5, 'Viksit Bharat 2047 Score',
 'Revenue aligned to India strategic sovereignty domains',
 'impact.viksit_bharat_alignment',
 1, 3, 5, true, true, 'score',
 'Government of India Viksit Bharat 2047 vision document',
 'AI RECONCILED — domains: semiconductors, defence, clean energy, food/agri, healthcare, infrastructure, space, fintech. Score 1: no alignment | Score 3: partial | Score 5: core to 2+ strategic domains.')

ON CONFLICT (code) DO UPDATE SET
  name             = EXCLUDED.name,
  description      = EXCLUDED.description,
  score_1_max      = EXCLUDED.score_1_max,
  score_3_max      = EXCLUDED.score_3_max,
  score_5_min      = EXCLUDED.score_5_min,
  higher_is_better = EXCLUDED.higher_is_better,
  ai_reconciled    = EXCLUDED.ai_reconciled,
  benchmark_source = EXCLUDED.benchmark_source,
  notes            = EXCLUDED.notes,
  updated_at       = now();

-- ─── Seed: Parameter Weights per Sector ──────────────────────────────────────
-- 8 sectors × 5 parameters = 40 rows
-- Weights sum to 1.0 per sector

INSERT INTO iq_parameter_weights (sector, parameter_id, weight) VALUES
-- saas_b2b: revenue metrics + market potential matter most
('saas_b2b', 1, 0.30), ('saas_b2b', 2, 0.25), ('saas_b2b', 3, 0.15), ('saas_b2b', 4, 0.20), ('saas_b2b', 5, 0.10),
-- saas_b2c: growth velocity + market size + team execution
('saas_b2c', 1, 0.25), ('saas_b2c', 2, 0.30), ('saas_b2c', 3, 0.10), ('saas_b2c', 4, 0.20), ('saas_b2c', 5, 0.15),
-- marketplace: revenue quality + operating leverage critical
('marketplace', 1, 0.30), ('marketplace', 2, 0.30), ('marketplace', 3, 0.10), ('marketplace', 4, 0.20), ('marketplace', 5, 0.10),
-- biotech_deeptech: IP/defensibility + team depth dominate
('biotech_deeptech', 1, 0.15), ('biotech_deeptech', 2, 0.20), ('biotech_deeptech', 3, 0.35), ('biotech_deeptech', 4, 0.25), ('biotech_deeptech', 5, 0.05),
-- consumer: market potential + team; lower IP weight
('consumer', 1, 0.25), ('consumer', 2, 0.30), ('consumer', 3, 0.10), ('consumer', 4, 0.20), ('consumer', 5, 0.15),
-- fintech: revenue quality + margins + regulatory/IP
('fintech', 1, 0.30), ('fintech', 2, 0.25), ('fintech', 3, 0.20), ('fintech', 4, 0.20), ('fintech', 5, 0.05),
-- hardware: IP + team + financial runway critical
('hardware', 1, 0.20), ('hardware', 2, 0.20), ('hardware', 3, 0.30), ('hardware', 4, 0.25), ('hardware', 5, 0.05),
-- ecommerce: revenue intensity + operating leverage + market
('ecommerce', 1, 0.35), ('ecommerce', 2, 0.30), ('ecommerce', 3, 0.05), ('ecommerce', 4, 0.15), ('ecommerce', 5, 0.15)

ON CONFLICT (sector, parameter_id) DO UPDATE SET weight = EXCLUDED.weight;
