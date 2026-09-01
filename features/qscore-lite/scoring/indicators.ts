import type { IndicatorId, ParameterId } from './types'
import { PARAMETER_DEFINITIONS } from './parameters'

export interface IndicatorDefinition {
  id: IndicatorId
  parameterId: ParameterId
  label: string
  /** One-line evidence guidance — doubles as the source for the LLM extraction prompt (one loop
   *  over this list generates all 20 prompt blocks, not 20 hand-written ones). */
  guidance: string
}

export const INDICATOR_DEFINITIONS: readonly IndicatorDefinition[] = [
  // Founder & Team
  { id: 'founder_track_record', parameterId: 'founder_team', label: 'Founder Track Record',
    guidance: 'Evidence of prior startups, exits, or notable prior roles at recognizable companies.' },
  { id: 'founder_market_fit', parameterId: 'founder_team', label: 'Founder–Market Fit',
    guidance: "Evidence the founder's background or domain expertise genuinely matches the problem being solved." },
  { id: 'team_completeness', parameterId: 'founder_team', label: 'Team Completeness',
    guidance: 'Evidence of visible co-founders or key hires, especially technical leadership.' },
  { id: 'founder_credibility', parameterId: 'founder_team', label: 'Founder Credibility',
    guidance: 'Press mentions, speaking engagements, publications, or named investors/advisors backing the founder.' },

  // Market Attractiveness
  { id: 'market_category_signal', parameterId: 'market_attractiveness', label: 'Market Category Signal',
    guidance: 'Evidence of a real, named, sizeable market or category the company operates in.' },
  { id: 'competitive_position', parameterId: 'market_attractiveness', label: 'Competitive Position',
    guidance: 'Evidence of differentiation versus named competitors, or credible white space.' },
  { id: 'timing_tailwind', parameterId: 'market_attractiveness', label: 'Timing Tailwind',
    guidance: "Independent evidence of an industry trend supporting the company's timing." },
  { id: 'press_analyst_coverage', parameterId: 'market_attractiveness', label: 'Press & Analyst Coverage',
    guidance: 'Independent media or analyst coverage of the company or its space.' },

  // Product & Technical Depth
  { id: 'product_substance', parameterId: 'product_technical_depth', label: 'Product Substance',
    guidance: 'Evidence of a real, functioning product — not just a landing page or waitlist.' },
  { id: 'technical_depth', parameterId: 'product_technical_depth', label: 'Technical Depth',
    guidance: 'GitHub activity, patents, technical publications, or engineering blog depth.' },
  { id: 'ip_defensibility', parameterId: 'product_technical_depth', label: 'IP / Defensibility',
    guidance: 'Patents, trademarks, or credible proprietary-technology claims.' },
  { id: 'product_velocity', parameterId: 'product_technical_depth', label: 'Product Velocity',
    guidance: 'Release cadence, changelog activity, or commit frequency.' },

  // Commercial Momentum
  { id: 'customer_evidence', parameterId: 'commercial_momentum', label: 'Customer Evidence',
    guidance: 'Named customers, logos, or case studies.' },
  { id: 'revenue_traction', parameterId: 'commercial_momentum', label: 'Revenue Traction',
    guidance: 'Public revenue figures, user counts, or growth figures.' },
  { id: 'partnership_evidence', parameterId: 'commercial_momentum', label: 'Partnership Evidence',
    guidance: 'Named partners, integrations, or marketplace listings.' },
  { id: 'growth_momentum', parameterId: 'commercial_momentum', label: 'Growth Momentum',
    guidance: 'Hiring velocity, headcount growth, or expansion announcements.' },

  // Company Readiness
  { id: 'funding_history', parameterId: 'company_readiness', label: 'Funding History',
    guidance: 'Raised rounds, named investors, or disclosed amounts.' },
  { id: 'company_basics_verifiable', parameterId: 'company_readiness', label: 'Company Basics Verifiable',
    guidance: 'Incorporation, HQ, or founding date consistent across independent sources.' },
  { id: 'digital_presence_quality', parameterId: 'company_readiness', label: 'Digital Presence Quality',
    guidance: 'Website/domain professionalism, social presence, or structured company listings.' },
  { id: 'regulatory_compliance', parameterId: 'company_readiness', label: 'Regulatory / Compliance',
    guidance: 'Licenses, certifications, or compliance posture — legitimately absent for most companies.' },
] as const

/** Per-indicator weight, derived from its parameter's weight split equally across that
 *  parameter's indicators — never hand-picked, so retuning a parameter's weight (or moving an
 *  indicator between parameters) never requires touching the aggregation math. */
export function weightForIndicator(id: IndicatorId): number {
  const def = INDICATOR_DEFINITIONS.find(i => i.id === id)
  if (!def) throw new Error(`Unknown indicator id: ${id}`)
  const parameter = PARAMETER_DEFINITIONS.find(p => p.id === def.parameterId)
  if (!parameter) throw new Error(`Unknown parameter id: ${def.parameterId}`)
  const siblingCount = INDICATOR_DEFINITIONS.filter(i => i.parameterId === def.parameterId).length
  return parameter.weight / siblingCount
}
