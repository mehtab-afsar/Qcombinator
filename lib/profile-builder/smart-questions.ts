/**
 * Smart Questions — generates targeted gap-filling questions from extracted doc data.
 * Called after step-0 document upload to produce 5–7 questions covering only missing fields.
 */

import { getRequiredFields } from './question-engine'
import { getSectionWeightsBySector } from '@/features/qscore/calculators/iq-score-calculator'

export interface SmartQuestion {
  id: string
  sectionKey: string    // '1'–'5'
  sectionLabel: string
  text: string
  contextHint: string   // e.g. "We found: 12 paying customers at $18K MRR"
  helpText: string
  priority: number      // higher = shown first
}

// ── dot-notation accessor ────────────────────────────────────────────────────

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

// ── Section labels (drives question routing) ──────────────────────────────────
// Fields per section are now resolved dynamically via getRequiredFields(section, stage)
// from question-engine.ts, so they adapt to pre-product vs. revenue vs. growth stages.

const SECTION_LABELS: Record<string, string> = {
  '1': 'Market Validation',
  '2': 'Market & Competition',
  '3': 'IP & Technology',
  '4': 'Team',
  '5': 'Financials & Impact',
}

// ── Question bank ─────────────────────────────────────────────────────────────

interface QuestionDef {
  text: string
  getContext: (extracted: Record<string, unknown>) => string
  helpText: string
  sectionKey: string
  priority: number
}

const FIELD_QUESTIONS: Record<string, QuestionDef> = {
  // Section 1 — Market Validation
  customerCommitment: {
    sectionKey: '1', priority: 10,
    text: 'Can you share more detail on specific customer projects, LOIs, pilots, or current engagements?',
    getContext: (e) => {
      const c = e.customerCommitment
      if (c && typeof c === 'string' && c.length > 5) return `We found: "${c.slice(0, 70)}"`
      if (e.hasPayingCustomers === true) return 'We know you have paying customers — need the strongest commitment detail'
      if (e.largestContractUsd) return `Largest contract: $${(e.largestContractUsd as number).toLocaleString?.() ?? e.largestContractUsd} — what form is the commitment?`
      return ''
    },
    helpText: 'LOIs, pilots, signed contracts, or verbal commitments with timeline',
  },
  conversationCount: {
    sectionKey: '1', priority: 9,
    text: 'How many potential customers have you spoken with?',
    getContext: (e) => {
      const n = e.conversationCount
      if (n != null) return `We found ~${n} customer conversations mentioned`
      if (e.customerCommitment) return 'We found commitment data — still need your total conversation count'
      return ''
    },
    helpText: 'Discovery calls, demos, user interviews — include numbers',
  },
  hasPayingCustomers: {
    sectionKey: '1', priority: 8,
    text: 'Can you share current payment history, past revenues, paid pilots, or commercial contracts?',
    getContext: (e) => {
      if (e.largestContractUsd) return `We found a $${(e.largestContractUsd as number).toLocaleString?.() ?? e.largestContractUsd} contract — need total paying customer count`
      if (e.payingCustomerDetail) return `We found: "${String(e.payingCustomerDetail).slice(0, 60)}" — need count and price point`
      return ''
    },
    helpText: 'Include monthly/annual amount per customer if possible',
  },
  hasRetention: {
    sectionKey: '1', priority: 7,
    text: 'Can you share whether customers continue using, renewing, or expanding after the first engagement?',
    getContext: (e) => {
      const count = e.payingCustomerDetail ?? e.hasPayingCustomers
      if (count && e.largestContractUsd) return `We found: paying customers at $${(e.largestContractUsd as number).toLocaleString?.() ?? e.largestContractUsd} contract value`
      if (count) return 'We found paying customers — need retention/churn data'
      return ''
    },
    helpText: 'NDR%, churn rate, renewals, or expansion revenue',
  },
  salesCycleLength: {
    sectionKey: '1', priority: 6,
    text: 'How long does it typically take to move from first contact to pilot, and from pilot to a paid contract?',
    getContext: (e) => {
      if (e.hasPayingCustomers === true) return 'You have revenue — sales cycle length affects your traction score'
      if (e.largestContractUsd) return `With a $${(e.largestContractUsd as number).toLocaleString?.() ?? e.largestContractUsd} contract, cycle length matters for scoring`
      return ''
    },
    helpText: 'e.g. 30 days for SMB, 90 days for enterprise',
  },

  // Section 2 — Market & Competition
  'p2.tamDescription': {
    sectionKey: '2', priority: 10,
    text: 'Can you share your realistic target market size, reachable customer segment, and expansion potential over time?',
    getContext: (e) => {
      const competitors = getNestedValue(e, 'p2.competitorCount')
      if (competitors != null) return `We found ${competitors} competitors — still need your TAM size`
      const customers = e.targetCustomers
      if (customers) return `Target customers: ${String(customers).slice(0, 60)} — need market size estimate`
      return ''
    },
    helpText: 'Bottom-up preferred: # of target customers × average contract value',
  },
  'p2.marketUrgency': {
    sectionKey: '2', priority: 9,
    text: 'Can you explain how painful, costly, frequent, or strategic this problem is for customers today?',
    getContext: (e) => {
      const tam = getNestedValue(e, 'p2.tamDescription')
      if (tam) return `We found your TAM description — need the "why now" catalyst`
      const customers = e.targetCustomers
      if (customers) return `Targeting: ${String(customers).slice(0, 50)} — what's driving urgency?`
      return ''
    },
    helpText: 'Regulatory shift, tech breakthrough, behavior change in the last 1–2 years',
  },
  'p2.competitorDensityContext': {
    sectionKey: '2', priority: 8,
    text: 'Can you share who the main competitors and substitutes are, and why there is still room for a new player to establish a strong position?',
    getContext: (e) => {
      const count = getNestedValue(e, 'p2.competitorCount')
      return count !== undefined ? `We see ${count} competitors mentioned — need your specific differentiator` : ''
    },
    helpText: 'Name them, then explain your specific differentiator',
  },
  'p2.valuePool': {
    sectionKey: '2', priority: 7,
    text: 'Can you share more on customer budgets, pricing levels, contract values, and the margin potential in this market?',
    getContext: (e) => {
      const tam = getNestedValue(e, 'p2.tamDescription')
      if (tam) return `We found your TAM description — need to quantify the value pool (cost of the problem)`
      return ''
    },
    helpText: 'e.g. "$2M lost per hospital per year" or "4 hours/week × 50,000 teams × $50/hr"',
  },
  'p2.expansionPotential': {
    sectionKey: '2', priority: 6,
    text: 'Can you explain which adjacent use cases, customer segments, geographies, or product layers you can expand into after the initial wedge?',
    getContext: (e) => {
      const tam = getNestedValue(e, 'p2.tamDescription')
      if (tam) return `We found your primary TAM — need your expansion strategy beyond the beachhead`
      return ''
    },
    helpText: 'Adjacent verticals, geographies, or product lines that open up after initial wedge',
  },

  // Section 3 — IP & Technology
  'p3.hasPatent': {
    sectionKey: '3', priority: 10,
    text: 'Can you share whether you have any filed or granted patents, exclusive licenses, trademarks, or other legally protected assets relevant to the core business?',
    getContext: (e) => {
      const depth = getNestedValue(e, 'p3.technicalDepth')
      if (depth) return `We found your tech depth — need patent/trade secret status to complete IP score`
      const complexity = getNestedValue(e, 'p3.buildComplexity')
      if (complexity) return `Build complexity: ${complexity} — patent status helps score IP defensibility`
      return ''
    },
    helpText: 'Patent numbers, filing dates, or description of trade secrets',
  },
  'p3.buildComplexity': {
    sectionKey: '3', priority: 9,
    text: 'Can you explain how much time, iteration, validation, or engineering effort was required to reach the current product state, and why it would be hard to replicate?',
    getContext: (e) => {
      const cost = getNestedValue(e, 'p3.replicationCostUsd')
      const time = getNestedValue(e, 'p3.replicationTimeMonths')
      if (cost || time) return `We found partial replication data — need timeframe in months`
      const depth = getNestedValue(e, 'p3.technicalDepth')
      if (depth) return 'We found tech depth info — need replication difficulty estimate'
      return ''
    },
    helpText: 'e.g. less than 3 months, 6–12 months, 12+ months',
  },
  'p3.replicationTimeMonths': {
    sectionKey: '3', priority: 9,
    text: 'How many months would it take a well-funded competitor to replicate your technology — and what would make it difficult?',
    getContext: (e) => {
      const cost = getNestedValue(e, 'p3.replicationCostUsd')
      if (cost) return `We found replication cost — still need the time estimate in months`
      const depth = getNestedValue(e, 'p3.technicalDepth')
      if (depth) return 'We found tech depth info — need replication time estimate'
      return ''
    },
    helpText: 'Give a number of months — e.g. 18, 24, 36+',
  },
  'p3.technicalDepth': {
    sectionKey: '3', priority: 8,
    text: 'Can you explain what is technically difficult, novel, or sophisticated about the product and why it is not easy to build?',
    getContext: (e) => {
      const pat = getNestedValue(e, 'p3.hasPatent')
      return pat ? `Patent status: ${pat} — now describe what makes the tech hard to replicate` : ''
    },
    helpText: 'Proprietary data, novel algorithm, unique architecture, rare expertise',
  },
  'p3.knowHowDensity': {
    sectionKey: '3', priority: 7,
    text: 'Can you share what specialized expertise, tacit learning, unique datasets, or team-specific capabilities are embedded in the business?',
    getContext: (e) => {
      const depth = getNestedValue(e, 'p3.technicalDepth')
      return depth ? 'We found your tech depth — need to understand the proprietary know-how embedded in the team' : ''
    },
    helpText: 'Trade secrets, proprietary datasets, accumulated process know-how, rare team expertise',
  },

  // Section 4 — Team
  'p4.domainYears': {
    sectionKey: '4', priority: 10,
    text: 'Can you share the founders\' and core team\'s direct experience, sector exposure, and years spent in this domain?',
    getContext: (e) => {
      const fit = getNestedValue(e, 'p4.founderMarketFit')
      if (fit) return `We found founder-market fit narrative — need exact years of experience`
      const hardship = e.hardshipStory
      if (hardship) return 'We found your story — need your years of industry experience'
      return ''
    },
    helpText: 'Include specific roles and companies where relevant',
  },
  'p4.founderMarketFit': {
    sectionKey: '4', priority: 9,
    text: 'Can you explain why this team is particularly well positioned to solve this problem and win in this market?',
    getContext: (e) => {
      const years = getNestedValue(e, 'p4.domainYears')
      return years ? `We found: ${years} years of domain experience` : ''
    },
    helpText: 'Domain expertise, personal experience with the problem, or unique unfair advantage',
  },
  'p4.teamCoverage': {
    sectionKey: '4', priority: 8,
    text: 'Can you explain how the company currently covers the critical functions across product, technology, commercial, and operations?',
    getContext: (e) => {
      const years = getNestedValue(e, 'p4.domainYears')
      if (years) return `${years} years domain experience found — need team function coverage`
      const fit = getNestedValue(e, 'p4.founderMarketFit')
      if (fit) return 'We found founder-market fit — need to know who covers tech/sales/product'
      return ''
    },
    helpText: 'Tech, sales, product, finance, ops — list who covers what',
  },
  'p4.priorExits': {
    sectionKey: '4', priority: 7,
    text: 'Can you share any previous founding, operating, scaling, or leadership experience that is relevant to the current stage?',
    getContext: (e) => {
      const years = getNestedValue(e, 'p4.domainYears')
      if (years) return `We found ${years} years domain experience — prior exits significantly boost team score`
      return ''
    },
    helpText: 'Acquisitions, IPOs, or significant liquidity events — include approximate exit size if comfortable',
  },
  'p4.teamCohesionMonths': {
    sectionKey: '4', priority: 6,
    text: 'Can you share more on team retention, founder alignment, key hires, and how the team has handled pressure, pivots, or execution challenges together?',
    getContext: (e) => {
      const coverage = getNestedValue(e, 'p4.teamCoverage')
      if (coverage) return `Team coverage found — cohesion (time working together) is the final team signal`
      const fit = getNestedValue(e, 'p4.founderMarketFit')
      if (fit) return 'We found your founder story — how long has this specific team been working together?'
      return ''
    },
    helpText: 'Months working together on this company specifically — prior co-worker history counts',
  },

  // Section 5 — Financials & Impact
  'p5.climateLeverage': {
    sectionKey: '5', priority: 6,
    text: 'Can you share whether the company creates measurable reductions in emissions, carbon intensity, energy use, or other climate-relevant externalities?',
    getContext: (_e) => '',
    helpText: 'Quantified CO₂ reduction, energy savings, avoided emissions, or climate-positive substitution effects',
  },
  'p5.socialImpact': {
    sectionKey: '5', priority: 5,
    text: 'Can you explain how the product improves the use of materials, energy, water, labor, time, or cost compared with current alternatives?',
    getContext: (_e) => '',
    helpText: 'Reductions in input use, waste, time, cost, energy, water, or material burden',
  },
  'p5.revenueImpactLink': {
    sectionKey: '5', priority: 5,
    text: 'Can you explain how the business improves health, food, education, livelihoods, infrastructure, inclusion, resilience, or other important societal outcomes?',
    getContext: (_e) => '',
    helpText: 'Links to meaningful societal outcomes — access, affordability, resilience, productivity, or quality of life',
  },
  'p5.businessModelAlignment': {
    sectionKey: '5', priority: 4,
    text: 'Can you explain how your revenue model is directly linked to the impact or systemic outcome you aim to create?',
    getContext: (_e) => '',
    helpText: 'Whether the company earns more when it creates more of the desired outcome',
  },
  'p5.viksitBharatAlignment': {
    sectionKey: '5', priority: 4,
    text: 'Can you explain how the business contributes to priority capability areas such as sovereignty, resilience, domestic industrial capacity, deep tech capability, or national development priorities?',
    getContext: (_e) => '',
    helpText: 'Links to strategic sectors, domestic capability building, supply chain resilience, or critical infrastructure',
  },
  'financial.mrr': {
    sectionKey: '5', priority: 10,
    text: 'What is your current monthly recurring revenue (MRR)?',
    getContext: (e) => {
      const burn = getNestedValue(e, 'financial.monthlyBurn')
      if (burn) return `We found $${(burn as number).toLocaleString?.() ?? burn}/mo burn — need MRR to calculate burn multiple`
      const arr = getNestedValue(e, 'financial.arr')
      if (arr) return `We found $${(arr as number).toLocaleString?.() ?? arr} ARR — need MRR breakdown`
      return ''
    },
    helpText: 'MRR or ARR — include $0 if pre-revenue, still helpful',
  },
  'financial.monthlyBurn': {
    sectionKey: '5', priority: 9,
    text: 'What is your monthly burn rate?',
    getContext: (e) => {
      const mrr = getNestedValue(e, 'financial.mrr')
      if (mrr) return `We found $${(mrr as number).toLocaleString?.() ?? mrr} MRR — need burn rate for efficiency score`
      const runway = getNestedValue(e, 'financial.runway')
      if (runway) return `We found ${runway} months runway — need burn rate to verify`
      return ''
    },
    helpText: 'Total cash spent per month including salaries, infrastructure, and ops',
  },
  'financial.runway': {
    sectionKey: '5', priority: 8,
    text: 'How many months of runway do you have?',
    getContext: (e) => {
      const burn = getNestedValue(e, 'financial.monthlyBurn')
      return burn ? `Based on your $${(burn as number).toLocaleString?.() ?? burn}/mo burn` : ''
    },
    helpText: 'Cash in bank ÷ monthly burn rate',
  },
}

// ── IQ parameter weights (sector-agnostic default) ───────────────────────────
// Used to rank which weak section is most worth asking about.
// Matches the 'default' sector weights in iq-score-calculator.ts.
const SECTION_IQ_WEIGHT: Record<string, number> = {
  '1': 0.20,  // P1 Market Readiness
  '2': 0.20,  // P2 Market Potential
  '3': 0.17,  // P3 IP / Defensibility
  '4': 0.18,  // P4 Founder / Team
  '5': 0.17,  // P5/P6 Financials + Impact (combined proxy)
}

// ── Generator ─────────────────────────────────────────────────────────────────

/**
 * After document upload, generate targeted follow-up questions.
 *
 * Strategy:
 *  1. Build one candidate question per section (highest-priority missing field).
 *  2. Filter to sections that are STRICTLY WEAK: completionPct < 60 (≡ avg score < 3/5).
 *     If no completionPct data is provided all sections with missing fields are candidates.
 *  3. Rank weak sections by impact = (1 − completionPct/100) × iqWeight.
 *  4. Return the top 3 questions — the ones that would move the IQ score most.
 */
export function generateSmartQuestions(
  extractedBySections: Record<string, Record<string, unknown>>,
  stage: string,
  sectionCompletions?: Record<string, number>,  // completionPct (0–100) per section '1'–'5'
  sector?: string                               // e.g. 'biotech', 'b2b_saas' — drives weight ranking
): SmartQuestion[] {
  // Sector-aware weights: biotech prioritises P3 (IP), b2b_saas prioritises P1+P6, etc.
  // Falls back to hardcoded defaults if no sector provided.
  const iqWeight = sector ? getSectionWeightsBySector(sector) : SECTION_IQ_WEIGHT
  const questions: SmartQuestion[] = []

  for (const sectionKey of Object.keys(SECTION_LABELS)) {
    const sectionExtracted = extractedBySections[sectionKey] ?? {}
    // Stage-aware field list: pre-product founders skip retention/salesCycle;
    // growth founders get priorExits, teamCohesion, etc.
    const fields = getRequiredFields(Number(sectionKey), stage)

    for (const fieldPath of fields) {
      const existing = getNestedValue(sectionExtracted, fieldPath)
      if (existing !== null && existing !== undefined) continue  // already filled

      const def = FIELD_QUESTIONS[fieldPath]
      if (!def) continue

      questions.push({
        id: `q_${fieldPath.replace(/\./g, '_')}`,
        sectionKey: def.sectionKey,
        sectionLabel: SECTION_LABELS[def.sectionKey] ?? `Section ${def.sectionKey}`,
        text: def.text,
        contextHint: def.getContext(sectionExtracted),
        helpText: def.helpText,
        priority: def.priority,
      })
    }
  }

  // Step 1: one best question per section
  const bySection = new Map<string, SmartQuestion>()
  for (const q of questions.sort((a, b) => b.priority - a.priority)) {
    if (!bySection.has(q.sectionKey)) bySection.set(q.sectionKey, q)
  }

  // Step 2: keep only strictly weak sections (completionPct < 60 ≡ average score < 3/5)
  const candidates = [...bySection.values()].filter(q => {
    if (!sectionCompletions) return true
    return (sectionCompletions[q.sectionKey] ?? 0) < 60
  })

  // Step 3: rank by impact = (gap from perfect) × (IQ parameter weight), top 3
  return candidates
    .sort((a, b) => {
      const pctA = sectionCompletions?.[a.sectionKey] ?? 0
      const pctB = sectionCompletions?.[b.sectionKey] ?? 0
      const impactA = (1 - pctA / 100) * (iqWeight[a.sectionKey] ?? 0.17)
      const impactB = (1 - pctB / 100) * (iqWeight[b.sectionKey] ?? 0.17)
      return impactB - impactA
    })
    .slice(0, 3)
}
