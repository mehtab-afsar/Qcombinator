-- Add cohort_scores and gtm_diagnostics to qscore_history
-- cohort_scores: percentile-based dimension scores once MIN_COHORT_SIZE is reached
-- gtm_diagnostics: D1/D2/D3 diagnostic breakdown (why GTM score is low)

ALTER TABLE qscore_history
  ADD COLUMN IF NOT EXISTS cohort_scores   JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gtm_diagnostics JSONB DEFAULT NULL;

COMMENT ON COLUMN qscore_history.cohort_scores IS
  'Percentile-based cohort dimension scores. Null until cohort reaches MIN_COHORT_SIZE (30). '
  'Shape: { market, product, goToMarket, financial, team, traction, overall, cohortSize, sector }';

COMMENT ON COLUMN qscore_history.gtm_diagnostics IS
  'GTM diagnostic result from runGTMDiagnostics(). '
  'Shape: { D1, D2, D3, overallGTMScore, primaryGap, routeToAgent, routeChallenge }';
