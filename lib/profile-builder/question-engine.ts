/**
 * Profile Builder — Question Engine
 * Manages adaptive, stage-aware questioning per section.
 */

import { UPLOAD_TRIGGER_KEYWORDS } from './extraction-prompts'

export interface FounderProfile {
  stage: string
  industry: string
  revenueStatus: string
  companyName?: string
}

// ── Initial questions per section, adapted by stage ──────────────────────────

const INITIAL_QUESTIONS: Record<number, Record<string, string>> = {
  1: {
    default:     "Have you had any customers, pilots, or LOIs? Tell me what's happened so far — named companies, what stage the engagement is at, whether any money has changed hands.",
    'pre-product': "Have you had conversations with potential customers about this problem? Tell me who you've spoken to and what happened.",
    'mvp':       "Have you had any early users or pilot conversations? Tell me who has tried it and what stage those relationships are at.",
    'launched':  "Walk me through your customer traction — who's using it, how many, and have any paid you?",
    'growing':   "Walk me through your sales motion — how many paying customers, what's your MRR, and what does a typical deal look like?",
  },
  2: {
    default:     "How many companies or people have this problem in your primary market? Walk me through your estimate — don't give me a TAM from a report, tell me how you counted the actual buyers.",
    'pre-product': "Who exactly are you building this for? Describe the specific type of person or company with this problem, and how many of them exist.",
    'growing':   "You're already in market — how do you size the opportunity? How many more customers like yours are out there, and what's the path to the next 10×?",
  },
  3: {
    default:     "What's technically hard about what you've built? If a well-funded competitor started tomorrow, how long and how much money would it take them to replicate what you have — and have you filed any patents?",
    'pre-product': "What expertise or IP does your team hold that a competitor would struggle to replicate? Have you filed any patents, and roughly how much would it cost someone to build a competitive alternative?",
    'healthtech': "Have you filed or applied for any patents, FDA clearances, or CE marks? What's your regulatory strategy, and how long would it take a well-funded team to catch up technically?",
    'deeptech':  "What's the core technical breakthrough? Have you filed patents? Roughly how much capital would a competitor need to replicate your core IP or know-how?",
  },
  4: {
    default:     "Tell me your story — how many years have you worked in this exact domain, how many previous companies have you started or exited, and how long have the key members of your current team worked together?",
    'pre-product': "What's your background in this space — years of domain experience, any prior startups, and who's on the founding team and how long have you all known each other?",
    'growing':   "Walk me through the founding team — years of relevant domain experience, prior exits, and which functions (tech, sales, product, finance) are covered by the core team?",
  },
  5: {
    default:     "What's your current MRR and monthly burn? If you're pre-revenue, what's your cash runway in months?",
    'pre-product': "What's your current cash position and monthly burn? How long do you have before you need to raise?",
    'growing':   "Walk me through your unit economics — MRR, burn, gross margin, and CAC vs LTV.",
  },
}

export function getInitialQuestion(section: number, profile: FounderProfile): string {
  const stageMap = INITIAL_QUESTIONS[section] ?? {}
  const stage = profile.stage?.toLowerCase() ?? ''
  const industry = profile.industry?.toLowerCase() ?? ''

  // Check industry-specific overrides first
  if (section === 3 && (industry.includes('health') || industry.includes('biotech'))) {
    return stageMap['healthtech'] ?? stageMap['default'] ?? ''
  }

  // Match stage — exact first, then partial
  if (stageMap[stage]) return stageMap[stage]
  const stageKey = Object.keys(stageMap).find(k => k !== 'default' && stage.includes(k))
  if (stageKey) return stageMap[stageKey]

  return stageMap['default'] ?? `Tell me about your progress on this dimension.`
}

// ── Required fields per section — 70%+ needed to complete ────────────────────

const REQUIRED_FIELDS: Record<number, string[]> = {
  1: ['customerCommitment', 'hasPayingCustomers', 'salesCycleLength', 'hasRetention', 'largestContractUsd'],
  2: ['p2.tamDescription', 'p2.marketUrgency', 'p2.valuePool', 'p2.expansionPotential', 'p2.competitorDensityContext'],
  3: ['p3.hasPatent', 'p3.technicalDepth', 'p3.knowHowDensity', 'p3.buildComplexity', 'p3.replicationCostUsd'],
  4: ['p4.domainYears', 'p4.founderMarketFit', 'p4.priorExits', 'p4.teamCoverage', 'p4.teamCohesionMonths'],
  5: ['financial.mrr', 'financial.monthlyBurn', 'financial.runway', 'p5.climateLeverage', 'p5.revenueImpactLink'],
}

export function isSectionComplete(extractedFields: Record<string, unknown>, section: number): boolean {
  const required = REQUIRED_FIELDS[section] ?? []
  if (required.length === 0) return false
  let filled = 0
  for (const field of required) {
    const val = getNestedValue(extractedFields, field)
    if (val !== null && val !== undefined) filled++
  }
  return (filled / required.length) >= 0.70
}

export function getSectionCompletionPct(extractedFields: Record<string, unknown>, section: number): number {
  const required = REQUIRED_FIELDS[section] ?? []
  if (required.length === 0) return 0
  let filled = 0
  for (const field of required) {
    const val = getNestedValue(extractedFields, field)
    if (val !== null && val !== undefined) filled++
  }
  return Math.round((filled / required.length) * 100)
}

export function getMissingFields(extractedFields: Record<string, unknown>, section: number): string[] {
  const required = REQUIRED_FIELDS[section] ?? []
  return required.filter(field => {
    const val = getNestedValue(extractedFields, field)
    return val === null || val === undefined
  })
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

// ── Upload trigger detection ──────────────────────────────────────────────────

export function shouldTriggerUpload(answer: string, section: number): string | null {
  const keywords = UPLOAD_TRIGGER_KEYWORDS[section] ?? []
  const lower = answer.toLowerCase()
  const matched = keywords.find(kw => lower.includes(kw))
  if (!matched) return null

  const prompts: Record<number, string> = {
    1: "You mentioned a document — would you like to upload it? Uploaded LOIs and contracts are verified and increase your score confidence.",
    2: "You mentioned a deck or research document — would you like to upload it? We'll extract market data automatically.",
    3: "You mentioned a patent or technical document — would you like to upload it? We'll extract IP details automatically.",
    4: "You mentioned a bio or LinkedIn profile — would you like to upload it? We'll extract experience data automatically.",
    5: "You mentioned a financial model or spreadsheet — would you like to upload it? We'll extract MRR, burn, and runway automatically.",
  }
  return prompts[section] ?? null
}
