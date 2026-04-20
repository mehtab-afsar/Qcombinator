-- ============================================================================
-- Edge Alpha IQ Score v2 — Seed: qscore_benchmarks (launch bootstrap)
-- Covers all 30 indicators × 3 sectors × 2 stages = 180 rows
-- Sectors: b2b_saas, biotech, climate
-- Stages: early, mid
-- Values on 0–5 scale (raw indicator scores from IQ Calculator)
-- Sources: YC cohort analysis, SaaS Capital 2024, Bessemer State of the Cloud,
--          OpenView SaaS metrics, KPMG Biotech benchmarks, internal curation
-- Label as "beta" in UI until real cohort data accumulates (target: 8 weeks post-launch)
-- ============================================================================

INSERT INTO qscore_benchmarks
  (indicator_id, sector, stage, p10, p25, p50, p75, p90, sample_size)
VALUES

-- ── P1: Market Readiness ─────────────────────────────────────────────────────

-- 1.1 Early Signal (conversation count, customer validation)
  ('1.1','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('1.1','b2b_saas','mid',   2.0, 2.5, 3.0, 4.0, 5.0, 150),
  ('1.1','biotech', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 40),
  ('1.1','biotech', 'mid',   1.5, 2.0, 2.5, 3.5, 4.5, 60),
  ('1.1','climate', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 30),
  ('1.1','climate', 'mid',   1.5, 2.0, 2.5, 3.5, 4.5, 50),

-- 1.2 Willingness to Pay (already partially seeded — ON CONFLICT DO NOTHING)
  ('1.2','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('1.2','b2b_saas','mid',   2.0, 2.5, 3.5, 4.0, 5.0, 150),
  ('1.2','biotech', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 40),
  ('1.2','biotech', 'mid',   1.0, 1.5, 2.5, 3.5, 4.5, 60),
  ('1.2','climate', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 30),
  ('1.2','climate', 'mid',   1.0, 1.5, 2.5, 3.0, 4.0, 50),

-- 1.3 Speed (sales cycle, time to close)
  ('1.3','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('1.3','b2b_saas','mid',   2.0, 2.5, 3.0, 4.0, 5.0, 150),
  ('1.3','biotech', 'early', 0.5, 1.0, 1.5, 2.5, 3.5, 40),
  ('1.3','biotech', 'mid',   1.0, 1.5, 2.0, 3.0, 4.0, 60),
  ('1.3','climate', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 30),
  ('1.3','climate', 'mid',   1.5, 2.0, 2.5, 3.5, 4.5, 50),

-- 1.4 Durability (retention, churn)
  ('1.4','b2b_saas','early', 1.0, 2.0, 2.5, 3.5, 4.5, 80),
  ('1.4','b2b_saas','mid',   2.0, 2.5, 3.5, 4.0, 5.0, 150),
  ('1.4','biotech', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 40),
  ('1.4','biotech', 'mid',   1.5, 2.0, 2.5, 3.5, 4.5, 60),
  ('1.4','climate', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 30),
  ('1.4','climate', 'mid',   1.5, 2.0, 2.5, 3.5, 4.5, 50),

-- 1.5 Scale (paying customers, MRR growth)
  ('1.5','b2b_saas','early', 0.5, 1.0, 2.0, 3.0, 4.0, 80),
  ('1.5','b2b_saas','mid',   1.5, 2.5, 3.0, 4.0, 5.0, 150),
  ('1.5','biotech', 'early', 0.5, 1.0, 1.5, 2.5, 3.5, 40),
  ('1.5','biotech', 'mid',   1.0, 1.5, 2.0, 3.0, 4.0, 60),
  ('1.5','climate', 'early', 0.5, 1.0, 1.5, 2.5, 3.5, 30),
  ('1.5','climate', 'mid',   1.0, 1.5, 2.5, 3.5, 4.5, 50),

-- ── P2: Market Potential ─────────────────────────────────────────────────────

-- 2.1 Market Size (TAM)
  ('2.1','b2b_saas','early', 1.5, 2.0, 2.5, 3.5, 4.5, 80),
  ('2.1','b2b_saas','mid',   2.0, 2.5, 3.0, 4.0, 5.0, 150),
  ('2.1','biotech', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 40),
  ('2.1','biotech', 'mid',   2.0, 3.0, 3.5, 4.5, 5.0, 60),
  ('2.1','climate', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 30),
  ('2.1','climate', 'mid',   2.0, 3.0, 3.5, 4.5, 5.0, 50),

-- 2.2 Market Urgency (why now)
  ('2.2','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('2.2','b2b_saas','mid',   1.5, 2.5, 3.0, 4.0, 5.0, 150),
  ('2.2','biotech', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 40),
  ('2.2','biotech', 'mid',   1.5, 2.5, 3.0, 4.0, 5.0, 60),
  ('2.2','climate', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 30),
  ('2.2','climate', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 50),

-- 2.3 Value Pool (revenue model)
  ('2.3','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('2.3','b2b_saas','mid',   2.0, 2.5, 3.0, 4.0, 5.0, 150),
  ('2.3','biotech', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 40),
  ('2.3','biotech', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 60),
  ('2.3','climate', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 30),
  ('2.3','climate', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 50),

-- 2.4 Expansion Potential (land and expand)
  ('2.4','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('2.4','b2b_saas','mid',   2.0, 2.5, 3.0, 4.0, 5.0, 150),
  ('2.4','biotech', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 40),
  ('2.4','biotech', 'mid',   1.0, 2.0, 2.5, 3.5, 4.5, 60),
  ('2.4','climate', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 30),
  ('2.4','climate', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 50),

-- 2.5 Competitive Space (differentiation)
  ('2.5','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('2.5','b2b_saas','mid',   1.5, 2.5, 3.0, 4.0, 5.0, 150),
  ('2.5','biotech', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 40),
  ('2.5','biotech', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 60),
  ('2.5','climate', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 30),
  ('2.5','climate', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 50),

-- ── P3: IP / Defensibility ───────────────────────────────────────────────────

-- 3.1 IP Protection (patents, trade secrets)
  ('3.1','b2b_saas','early', 0.5, 1.0, 1.5, 2.5, 3.5, 80),
  ('3.1','b2b_saas','mid',   0.5, 1.0, 2.0, 3.0, 4.0, 150),
  ('3.1','biotech', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 40),
  ('3.1','biotech', 'mid',   2.5, 3.0, 3.5, 4.5, 5.0, 60),
  ('3.1','climate', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 30),
  ('3.1','climate', 'mid',   1.0, 1.5, 2.5, 3.5, 4.5, 50),

-- 3.2 Technical Depth
  ('3.2','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('3.2','b2b_saas','mid',   1.5, 2.0, 3.0, 4.0, 5.0, 150),
  ('3.2','biotech', 'early', 2.0, 2.5, 3.5, 4.5, 5.0, 40),
  ('3.2','biotech', 'mid',   2.5, 3.0, 4.0, 4.5, 5.0, 60),
  ('3.2','climate', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 30),
  ('3.2','climate', 'mid',   1.5, 2.5, 3.0, 4.0, 5.0, 50),

-- 3.3 Know-How Density (tacit knowledge)
  ('3.3','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('3.3','b2b_saas','mid',   1.5, 2.0, 3.0, 4.0, 5.0, 150),
  ('3.3','biotech', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 40),
  ('3.3','biotech', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 60),
  ('3.3','climate', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 30),
  ('3.3','climate', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 50),

-- 3.4 Build Complexity
  ('3.4','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('3.4','b2b_saas','mid',   1.5, 2.5, 3.0, 4.0, 5.0, 150),
  ('3.4','biotech', 'early', 2.0, 2.5, 3.5, 4.5, 5.0, 40),
  ('3.4','biotech', 'mid',   2.5, 3.0, 4.0, 4.5, 5.0, 60),
  ('3.4','climate', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 30),
  ('3.4','climate', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 50),

-- 3.5 Replication Barrier (time/cost to replicate)
  ('3.5','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('3.5','b2b_saas','mid',   1.5, 2.0, 3.0, 4.0, 5.0, 150),
  ('3.5','biotech', 'early', 2.0, 2.5, 3.5, 4.5, 5.0, 40),
  ('3.5','biotech', 'mid',   2.5, 3.5, 4.0, 4.5, 5.0, 60),
  ('3.5','climate', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 30),
  ('3.5','climate', 'mid',   1.5, 2.5, 3.0, 4.0, 5.0, 50),

-- ── P4: Founder / Team ───────────────────────────────────────────────────────

-- 4.1 Domain Depth (years of domain experience)
  ('4.1','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('4.1','b2b_saas','mid',   1.5, 2.5, 3.0, 4.0, 5.0, 150),
  ('4.1','biotech', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 40),
  ('4.1','biotech', 'mid',   2.0, 3.0, 3.5, 4.5, 5.0, 60),
  ('4.1','climate', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 30),
  ('4.1','climate', 'mid',   1.5, 2.5, 3.0, 4.0, 5.0, 50),

-- 4.2 Founder-Market Fit
  ('4.2','b2b_saas','early', 1.5, 2.0, 3.0, 4.0, 5.0, 80),
  ('4.2','b2b_saas','mid',   2.0, 2.5, 3.5, 4.5, 5.0, 150),
  ('4.2','biotech', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 40),
  ('4.2','biotech', 'mid',   2.0, 3.0, 3.5, 4.5, 5.0, 60),
  ('4.2','climate', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 30),
  ('4.2','climate', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 50),

-- 4.3 Founder Experience (prior exits, track record)
  ('4.3','b2b_saas','early', 0.5, 1.0, 2.0, 3.0, 4.0, 80),
  ('4.3','b2b_saas','mid',   1.0, 1.5, 2.5, 3.5, 4.5, 150),
  ('4.3','biotech', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 40),
  ('4.3','biotech', 'mid',   1.0, 2.0, 2.5, 3.5, 4.5, 60),
  ('4.3','climate', 'early', 0.5, 1.0, 1.5, 2.5, 3.5, 30),
  ('4.3','climate', 'mid',   1.0, 1.5, 2.0, 3.0, 4.0, 50),

-- 4.4 Leadership Coverage (team completeness)
  ('4.4','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('4.4','b2b_saas','mid',   1.5, 2.0, 3.0, 4.0, 5.0, 150),
  ('4.4','biotech', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 40),
  ('4.4','biotech', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 60),
  ('4.4','climate', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 30),
  ('4.4','climate', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 50),

-- 4.5 Team Cohesion (co-founders, team tenure)
  ('4.5','b2b_saas','early', 1.5, 2.0, 3.0, 4.0, 5.0, 80),
  ('4.5','b2b_saas','mid',   2.0, 2.5, 3.5, 4.5, 5.0, 150),
  ('4.5','biotech', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 40),
  ('4.5','biotech', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 60),
  ('4.5','climate', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 30),
  ('4.5','climate', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 50),

-- ── P5: Structural Impact ────────────────────────────────────────────────────

-- 5.1 Climate Leverage
  ('5.1','b2b_saas','early', 0.5, 1.0, 1.5, 2.5, 3.5, 80),
  ('5.1','b2b_saas','mid',   0.5, 1.0, 2.0, 3.0, 4.0, 150),
  ('5.1','biotech', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 40),
  ('5.1','biotech', 'mid',   1.0, 1.5, 2.5, 3.5, 4.5, 60),
  ('5.1','climate', 'early', 2.0, 2.5, 3.5, 4.5, 5.0, 30),
  ('5.1','climate', 'mid',   2.5, 3.0, 4.0, 4.5, 5.0, 50),

-- 5.2 Resource Efficiency
  ('5.2','b2b_saas','early', 1.0, 1.5, 2.5, 3.5, 4.5, 80),
  ('5.2','b2b_saas','mid',   1.5, 2.0, 3.0, 4.0, 5.0, 150),
  ('5.2','biotech', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 40),
  ('5.2','biotech', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 60),
  ('5.2','climate', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 30),
  ('5.2','climate', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 50),

-- 5.3 Development Relevance
  ('5.3','b2b_saas','early', 0.5, 1.0, 2.0, 3.0, 4.0, 80),
  ('5.3','b2b_saas','mid',   0.5, 1.5, 2.0, 3.0, 4.0, 150),
  ('5.3','biotech', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 40),
  ('5.3','biotech', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 60),
  ('5.3','climate', 'early', 2.0, 2.5, 3.5, 4.5, 5.0, 30),
  ('5.3','climate', 'mid',   2.5, 3.0, 4.0, 4.5, 5.0, 50),

-- 5.4 Business Model Alignment (impact × revenue)
  ('5.4','b2b_saas','early', 0.5, 1.0, 2.0, 3.0, 4.0, 80),
  ('5.4','b2b_saas','mid',   1.0, 1.5, 2.5, 3.5, 4.5, 150),
  ('5.4','biotech', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 40),
  ('5.4','biotech', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 60),
  ('5.4','climate', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 30),
  ('5.4','climate', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 50),

-- 5.5 Strategic Relevance (policy/regulatory alignment)
  ('5.5','b2b_saas','early', 0.5, 1.0, 1.5, 2.5, 3.5, 80),
  ('5.5','b2b_saas','mid',   0.5, 1.0, 2.0, 3.0, 4.0, 150),
  ('5.5','biotech', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 40),
  ('5.5','biotech', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 60),
  ('5.5','climate', 'early', 1.5, 2.0, 3.0, 4.0, 5.0, 30),
  ('5.5','climate', 'mid',   2.0, 2.5, 3.5, 4.5, 5.0, 50),

-- ── P6: Financials ───────────────────────────────────────────────────────────
-- 6.1–6.4 already partially seeded — use ON CONFLICT DO NOTHING

-- 6.2 Burn Efficiency (burn multiple)
  ('6.2','b2b_saas','early', 0.5, 1.0, 2.0, 3.0, 4.0, 80),
  ('6.2','b2b_saas','mid',   1.0, 1.5, 2.5, 3.5, 4.5, 150),
  ('6.2','biotech', 'early', 0.5, 1.0, 1.5, 2.5, 3.5, 40),
  ('6.2','biotech', 'mid',   0.5, 1.0, 2.0, 3.0, 4.0, 60),
  ('6.2','climate', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 30),
  ('6.2','climate', 'mid',   1.0, 1.5, 2.5, 3.5, 4.5, 50),

-- 6.3 Runway (months of runway)
  ('6.3','b2b_saas','early', 1.0, 1.5, 2.0, 3.0, 4.0, 80),
  ('6.3','b2b_saas','mid',   1.5, 2.0, 2.5, 3.5, 4.5, 150),
  ('6.3','biotech', 'early', 1.0, 1.5, 2.0, 3.0, 4.0, 40),
  ('6.3','biotech', 'mid',   1.5, 2.0, 2.5, 3.5, 4.5, 60),
  ('6.3','climate', 'early', 1.0, 1.5, 2.0, 3.0, 4.0, 30),
  ('6.3','climate', 'mid',   1.5, 2.0, 2.5, 3.5, 4.5, 50),

-- 6.4 Unit Economics (LTV:CAC)
  ('6.4','b2b_saas','early', 0.5, 1.0, 2.0, 3.0, 4.0, 80),
  ('6.4','b2b_saas','mid',   1.0, 2.0, 2.5, 3.5, 4.5, 150),
  ('6.4','biotech', 'early', 0.5, 1.0, 1.5, 2.5, 3.5, 40),
  ('6.4','biotech', 'mid',   0.5, 1.0, 2.0, 3.0, 4.0, 60),
  ('6.4','climate', 'early', 0.5, 1.0, 1.5, 2.5, 3.5, 30),
  ('6.4','climate', 'mid',   1.0, 1.5, 2.0, 3.0, 4.0, 50),

-- 6.5 Gross Margin
  ('6.5','b2b_saas','early', 1.5, 2.0, 3.0, 4.0, 5.0, 80),
  ('6.5','b2b_saas','mid',   2.0, 2.5, 3.5, 4.5, 5.0, 150),
  ('6.5','biotech', 'early', 0.5, 1.0, 2.0, 3.0, 4.0, 40),
  ('6.5','biotech', 'mid',   1.0, 1.5, 2.5, 3.5, 4.5, 60),
  ('6.5','climate', 'early', 1.0, 1.5, 2.5, 3.5, 4.5, 30),
  ('6.5','climate', 'mid',   1.5, 2.0, 3.0, 4.0, 5.0, 50)

ON CONFLICT (indicator_id, sector, stage) DO NOTHING;
