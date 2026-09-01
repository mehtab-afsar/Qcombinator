/**
 * Evidence-weight math — pure, deterministic, no I/O. The LLM only decides rawScore/citedUrls/
 * directness (semantic judgment); everything here — reliability, recency, corroboration, and the
 * final weighted-sum — is code, so it's auditable and independently testable.
 */

import type { Directness, IndicatorExtraction } from './types'
import { reliabilityForUrl, domainOf } from './reliability'

const DIRECTNESS_SCALE: Record<Directness, number> = {
  direct: 1.00,
  strong_proxy: 0.75,
  indirect_proxy: 0.50,
  speculative: 0.25,
}

const RECENCY_UNDER_6MO = 1.00
const RECENCY_6_TO_18MO = 0.75
const RECENCY_18_TO_36MO = 0.50
const RECENCY_OVER_36MO = 0.25
/** No published date on any cited item — worse than "confirmed recent-ish" but better than
 *  "confirmed stale," since staleness itself is unverified, not confirmed. */
export const UNDATED_RECENCY = 0.40

function recencyForDates(publishedDates: (string | undefined)[]): number {
  const parsed = publishedDates
    .filter((d): d is string => Boolean(d))
    .map(d => new Date(d).getTime())
    .filter(t => !Number.isNaN(t))
  if (parsed.length === 0) return UNDATED_RECENCY

  const mostRecent = Math.max(...parsed)
  const ageMonths = (Date.now() - mostRecent) / (1000 * 60 * 60 * 24 * 30)
  if (ageMonths <= 6) return RECENCY_UNDER_6MO
  if (ageMonths <= 18) return RECENCY_6_TO_18MO
  if (ageMonths <= 36) return RECENCY_18_TO_36MO
  return RECENCY_OVER_36MO
}

function corroborationFor(citedUrls: string[], companyDomain: string): number {
  const distinctDomains = new Set(citedUrls.map(domainOf))
  if (distinctDomains.size >= 2) return 1.00
  const onlyDomain = citedUrls[0]
  const tier = onlyDomain ? reliabilityForUrl(onlyDomain, companyDomain) : 0
  if (tier >= 0.75) return 0.75
  if (tier >= 0.50) return 0.50
  return 0.25
}

export interface EvidenceWeightInput {
  citedUrls: string[]
  directness: Directness
  /** publishedDate per cited URL, same order/length, from the evidence bundle. */
  publishedDates: (string | undefined)[]
  companyDomain: string
}

export interface EvidenceWeightResult {
  reliability: number
  directness: number
  recency: number
  corroboration: number
  evidenceWeight: number
}

export function computeEvidenceWeight(input: EvidenceWeightInput): EvidenceWeightResult {
  const reliability = input.citedUrls.length > 0
    ? input.citedUrls.reduce((sum, u) => sum + reliabilityForUrl(u, input.companyDomain), 0) / input.citedUrls.length
    : 0
  const directness = DIRECTNESS_SCALE[input.directness]
  const recency = recencyForDates(input.publishedDates)
  const corroboration = corroborationFor(input.citedUrls, input.companyDomain)

  const evidenceWeight = 0.40 * reliability + 0.30 * directness + 0.20 * recency + 0.10 * corroboration

  return { reliability, directness, recency, corroboration, evidenceWeight }
}

/** Convenience: null-safe wrapper for a full IndicatorExtraction — returns null fields when
 *  rawScore is null (no evidence, nothing to weight). */
export function computeEvidenceWeightForExtraction(
  extraction: IndicatorExtraction,
  publishedDateByUrl: Map<string, string | undefined>,
  companyDomain: string,
): EvidenceWeightResult | null {
  if (extraction.rawScore === null || extraction.directness === null) return null
  return computeEvidenceWeight({
    citedUrls: extraction.citedUrls,
    directness: extraction.directness,
    publishedDates: extraction.citedUrls.map(u => publishedDateByUrl.get(u)),
    companyDomain,
  })
}
