/**
 * Smart Questions — generates targeted gap-filling questions from extracted doc data.
 * Called after step-0 document upload to produce 5–7 questions covering only missing fields.
 */

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

// ── Critical fields needed per section ───────────────────────────────────────

export const CRITICAL_FIELDS: Record<string, string[]> = {
  // conversationCount first — even pre-product founders can answer this; customerCommitment requires LOIs/contracts
  '1': ['conversationCount', 'hasPayingCustomers', 'customerCommitment', 'hasRetention', 'salesCycleLength'],
  '2': ['p2.tamDescription', 'p2.marketUrgency', 'p2.competitorDensityContext'],
  // replicationTimeMonths is what LLMs reliably extract; buildComplexity often stays null even when answered
  '3': ['p3.hasPatent', 'p3.replicationTimeMonths', 'p3.technicalDepth'],
  '4': ['p4.domainYears', 'p4.founderMarketFit', 'p4.teamCoverage'],
  '5': ['financial.mrr', 'financial.monthlyBurn', 'financial.runway'],
}

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
    text: 'Tell me about your strongest customer commitment.',
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
    text: 'Do you have paying customers? If so, how many and at what price point?',
    getContext: (e) => {
      if (e.largestContractUsd) return `We found a $${(e.largestContractUsd as number).toLocaleString?.() ?? e.largestContractUsd} contract — need total paying customer count`
      if (e.payingCustomerDetail) return `We found: "${String(e.payingCustomerDetail).slice(0, 60)}" — need count and price point`
      return ''
    },
    helpText: 'Include monthly/annual amount per customer if possible',
  },
  hasRetention: {
    sectionKey: '1', priority: 7,
    text: 'Tell me about customer retention.',
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
    text: 'How long does it take to close a deal from first contact?',
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
    text: 'Describe your total addressable market.',
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
    text: 'What changed recently that makes this possible or urgent now?',
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
    text: 'Who are your main competitors and how are you different?',
    getContext: (e) => {
      const count = getNestedValue(e, 'p2.competitorCount')
      return count !== undefined ? `We see ${count} competitors mentioned — need your specific differentiator` : ''
    },
    helpText: 'Name them, then explain your specific differentiator',
  },

  // Section 3 — IP & Technology
  'p3.hasPatent': {
    sectionKey: '3', priority: 10,
    text: 'Do you have any patents filed or granted? Any trade secrets or proprietary data?',
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
    text: 'How long would it take a well-funded competitor to replicate what you\'ve built?',
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
    text: 'How many months would it take a well-funded competitor to replicate your technology?',
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
    text: 'What makes your technology genuinely hard to build?',
    getContext: (e) => {
      const pat = getNestedValue(e, 'p3.hasPatent')
      return pat ? `Patent status: ${pat} — now describe what makes the tech hard to replicate` : ''
    },
    helpText: 'Proprietary data, novel algorithm, unique architecture, rare expertise',
  },

  // Section 4 — Team
  'p4.domainYears': {
    sectionKey: '4', priority: 10,
    text: 'How many years of direct experience do you have in this industry?',
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
    text: 'Why are YOU specifically the right person to build this company?',
    getContext: (e) => {
      const years = getNestedValue(e, 'p4.domainYears')
      return years ? `We found: ${years} years of domain experience` : ''
    },
    helpText: 'Domain expertise, personal experience with the problem, or unique unfair advantage',
  },
  'p4.teamCoverage': {
    sectionKey: '4', priority: 8,
    text: 'What key functions does your founding team cover?',
    getContext: (e) => {
      const years = getNestedValue(e, 'p4.domainYears')
      if (years) return `${years} years domain experience found — need team function coverage`
      const fit = getNestedValue(e, 'p4.founderMarketFit')
      if (fit) return 'We found founder-market fit — need to know who covers tech/sales/product'
      return ''
    },
    helpText: 'Tech, sales, product, finance, ops — list who covers what',
  },

  // Section 5 — Financials
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

// ── Generator ─────────────────────────────────────────────────────────────────

export function generateSmartQuestions(
  extractedBySections: Record<string, Record<string, unknown>>,
  _stage: string
): SmartQuestion[] {
  const questions: SmartQuestion[] = []

  for (const [sectionKey, fields] of Object.entries(CRITICAL_FIELDS)) {
    const sectionExtracted = extractedBySections[sectionKey] ?? {}

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

  // Sort by priority desc, limit to 9 (3 per missing section × up to 3 sections)
  return questions.sort((a, b) => b.priority - a.priority).slice(0, 9)
}
