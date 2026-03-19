/**
 * Signal Strength + Integrity Index calculators
 *
 * Signal Strength (0–100):
 *   Weighted average of source-confidence multipliers across all measurable indicators.
 *   Stripe fields  = 1.00 weight
 *   Document-backed = 0.85 weight
 *   Self-reported  = 0.55 weight
 *
 * Integrity Index (0–100):
 *   (corroborated claims / total scored claims) × 100
 *   Driven by bluff detection + RAG evidence conflicts + Stripe delta flags
 */

// ── Indicator map ────────────────────────────────────────────────────────────
// Each indicator has a display weight (importance) so a Stripe-connected founder
// who only has financials verified doesn't score 100 when text fields are empty.

interface IndicatorDef {
  key: string
  weight: number // importance within the total (sum = 1.0)
  stripeField: boolean // this specific field can come from Stripe
  assessmentPath: string[] // nested path in assessmentData
}

const INDICATORS: IndicatorDef[] = [
  // Financial — Stripe verifiable
  { key: 'mrr',              weight: 0.15, stripeField: true,  assessmentPath: ['financial', 'mrr'] },
  { key: 'arr',              weight: 0.10, stripeField: true,  assessmentPath: ['financial', 'arr'] },
  { key: 'monthlyBurn',      weight: 0.08, stripeField: true,  assessmentPath: ['financial', 'monthlyBurn'] },
  { key: 'runway',           weight: 0.07, stripeField: false, assessmentPath: ['financial', 'runway'] },

  // Traction — self-reported for now
  { key: 'conversationCount', weight: 0.08, stripeField: false, assessmentPath: ['conversationCount'] },
  { key: 'lifetimeValue',     weight: 0.06, stripeField: false, assessmentPath: ['lifetimeValue'] },
  { key: 'costPerAcquisition',weight: 0.06, stripeField: false, assessmentPath: ['costPerAcquisition'] },

  // Market understanding — qualitative (self-reported)
  { key: 'problemStory',      weight: 0.07, stripeField: false, assessmentPath: ['problemStory'] },
  { key: 'customerQuote',     weight: 0.07, stripeField: false, assessmentPath: ['customerQuote'] },
  { key: 'advantageExplanation', weight: 0.06, stripeField: false, assessmentPath: ['advantageExplanation'] },

  // Team + commitment
  { key: 'teamSize',          weight: 0.05, stripeField: false, assessmentPath: ['teamSize'] },
  { key: 'customerCommitment', weight: 0.08, stripeField: false, assessmentPath: ['customerCommitment'] },
  { key: 'targetCustomers',   weight: 0.07, stripeField: false, assessmentPath: ['targetCustomers'] },
]

const SOURCE_WEIGHT = {
  stripe:        1.00,
  document:      0.85,
  self_reported: 0.55,
  missing:       0.00,
} as const

type SourceKey = keyof typeof SOURCE_WEIGHT

function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj
  for (const key of path) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

function sourceForIndicator(
  indicator: IndicatorDef,
  stripeConnected: boolean
): SourceKey {
  if (indicator.stripeField && stripeConnected) return 'stripe'
  return 'self_reported'
}

/**
 * Calculate Signal Strength (0–100).
 *
 * @param assessmentData  Latest assessmentData from qscore_history or assessment form
 * @param stripeConnected Whether the founder has a verified Stripe connection
 */
export function calculateSignalStrength(
  assessmentData: Record<string, unknown>,
  stripeConnected: boolean
): number {
  let weightedSum = 0
  let totalWeight = 0

  for (const indicator of INDICATORS) {
    const value = getNestedValue(assessmentData, indicator.assessmentPath)
    const hasValue =
      value !== null &&
      value !== undefined &&
      (typeof value === 'number' ? value > 0 : String(value).trim().length > 3)

    if (!hasValue) continue // missing indicators don't drag down — they just don't add

    const source = sourceForIndicator(indicator, stripeConnected)
    weightedSum += indicator.weight * SOURCE_WEIGHT[source]
    totalWeight += indicator.weight
  }

  if (totalWeight === 0) return 0

  // Normalise to 0–100 relative to what the founder actually filled in
  const raw = weightedSum / totalWeight
  return Math.round(raw * 100)
}

/**
 * Calculate Integrity Index (0–100).
 *
 * Simple formula: (corroborated / total_scored) × 100
 * Conflicts = bluff detection flags + RAG evidence conflicts + Stripe delta flags.
 *
 * @param conflictCount  Number of conflict signals detected (bluff + RAG + Stripe delta)
 * @param totalScored    Total claims scored (non-empty answers evaluated)
 */
export function calculateIntegrityIndex(
  conflictCount: number,
  totalScored: number
): number {
  if (totalScored === 0) return 80 // no data → neutral default
  const corroborated = Math.max(0, totalScored - conflictCount)
  return Math.round((corroborated / totalScored) * 100)
}

/**
 * Full Signal + Integrity snapshot — called after any scoring event.
 *
 * @param assessmentData  Raw assessment from qscore_history
 * @param stripeConnected Whether Stripe is verified
 * @param bluffSignalCount Number of active bluff signals
 * @param ragConflictCount Number of RAG evidence conflicts
 * @param stripeDeltaCount Number of Stripe self-report delta flags
 */
export function computeSignalSnapshot(
  assessmentData: Record<string, unknown>,
  stripeConnected: boolean,
  bluffSignalCount: number,
  ragConflictCount: number,
  stripeDeltaCount: number
): { signalStrength: number; integrityIndex: number } {
  const signalStrength = calculateSignalStrength(assessmentData, stripeConnected)

  // Total scored = non-empty text answers (qualitative) + numeric fields present
  let totalScored = 0
  for (const ind of INDICATORS) {
    const value = getNestedValue(assessmentData, ind.assessmentPath)
    const hasValue =
      value !== null &&
      value !== undefined &&
      (typeof value === 'number' ? value > 0 : String(value).trim().length > 3)
    if (hasValue) totalScored++
  }

  const totalConflicts = bluffSignalCount + ragConflictCount + stripeDeltaCount
  const integrityIndex = calculateIntegrityIndex(totalConflicts, totalScored)

  return { signalStrength, integrityIndex }
}
