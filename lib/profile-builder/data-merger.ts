/**
 * Profile Builder — Data Merger
 * Combines extracted fields from all 5 sections into a single AssessmentData
 * object that can be passed directly to calculatePRDQScore().
 *
 * Also builds the dataSourceMap so confidence multipliers are applied correctly.
 */

import type { AssessmentData, DataSourceMap, DataSourceType } from '@/features/qscore/types/qscore.types'

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

    // ── Product/learning (placeholder — profile builder collects via IP section) ──
    failedBelief:          '',
    failedReasoning:       '',
    failedDiscovery:       '',
    failedChange:          '',
    tested:                '',
    buildTime:             num(p3?.buildComplexity === '<1 month' ? 1 : p3?.buildComplexity === '1-3 months' ? 2 : 4),
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
    } : undefined,

    // ── P5: Structural Impact (Section 5) ──────────────────────────────────
    p5: p5 ? {
      climateLeverage:          str(p5.climateLeverage) || undefined,
      socialImpact:             str(p5.socialImpact) || undefined,
      revenueImpactLink:        str(p5.revenueImpactLink) || undefined,
      scalingMechanism:         str(p5.scalingMechanism) || undefined,
      viksitBharatAlignment:    str(p5.viksitBharatAlignment) || undefined,
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
