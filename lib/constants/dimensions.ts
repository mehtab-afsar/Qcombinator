/**
 * Canonical Q-Score parameter string literals (P1–P6).
 * These are the real parameters from the Q-Score v2 calculator.
 * The old 6-column schema (market/product/gtm/financial/team/traction) is retired.
 */
export const PARAMS = {
  P1: 'p1',
  P2: 'p2',
  P3: 'p3',
  P4: 'p4',
  P5: 'p5',
  P6: 'p6',
} as const

export type Param = typeof PARAMS[keyof typeof PARAMS]

export const ALL_PARAMS = Object.values(PARAMS) as Param[]

export const PARAM_LABELS: Record<Param, string> = {
  p1: 'Market Readiness',
  p2: 'Market Potential',
  p3: 'IP & Defensibility',
  p4: 'Founder & Team',
  p5: 'Structural Impact',
  p6: 'Financials',
}

export const PARAM_DB_COLUMN: Record<Param, string> = {
  p1: 'p1_score',
  p2: 'p2_score',
  p3: 'p3_score',
  p4: 'p4_score',
  p5: 'p5_score',
  p6: 'p6_score',
}

// Legacy alias so old DIMENSIONS.GTM-style references get a compile error immediately
// instead of silently using the wrong schema
/** @deprecated Use PARAMS instead */
export const DIMENSIONS = PARAMS
/** @deprecated Use PARAM_DB_COLUMN instead */
export const DIMENSION_DB_COLUMN = PARAM_DB_COLUMN

// Legacy type alias for backward compat during migration
/** @deprecated Use Param instead */
export type Dimension = Param
