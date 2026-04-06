/**
 * Profile Builder — Data Merger
 * Combines extracted fields from all 5 sections into a single AssessmentData
 * object that can be passed directly to calculateIQScore().
 *
 * Also builds the dataSourceMap so confidence multipliers are applied correctly.
 */

import type { AssessmentData, DataSourceMap, DataSourceType } from '@/features/qscore/types/qscore.types'

// ── Field drift detection ─────────────────────────────────────────────────────
// Extraction prompts sometimes return snake_case when camelCase is expected.
// Silent mismatches floor indicators to their minimum score.
// This map: snake_case key → expected camelCase key, per section.

const KNOWN_DRIFT_PAIRS: Record<string, string> = {
  // Section 1
  conversation_count:    'conversationCount',
  customer_type:         'customerType',
  customer_quote:        'customerQuote',
  has_paying_customers:  'hasPayingCustomers',
  largest_contract_usd:  'largestContractUsd',
  sales_cycle_length:    'salesCycleLength',
  has_retention:         'hasRetention',
  retention_detail:      'retentionDetail',
  // Section 2
  tam_description:       'tamDescription',
  market_urgency:        'marketUrgency',
  value_pool:            'valuePool',
  expansion_potential:   'expansionPotential',
  competitor_count:      'competitorCount',
  target_customers:      'targetCustomers',
  lifetime_value:        'lifetimeValue',
  // Section 3
  has_patent:            'hasPatent',
  patent_description:    'patentDescription',
  technical_depth:       'technicalDepth',
  know_how_density:      'knowHowDensity',
  build_complexity:      'buildComplexity',
  replication_cost_usd:  'replicationCostUsd',
  replication_time_months: 'replicationTimeMonths',
  // Section 4
  domain_years:          'domainYears',
  founder_market_fit:    'founderMarketFit',
  prior_exits:           'priorExits',
  team_coverage:         'teamCoverage',
  team_cohesion_months:  'teamCohesionMonths',
  team_churn_recent:     'teamChurnRecent',
  // Section 5
  monthly_burn:          'monthlyBurn',
  average_deal_size:     'averageDealSize',
  projected_revenue_12mo: 'projectedRevenue12mo',
  climate_leverage:      'climateLeverage',
  social_impact:         'socialImpact',
  revenue_impact_link:   'revenueImpactLink',
  scaling_mechanism:     'scalingMechanism',
  viksit_bharat_alignment: 'viksitBharatAlignment',
}

function warnFieldDrift(sectionNum: number, raw: Record<string, unknown>): void {
  const hits: string[] = []
  for (const key of Object.keys(raw)) {
    if (KNOWN_DRIFT_PAIRS[key]) {
      hits.push(`  "${key}" → should be "${KNOWN_DRIFT_PAIRS[key]}"`)
    }
  }
  if (hits.length > 0) {
    console.warn(`[data-merger] Section ${sectionNum} field drift detected (snake_case keys will be ignored):\n${hits.join('\n')}`)
  }
}

export interface SectionData {
  extractedFields: Record<string, unknown>
  confidenceMap: Record<string, number>
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return isFinite(n) ? n : fallback
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 'yes'
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function nested<T>(v: unknown): T | undefined {
  return (v !== null && typeof v === 'object') ? v as T : undefined
}

/** Infer DataSourceType from a confidence value */
function confidenceToSource(conf: number): DataSourceType {
  if (conf >= 0.90) return 'stripe'
  if (conf >= 0.80) return 'document'
  return 'self_reported'
}

export function mergeToAssessmentData(sections: Partial<Record<number, SectionData>>): {
  assessmentData: AssessmentData
  dataSourceMap: DataSourceMap
} {
  const s1 = sections[1]?.extractedFields ?? {}
  const s2 = sections[2]?.extractedFields ?? {}
  const s3 = sections[3]?.extractedFields ?? {}
  const s4 = sections[4]?.extractedFields ?? {}
  const s5 = sections[5]?.extractedFields ?? {}

  // Detect snake_case field drift from extraction prompts (logs warn, never throws)
  warnFieldDrift(1, s1)
  warnFieldDrift(2, s2)
  warnFieldDrift(3, s3)
  warnFieldDrift(4, s4)
  warnFieldDrift(5, s5)

  const c1 = sections[1]?.confidenceMap ?? {}
  const c2 = sections[2]?.confidenceMap ?? {}
  const c5 = sections[5]?.confidenceMap ?? {}

  const fin = nested<Record<string, unknown>>(s5.financial)
  const p2  = nested<Record<string, unknown>>(s2.p2 ?? s2)
  const p3  = nested<Record<string, unknown>>(s3.p3 ?? s3)
  const p4  = nested<Record<string, unknown>>(s4.p4 ?? s4)
  const p5  = nested<Record<string, unknown>>(s5.p5)

  const assessmentData: AssessmentData = {
    // ── Team / problem origin (Section 4) ──────────────────────────────────
    problemStory:          str(s4.problemStory),
    advantages:            arr(s4.advantages),
    advantageExplanation:  str(s4.advantageExplanation),
    hardshipStory:         str(s4.hardshipStory),

    // ── Customer evidence (Section 1) ──────────────────────────────────────
    customerType:          str(s1.customerType),
    conversationDate:      null,
    customerQuote:         str(s1.customerQuote),
    customerSurprise:      str(s1.customerSurprise),
    customerCommitment:    str(s1.customerCommitment),
    conversationCount:     num(s1.conversationCount),
    customerList:          arr(s1.customerList),

    // ── IQ v2: Section 1 additional fields ─────────────────────────────────
    hasPayingCustomers:    bool(s1.hasPayingCustomers),
    payingCustomerDetail:  str(s1.payingCustomerDetail),
    salesCycleLength:      str(s1.salesCycleLength),
    hasRetention:          bool(s1.hasRetention) || undefined,
    retentionDetail:       str(s1.retentionDetail),
    largestContractUsd:    num(s1.largestContractUsd) || undefined,

    // ── Product/learning (placeholder — profile builder collects via IP section) ──
    failedBelief:          '',
    failedReasoning:       '',
    failedDiscovery:       '',
    failedChange:          '',
    tested:                '',
    // buildTime mirrors the BUILD_COMPLEXITY_MAP values in p3-ip-defensibility.ts.
    // Must produce undefined (not 0) for unrecognised strings so the calculator
    // can fall back to its own buildComplexityToMonths() parser.
    buildTime: (() => {
      const bc = str(p3?.buildComplexity).trim().toLowerCase()
      const MONTHS: Record<string, number> = {
        '<1 month': 0.5, 'less than one month': 0.5, 'less than 1 month': 0.5,
        'under 1 month': 0.5, 'under one month': 0.5,
        '1-3 months': 2, 'one to three months': 2, '1 to 3 months': 2,
        '3-6 months': 4.5, 'three to six months': 4.5,
        '6-12 months': 9, 'six to twelve months': 9,
        '12+ months': 18, 'more than a year': 18, 'over a year': 18, 'over 12 months': 18,
      }
      return MONTHS[bc] ?? undefined
    })(),
    measurement:           '',
    results:               '',
    learned:               '',
    changed:               '',

    // ── Market Realism (Section 1 + 2) ─────────────────────────────────────
    targetCustomers:        num(s2.targetCustomers) || undefined,
    conversionRate:         num(s1.conversionRate) || undefined,
    dailyActivity:          undefined,
    lifetimeValue:          num(s2.lifetimeValue) || undefined,
    costPerAcquisition:     num(s1.cac) || undefined,

    // ── GTM (Section 1 signals) ─────────────────────────────────────────────
    gtm: {
      icpDescription:   str(s2.icpDescription ?? p2?.tamDescription),
      channelsTried:    arr(s1.channelsTried),
      channelResults:   [],
      currentCAC:       num(s1.cac) || undefined,
      targetCAC:        undefined,
      messagingTested:  bool(s1.messagingTested),
      messagingResults: str(s1.messagingResults),
    },

    // ── Financial (Section 5) ───────────────────────────────────────────────
    financial: fin ? {
      mrr:                  num(fin.mrr) || undefined,
      arr:                  num(fin.arr) || undefined,
      monthlyBurn:          num(fin.monthlyBurn),
      runway:               num(fin.runway) || undefined,
      cogs:                 num(fin.cogs) || undefined,
      averageDealSize:      num(fin.averageDealSize) || undefined,
      projectedRevenue12mo: num(fin.projectedRevenue12mo) || undefined,
    } : { monthlyBurn: 0 },

    // ── P2: Market Potential (Section 2) ───────────────────────────────────
    p2: p2 ? {
      tamDescription:           str(p2.tamDescription),
      marketUrgency:            str(p2.marketUrgency),
      valuePool:                str(p2.valuePool),
      expansionPotential:       str(p2.expansionPotential),
      competitorCount:          num(p2.competitorCount) || undefined,
      competitorDensityContext: str(p2.competitorDensityContext),
    } : undefined,

    // ── P3: IP/Defensibility (Section 3) ───────────────────────────────────
    p3: p3 ? {
      hasPatent:          bool(p3.hasPatent),
      patentDescription:  str(p3.patentDescription),
      technicalDepth:     str(p3.technicalDepth),
      knowHowDensity:     str(p3.knowHowDensity),
      buildComplexity:    str(p3.buildComplexity),
      replicationCostUsd: num(p3.replicationCostUsd) || undefined,
    } : undefined,

    // ── P4: Founder/Team (Section 4) ───────────────────────────────────────
    p4: p4 ? {
      domainYears:        num(p4.domainYears) || undefined,
      founderMarketFit:   str(p4.founderMarketFit),
      priorExits:         num(p4.priorExits),
      teamCoverage:       arr(p4.teamCoverage),
      teamCohesionMonths: num(p4.teamCohesionMonths) || undefined,
      teamChurnRecent:    bool(p4.teamChurnRecent) || undefined,
    } : undefined,

    // ── IQ v2: additional top-level fields ─────────────────────────────────
    replicationTimeMonths: num(p3?.replicationTimeMonths) || undefined,

    // ── P5: Structural Impact (Section 5) ──────────────────────────────────
    p5: p5 ? {
      climateLeverage:          str(p5.climateLeverage) || undefined,
      socialImpact:             str(p5.socialImpact) || undefined,
      revenueImpactLink:        str(p5.revenueImpactLink) || undefined,
      scalingMechanism:         str(p5.scalingMechanism) || undefined,
      viksitBharatAlignment:    str(p5.viksitBharatAlignment) || undefined,
      // IQ v2 extended P5
      resourceEfficiency:       str(p5.resourceEfficiency) || undefined,
      developmentRelevance:     str(p5.developmentRelevance) || undefined,
      businessModelAlignment:   str(p5.businessModelAlignment) || undefined,
      strategicRelevance:       str(p5.strategicRelevance) || undefined,
    } : undefined,
  }

  // ── Build dataSourceMap from confidence values ──────────────────────────
  const dataSourceMap: DataSourceMap = {}
  if (fin) {
    const mrrConf = c5['financial.mrr'] ?? c5['mrr'] ?? 0.55
    dataSourceMap.mrr  = confidenceToSource(mrrConf)
    dataSourceMap.arr  = confidenceToSource(mrrConf)
    const burnConf = c5['financial.monthlyBurn'] ?? c5['monthlyBurn'] ?? 0.55
    dataSourceMap.monthlyBurn = confidenceToSource(burnConf)
    dataSourceMap.runway = confidenceToSource(burnConf)
  }
  const tacConf = c1['largestContractUsd'] ?? 0.55
  dataSourceMap.customerCommitment = confidenceToSource(tacConf)
  const convConf = c1['conversationCount'] ?? 0.55
  dataSourceMap.conversationCount = confidenceToSource(convConf)

  if (assessmentData.targetCustomers) {
    dataSourceMap.targetCustomers = confidenceToSource(c2['targetCustomers'] ?? 0.55)
    dataSourceMap.lifetimeValue   = confidenceToSource(c2['lifetimeValue'] ?? 0.55)
  }

  assessmentData.dataSourceMap = dataSourceMap

  return { assessmentData, dataSourceMap }
}
