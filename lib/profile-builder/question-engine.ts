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

// ── Pitch section questions ───────────────────────────────────────────────────

export const PITCH_SECTION_QUESTION =
  "In 2-3 sentences: what is your company, who is it for, and why does it need to exist now?"

export const PITCH_FOLLOWUP_QUESTION =
  "What changed in the world in the last 2-3 years that makes this possible or urgent?"

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

// ── Stage-adaptive required fields — 70%+ needed to complete ─────────────────

export function getRequiredFields(section: number, stage: string): string[] {
  const lower = stage.toLowerCase()
  // Match actual stage values from onboarding: 'product-development', 'commercial', 'growth-scaling'
  // Legacy values: 'idea', 'pre-product', 'mvp', 'pre-revenue' also supported
  const isPreRevenue = ['idea', 'pre-product', 'mvp', 'pre-revenue', 'product-development', 'commercial'].some(s => lower.includes(s))
  const isGrowth = ['growing', 'scaling', 'growth', 'series', 'growth-scaling'].some(s => lower.includes(s))

  const FIELDS: Record<number, { base: string[]; preRevenueBase?: string[]; revenueOnly?: string[]; growthOnly?: string[] }> = {
    1: {
      // Pre-revenue founders cannot have customerCommitment (LOIs/contracts) — use conversationCount instead
      preRevenueBase: ['conversationCount', 'hasPayingCustomers'],
      base: ['customerCommitment', 'hasPayingCustomers'],
      revenueOnly: ['salesCycleLength', 'hasRetention', 'largestContractUsd'],
    },
    2: {
      base: ['p2.tamDescription', 'p2.marketUrgency', 'p2.valuePool'],
      growthOnly: ['p2.expansionPotential', 'p2.competitorDensityContext'],
    },
    3: {
      // replicationTimeMonths is what the LLM actually extracts from "18-36 months" answers;
      // buildComplexity is a categorical bucket that often stays null even when the question is answered
      base: ['p3.hasPatent', 'p3.replicationTimeMonths', 'p3.knowHowDensity'],
      growthOnly: ['p3.technicalDepth', 'p3.replicationCostUsd'],
    },
    4: {
      base: ['p4.domainYears', 'p4.founderMarketFit'],
      growthOnly: ['p4.priorExits', 'p4.teamCoverage', 'p4.teamCohesionMonths'],
    },
    5: {
      base: ['financial.monthlyBurn', 'financial.runway', 'p5.businessModelAlignment', 'p5.viksitBharatAlignment'],
      revenueOnly: ['financial.mrr'],
      growthOnly: ['p5.climateLeverage', 'p5.revenueImpactLink', 'p5.socialImpact'],
    },
  }

  const def = FIELDS[section]
  if (!def) return []
  // Pre-revenue founders get a relaxed base field set (conversations instead of commitments)
  const baseFields = (isPreRevenue && def.preRevenueBase) ? def.preRevenueBase : def.base
  const fields = [...baseFields]
  if (!isPreRevenue && def.revenueOnly) fields.push(...def.revenueOnly)
  if (isGrowth && def.growthOnly) fields.push(...def.growthOnly)
  return fields
}

export function isSectionComplete(extractedFields: Record<string, unknown>, section: number, stage = 'pre-product'): boolean {
  const required = getRequiredFields(section, stage)
  if (required.length === 0) return false
  let filled = 0
  for (const field of required) {
    const val = getNestedValue(extractedFields, field)
    if (val !== null && val !== undefined) filled++
  }
  return (filled / required.length) >= 0.70
}

// ── Field-type-aware confidence thresholds ────────────────────────────────────
// Numeric fields require higher confidence (0.65) before being treated as present.
// Boolean/categorical fields use the standard 0.45 threshold.

const FIELD_CONFIDENCE_THRESHOLDS: Record<string, number> = {
  // Numeric — moderate threshold (was 0.65, lowered so approximate answers still count)
  'financial.mrr':         0.45,
  'financial.arr':         0.45,
  'financial.monthlyBurn': 0.45,
  'financial.runway':      0.45,
  'financial.grossMargin': 0.45,
  'largestContractUsd':    0.45,
  'p3.replicationCostUsd':   0.45,
  'p3.replicationTimeMonths': 0.45,
  'p4.domainYears':        0.45,
  'p4.teamCohesionMonths': 0.45,
  'conversationCount':     0.45,
  // Boolean / categorical — standard threshold
  'p3.hasPatent':          0.45,
  'p4.founderMarketFit':   0.45,
  'p4.teamCoverage':       0.45,
  'hasPayingCustomers':    0.45,
  'hasRetention':          0.45,
}

function getConfidenceThreshold(field: string): number {
  return FIELD_CONFIDENCE_THRESHOLDS[field] ?? 0.45
}

export function getSectionCompletionPct(
  extractedFields: Record<string, unknown>,
  section: number,
  stage = 'pre-product',
  confidenceMap: Record<string, number> = {}
): number {
  const required = getRequiredFields(section, stage)
  if (required.length === 0) return 0
  let filled = 0
  const hasConfidenceData = Object.keys(confidenceMap).length > 0
  for (const field of required) {
    const val = getNestedValue(extractedFields, field)
    if (val === null || val === undefined) continue
    // Boolean false and numeric 0 are explicit "none" answers — count them regardless of confidence.
    // Only apply confidence gating to positive/string values where low confidence means
    // the LLM was guessing rather than extracting a stated fact.
    // Boolean false is an explicit "none" answer — count it regardless of confidence.
    // Numeric 0 still needs confidence gating (LLMs often default numeric fields to 0).
    const isExplicitNone = val === false
    if (hasConfidenceData && !isExplicitNone) {
      const leafKey = field.includes('.') ? field.split('.').pop()! : field
      // Only gate when the LLM explicitly provided a confidence score for this field.
      // If the key is absent entirely, the LLM didn't flag it as uncertain — let it through.
      const leafPresent = leafKey in confidenceMap
      const fieldPresent = field in confidenceMap
      if (leafPresent || fieldPresent) {
        const conf = leafPresent ? confidenceMap[leafKey] : confidenceMap[field]
        const threshold = getConfidenceThreshold(field)
        if (conf < threshold) continue
      }
    }
    filled++
  }
  return Math.round((filled / required.length) * 100)
}

export function getMissingFields(
  extractedFields: Record<string, unknown>,
  section: number,
  stage = 'pre-product',
  confidenceMap: Record<string, number> = {}
): string[] {
  const required = getRequiredFields(section, stage)
  const hasConf = Object.keys(confidenceMap).length > 0
  return required.filter(field => {
    const val = getNestedValue(extractedFields, field)
    if (val === null || val === undefined) return true
    // Boolean false and numeric 0 are explicit "none" answers — never treat them as missing
    const isExplicitNone = val === false || val === 0
    if (hasConf && !isExplicitNone) {
      const leafKey = field.includes('.') ? field.split('.').pop()! : field
      // Only gate on explicit low-confidence scores; absent keys pass through
      const leafPresent = leafKey in confidenceMap
      const fieldPresent = field in confidenceMap
      if (leafPresent || fieldPresent) {
        const conf = leafPresent ? confidenceMap[leafKey] : confidenceMap[field]
        const threshold = getConfidenceThreshold(field)
        if (conf < threshold) return true
      }
    }
    return false
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

// ── Targeted question map — asked when ONE specific field is missing ──────────
// Each key is a required field path; value is the follow-up question to ask.
const TARGETED_QUESTIONS: Record<string, string> = {
  // Section 1 — Market Validation
  'conversationCount':     'how many customer conversations or discovery calls have you had so far?',
  'hasPayingCustomers':    'have any of those conversations turned into paying customers or pilots?',
  'customerCommitment':    'do you have any signed LOIs, pilots, or contracts — even at a small scale?',
  'salesCycleLength':      'how long does it typically take from first contact to a signed deal?',
  'hasRetention':          'are your early customers coming back or expanding their use?',
  'largestContractUsd':    'what\'s the largest single deal or contract value you\'ve closed so far?',
  // Section 2 — Market & Competition
  'p2.tamDescription':     'how do you size your total addressable market — walk me through the number of potential buyers and what they currently spend on this problem?',
  'p2.marketUrgency':      'what\'s changed in the world in the last 1–2 years that makes this the right moment to build this?',
  'p2.valuePool':          'what do your target customers currently spend to solve this problem — whether on software, headcount, or workarounds?',
  'p2.expansionPotential': 'once you capture your initial market, what adjacent markets or product lines open up?',
  'p2.competitorDensityContext': 'who are the main competitors, and what\'s your key differentiation?',
  // Section 3 — IP & Technology
  'p3.hasPatent':            'have you filed any patents, trade secrets, or applied for regulatory approvals?',
  'p3.replicationTimeMonths':'if a well-funded competitor started building today, how many months would it take them to replicate what you\'ve built?',
  'p3.knowHowDensity':       'what\'s the core expertise or know-how that\'s hardest for a competitor to replicate?',
  'p3.technicalDepth':       'how would you describe the technical complexity — is this a novel algorithm, a proprietary dataset, or deep integrations?',
  'p3.replicationCostUsd':   'roughly how much capital would a competitor need to replicate your technology from scratch?',
  // Section 4 — Team
  'p4.domainYears':          'how many years have you personally worked in this industry or problem space?',
  'p4.founderMarketFit':     'what\'s your personal connection to this problem — why are you the right person to solve it?',
  'p4.priorExits':           'have any of the founders previously started or exited a company?',
  'p4.teamCoverage':         'which key functions — product, engineering, sales, finance — are covered by your core team?',
  'p4.teamCohesionMonths':   'how long have the founding team members worked together?',
  // Section 5 — Financials & Impact
  'financial.mrr':          'what\'s your current monthly recurring revenue?',
  'financial.monthlyBurn':  'what\'s your current monthly cash burn?',
  'financial.runway':       'how many months of runway do you have at your current burn rate?',
  'financial.grossMargin':  'what\'s your gross margin — revenue minus direct cost of delivery?',
  'p5.businessModelAlignment': 'how does your business model work — is it subscription, usage, transaction, or something else?',
  'p5.viksitBharatAlignment':  'how does your product contribute to broader economic or development goals in your market?',
}

export function getTargetedQuestion(section: number, fieldKey: string): string {
  return TARGETED_QUESTIONS[fieldKey]
    ?? TARGETED_QUESTIONS[fieldKey.replace(/^p\d+\./, '')]  // strip prefix fallback
    ?? ''
}

// ── Field display labels for "I found: ..." summaries ────────────────────────
const FIELD_DISPLAY_LABELS: Record<string, string> = {
  'conversationCount':     'customer conversations',
  'hasPayingCustomers':    'paying customers',
  'customerCommitment':    'customer commitments',
  'salesCycleLength':      'sales cycle',
  'largestContractUsd':    'largest contract',
  'p2.tamDescription':     'market size',
  'p2.marketUrgency':      'market urgency',
  'p2.valuePool':          'customer spend on the problem',
  'p2.competitorCount':    'competitor count',
  'p2.competitorDensityContext': 'competitive landscape',
  'p3.hasPatent':          'IP/patents',
  'p3.buildComplexity':    'build complexity',
  'p3.technicalDepth':     'technical depth',
  'p3.knowHowDensity':     'proprietary know-how',
  'p3.replicationCostUsd': 'replication cost',
  'p3.replicationTimeMonths': 'replication time',
  'p4.domainYears':        'domain experience',
  'p4.founderMarketFit':   'founder-market fit',
  'p4.teamCoverage':       'team coverage',
  'p4.priorExits':         'prior exits',
  'p4.teamCohesionMonths': 'team tenure together',
  'financial.mrr':         'MRR',
  'financial.arr':         'ARR',
  'financial.monthlyBurn': 'monthly burn',
  'financial.runway':      'runway',
  'financial.grossMargin': 'gross margin',
  'p5.businessModelAlignment': 'business model',
}

function snippetStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') return v.toLocaleString()
  if (typeof v === 'string') return v.slice(0, 55) + (v.length > 55 ? '…' : '')
  return String(v).slice(0, 55)
}

/**
 * Builds human-readable "I found: X, Y, Z" snippets from extracted fields for a given section.
 * Returns strings like "MRR: $12K" or "market size: $2B healthcare AI market".
 */
export function buildFoundSnippets(extractedFields: Record<string, unknown>, section: number): string[] {
  const SECTION_PICKS: Record<number, string[]> = {
    1: ['conversationCount','hasPayingCustomers','customerCommitment','salesCycleLength','largestContractUsd'],
    2: ['p2.tamDescription','p2.marketUrgency','p2.valuePool','p2.competitorCount','p2.competitorDensityContext'],
    3: ['p3.hasPatent','p3.buildComplexity','p3.technicalDepth','p3.knowHowDensity','p3.replicationCostUsd','p3.replicationTimeMonths'],
    4: ['p4.domainYears','p4.founderMarketFit','p4.teamCoverage','p4.priorExits','p4.teamCohesionMonths'],
    5: ['financial.mrr','financial.arr','financial.monthlyBurn','financial.runway','financial.grossMargin','p5.businessModelAlignment'],
  }
  const picks = SECTION_PICKS[section] ?? []
  const snippets: string[] = []
  for (const fieldPath of picks) {
    const val = getNestedValue(extractedFields, fieldPath)
    if (val === null || val === undefined) continue
    const label = FIELD_DISPLAY_LABELS[fieldPath] ?? fieldPath.split('.').pop()!
    snippets.push(`${label}: ${snippetStr(val)}`)
  }
  return snippets
}

/**
 * Flattens extracted fields into "label: value" display strings for the after-answer message.
 * Only top-level known fields and one level of nesting are included.
 */
export function flattenForDisplay(key: string, value: unknown): string[] {
  if (value === null || value === undefined) return []
  if (typeof value === 'object' && !Array.isArray(value)) {
    const nested = value as Record<string, unknown>
    return Object.entries(nested).flatMap(([k, v]) => flattenForDisplay(`${key}.${k}`, v))
  }
  const label = FIELD_DISPLAY_LABELS[key] ?? FIELD_DISPLAY_LABELS[key.split('.').pop() ?? '']
  if (!label) return []
  const str = snippetStr(value)
  if (!str) return []
  return [`${label}: ${str}`]
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
