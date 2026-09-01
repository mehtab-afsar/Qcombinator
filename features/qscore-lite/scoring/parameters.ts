import type { ParameterId } from './types'

/** The 5 parameters and their weights — sums to 1.0, checked by a unit test. */
export const PARAMETER_DEFINITIONS: readonly { id: ParameterId; label: string; weight: number }[] = [
  { id: 'founder_team',              label: 'Founder & Team',              weight: 0.25 },
  { id: 'market_attractiveness',     label: 'Market Attractiveness',       weight: 0.25 },
  { id: 'product_technical_depth',   label: 'Product & Technical Depth',   weight: 0.20 },
  { id: 'commercial_momentum',       label: 'Commercial Momentum',         weight: 0.20 },
  { id: 'company_readiness',         label: 'Company Readiness',           weight: 0.10 },
] as const
