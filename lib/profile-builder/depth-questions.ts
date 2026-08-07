/**
 * Profile Builder — Depth Questions
 *
 * Once a section's REQUIRED fields (question-engine.ts's TARGETED_QUESTIONS) are all
 * filled, this drives what used to be an untethered "what else can you tell me" prompt
 * (WHAT_ELSE_PROMPT, deleted — see extraction-prompts.ts) that had no memory of prior
 * questions, wasn't tied to any real field, and never stopped. This is the same pattern
 * as TARGETED_QUESTIONS — a field → question map — just for optional fields the Q-Score
 * scorers (features/qscore/calculators/parameters/p1-p6) read but nothing ever asks
 * about, so each question here genuinely strengthens the score rather than repeating.
 */

import { getNestedValue } from './question-engine'

export const DEPTH_QUESTION_CAP = 4

export const DEPTH_QUESTIONS: Record<number, Record<string, string>> = {
  1: {
    customerList:         'can you name one specific customer, pilot, or company you\'ve spoken with?',
    payingCustomerDetail: 'for anyone who\'s paid or committed — was it upfront, a per-pilot fee, or a verbal price agreement?',
    customerType:         'is this primarily B2B, B2C, or both — who\'s the actual buyer?',
  },
  2: {
    targetCustomers:      'roughly how many companies or people fit your exact target customer profile?',
    lifetimeValue:        'what\'s the estimated lifetime value of a typical customer?',
    'p2.competitorCount': 'roughly how many direct competitors are you tracking?',
  },
  3: {
    'p3.patentDescription': 'if you\'ve filed or plan to file a patent, what specifically does it cover?',
    advantageExplanation:   'in one sentence, what\'s hardest for a competitor to copy about what you\'ve built?',
  },
  4: {
    'p4.teamChurnRecent': 'has anyone on the founding or leadership team left or changed roles recently?',
  },
  5: {
    'financial.averageDealSize': 'what\'s your average deal size or contract value per customer?',
    'financial.cogs':            'roughly what does it cost you, per customer, to deliver your product?',
    costPerAcquisition:          'roughly how much does it cost to acquire one paying customer, across sales and marketing?',
    'p5.socialImpact':           'if relevant — what\'s one concrete impact metric tied to your product?',
  },
}

export function getNextDepthQuestion(
  section: number,
  extractedFields: Record<string, unknown>,
  askedFields: Set<string>,
): { field: string; question: string } | null {
  if (askedFields.size >= DEPTH_QUESTION_CAP) return null
  for (const [field, question] of Object.entries(DEPTH_QUESTIONS[section] ?? {})) {
    if (askedFields.has(field)) continue
    if (getNestedValue(extractedFields, field) != null) continue
    return { field, question }
  }
  return null
}
