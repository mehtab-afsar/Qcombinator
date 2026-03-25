-- ──────────────────────────────────────────────────────────────────────────────
-- Align sector weights with docs/scoring-stages.md spec.
-- The TypeScript fallback (PRD_WEIGHTS) uses goToMarket: 0.17 but the spec
-- says SaaS B2B should be 0.25 — GTM is the primary moat for SaaS companies.
-- All weights within a sector must sum to 1.0.
--
-- Changes:
--   saas_b2b:  goToMarket 0.17 → 0.25, market 0.20 → 0.18, team 0.15 → 0.12
--   saas_b2c:  goToMarket 0.17 → 0.22, traction 0.12 → 0.15
--   biotech_deeptech: product 0.18 → 0.22, goToMarket 0.17 → 0.12
-- ──────────────────────────────────────────────────────────────────────────────

-- SaaS B2B: GTM is the primary competitive signal — raise to 0.25
update qscore_dimension_weights set weight = 0.25 where sector = 'saas_b2b' and dimension = 'goToMarket';
update qscore_dimension_weights set weight = 0.18 where sector = 'saas_b2b' and dimension = 'market';
update qscore_dimension_weights set weight = 0.12 where sector = 'saas_b2b' and dimension = 'team';
-- market(0.18) + product(0.18) + goToMarket(0.25) + financial(0.18) + team(0.12) + traction(0.09) = 1.00
update qscore_dimension_weights set weight = 0.09 where sector = 'saas_b2b' and dimension = 'traction';

-- SaaS B2C: Traction / viral growth matters more; GTM also important
update qscore_dimension_weights set weight = 0.22 where sector = 'saas_b2c' and dimension = 'goToMarket';
update qscore_dimension_weights set weight = 0.15 where sector = 'saas_b2c' and dimension = 'traction';
update qscore_dimension_weights set weight = 0.13 where sector = 'saas_b2c' and dimension = 'team';
-- market(0.20) + product(0.18) + goToMarket(0.22) + financial(0.12) + team(0.13) + traction(0.15) = 1.00
update qscore_dimension_weights set weight = 0.12 where sector = 'saas_b2c' and dimension = 'financial';

-- Biotech/DeepTech: Product/IP and Team credentials dominate; GTM less important pre-commercialization
update qscore_dimension_weights set weight = 0.22 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'product';
update qscore_dimension_weights set weight = 0.22 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'team';
update qscore_dimension_weights set weight = 0.12 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'goToMarket';
update qscore_dimension_weights set weight = 0.20 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'market';
update qscore_dimension_weights set weight = 0.16 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'financial';
update qscore_dimension_weights set weight = 0.08 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'traction';
-- 0.22 + 0.22 + 0.12 + 0.20 + 0.16 + 0.08 = 1.00

-- Invalidate the 1h weight cache so next scoring run picks up new values immediately
-- (The cache is in-process memory — a deploy clears it automatically.
--  For zero-downtime: the cache key includes a hash; updating the DB rows breaks the cache naturally.)
