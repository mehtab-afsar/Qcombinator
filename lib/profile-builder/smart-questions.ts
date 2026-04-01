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
  '1': ['customerCommitment', 'conversationCount', 'hasPayingCustomers', 'hasRetention', 'salesCycleLength'],
  '2': ['p2.tamDescription', 'p2.marketUrgency', 'p2.competitorDensityContext'],
  '3': ['p3.hasPatent', 'p3.buildComplexity', 'p3.technicalDepth'],
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
    getContext: () => '',
    helpText: 'LOIs, pilots, signed contracts, or verbal commitments with timeline',
  },
  conversationCount: {
    sectionKey: '1', priority: 9,
    text: 'How many potential customers have you spoken with?',
    getContext: () => '',
    helpText: 'Discovery calls, demos, user interviews — include numbers',
  },
  hasPayingCustomers: {
    sectionKey: '1', priority: 8,
    text: 'Do you have paying customers? If so, how many and at what price point?',
    getContext: () => '',
    helpText: 'Include monthly/annual amount per customer if possible',
  },
  hasRetention: {
    sectionKey: '1', priority: 7,
    text: 'Tell me about customer retention.',
    getContext: (e) => {
      const count = e.payingCustomerDetail ?? e.hasPayingCustomers
      const mrr = (e as Record<string, unknown> & { financial?: { mrr?: number } }).financial?.mrr
      if (count && mrr) return `We found: paying customers at $${mrr?.toLocaleString?.() ?? mrr} MRR`
      return ''
    },
    helpText: 'NDR%, churn rate, renewals, or expansion revenue',
  },
  salesCycleLength: {
    sectionKey: '1', priority: 6,
    text: 'How long does it take to close a deal from first contact?',
    getContext: () => '',
    helpText: 'e.g. 30 days for SMB, 90 days for enterprise',
  },

  // Section 2 — Market & Competition
  'p2.tamDescription': {
    sectionKey: '2', priority: 10,
    text: 'Describe your total addressable market.',
    getContext: () => '',
    helpText: 'Bottom-up preferred: # of target customers × average contract value',
  },
  'p2.marketUrgency': {
    sectionKey: '2', priority: 9,
    text: 'What changed recently that makes this possible or urgent now?',
    getContext: (_e) => {
      const industry = ''
      return industry ? `You're targeting the ${industry} market` : ''
    },
    helpText: 'Regulatory shift, tech breakthrough, behavior change in the last 1–2 years',
  },
  'p2.competitorDensityContext': {
    sectionKey: '2', priority: 8,
    text: 'Who are your main competitors and how are you different?',
    getContext: (e) => {
      const count = getNestedValue(e, 'p2.competitorCount')
      return count !== undefined ? `We see ${count} competitors mentioned` : ''
    },
    helpText: 'Name them, then explain your specific differentiator',
  },

  // Section 3 — IP & Technology
  'p3.hasPatent': {
    sectionKey: '3', priority: 10,
    text: 'Do you have any patents filed or granted? Any trade secrets or proprietary data?',
    getContext: () => '',
    helpText: 'Patent numbers, filing dates, or description of trade secrets',
  },
  'p3.buildComplexity': {
    sectionKey: '3', priority: 9,
    text: 'How long would it take a well-funded competitor to replicate what you\'ve built?',
    getContext: () => '',
    helpText: 'e.g. less than 3 months, 6–12 months, 12+ months',
  },
  'p3.technicalDepth': {
    sectionKey: '3', priority: 8,
    text: 'What makes your technology genuinely hard to build?',
    getContext: (e) => {
      const pat = getNestedValue(e, 'p3.hasPatent')
      return pat ? `Patent status: ${pat}` : ''
    },
    helpText: 'Proprietary data, novel algorithm, unique architecture, rare expertise',
  },

  // Section 4 — Team
  'p4.domainYears': {
    sectionKey: '4', priority: 10,
    text: 'How many years of direct experience do you have in this industry?',
    getContext: () => '',
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
    getContext: () => '',
    helpText: 'Tech, sales, product, finance, ops — list who covers what',
  },

  // Section 5 — Financials
  'financial.mrr': {
    sectionKey: '5', priority: 10,
    text: 'What is your current monthly recurring revenue (MRR)?',
    getContext: () => '',
    helpText: 'MRR or ARR — include $0 if pre-revenue, still helpful',
  },
  'financial.monthlyBurn': {
    sectionKey: '5', priority: 9,
    text: 'What is your monthly burn rate?',
    getContext: () => '',
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
