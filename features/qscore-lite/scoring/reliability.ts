/**
 * Source-reliability tier table — a pure domain lookup. Every domain Tavily might realistically
 * return is covered by exactly one tier; unrecognized domains fall through to the lowest tier.
 *
 * This is what makes "add a real licensed LinkedIn/Crunchbase API later" a one-line change: bump
 * that domain's tier here from 0.25–0.75 up to 1.00. No architecture change needed.
 */

export const RELIABILITY_DIRECT = 1.00       // official registries, patent DBs, GitHub's own API match
export const RELIABILITY_REPUTABLE = 0.75    // Crunchbase/Dealroom/PitchBook, major press
export const RELIABILITY_COMPANY_OWNED = 0.50
export const RELIABILITY_LINKEDIN_COMPANY = 0.50
export const RELIABILITY_LINKEDIN_PERSONAL = 0.25
export const RELIABILITY_UNKNOWN = 0.25       // default fallthrough

const DIRECT_DOMAINS = new Set([
  'patents.google.com', 'uspto.gov', 'sec.gov', 'epo.org', 'wipo.int',
])

const REPUTABLE_DOMAINS = new Set([
  'crunchbase.com', 'dealroom.co', 'pitchbook.com',
  'techcrunch.com', 'forbes.com', 'bloomberg.com', 'wsj.com', 'reuters.com',
  'businessinsider.com', 'axios.com', 'venturebeat.com', 'theinformation.com', 'fortune.com',
])

/** GitHub's own API result (an org/repo match, not a search snippet) — the gather step tags
 *  these with this synthetic pseudo-domain so reliabilityForUrl can give them the direct tier. */
export const GITHUB_API_SOURCE = 'github-api-match'

function hostnameOf(url: string): string | null {
  try {
    let host = new URL(url).hostname.toLowerCase()
    if (host.startsWith('www.')) host = host.slice(4)
    return host
  } catch {
    return null
  }
}

/** Reliability tier for a single cited URL, given the submitted company's own domain (so a
 *  citation from the company's own site is correctly tiered as a company-owned claim). */
export function reliabilityForUrl(url: string, companyDomain: string): number {
  if (url === GITHUB_API_SOURCE) return RELIABILITY_DIRECT

  const host = hostnameOf(url)
  if (!host) return RELIABILITY_UNKNOWN

  if (DIRECT_DOMAINS.has(host)) return RELIABILITY_DIRECT
  if (REPUTABLE_DOMAINS.has(host)) return RELIABILITY_REPUTABLE

  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    return url.includes('/company/') ? RELIABILITY_LINKEDIN_COMPANY : RELIABILITY_LINKEDIN_PERSONAL
  }

  if (host === companyDomain) return RELIABILITY_COMPANY_OWNED

  return RELIABILITY_UNKNOWN
}

/** The distinct-domain identity used for corroboration counting — two URLs on the same host
 *  count as one source, not two. */
export function domainOf(url: string): string {
  if (url === GITHUB_API_SOURCE) return GITHUB_API_SOURCE
  return hostnameOf(url) ?? url
}
