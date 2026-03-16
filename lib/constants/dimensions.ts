/**
 * Canonical Q-Score dimension string literals.
 * Values match the DB column prefix (e.g. DIMENSIONS.GTM → gtm_score column)
 * and match the keys in PRDQScore.breakdown (after renaming goToMarket → gtm).
 */
export const DIMENSIONS = {
  MARKET:    'market',
  PRODUCT:   'product',
  GTM:       'gtm',
  FINANCIAL: 'financial',
  TEAM:      'team',
  TRACTION:  'traction',
} as const;

export type Dimension = typeof DIMENSIONS[keyof typeof DIMENSIONS];

/** All dimension values — useful for iteration */
export const ALL_DIMENSIONS = Object.values(DIMENSIONS) as Dimension[];

/** Maps dimension → Supabase qscore_history column name */
export const DIMENSION_DB_COLUMN: Record<Dimension, string> = {
  market:    'market_score',
  product:   'product_score',
  gtm:       'gtm_score',
  financial: 'financial_score',
  team:      'team_score',
  traction:  'traction_score',
};
