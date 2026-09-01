/**
 * Evidence gathering — 11 Tavily calls (1 discovery + 10 targeted) + 1 GitHub lookup per
 * company, run in parallel. Not 20 (one per indicator) — each targeted query is written broadly
 * enough to feed several related indicators from one result set, keeping cost/latency bounded.
 * Every call already degrades gracefully to null (lib/tavily.ts, evidence/github.ts) — no single
 * failed query blocks the others.
 */

import { tavilySearch, type TavilyResult } from '@/lib/tavily'
import { lookupGithubOrg } from './github'
import { GITHUB_API_SOURCE } from '../scoring/reliability'

export interface EvidenceItem {
  url: string
  domain: string
  title: string
  content: string
  publishedDate?: string
  sourceQuery: string
}

const MAX_RESULTS_PER_QUERY = 5
const MAX_CONTENT_LENGTH = 500

function queryTemplates(company: string, founderName: string | null): { id: string; query: string }[] {
  const who = founderName ?? company
  return [
    { id: 'founder_background', query: `${who} founder background career experience before ${company}` },
    { id: 'funding', query: `${company} funding raised seed Series A investors valuation` },
    { id: 'customers_revenue', query: `${company} customers case study revenue users growth traction` },
    { id: 'press_market', query: `${company} news launch review industry market` },
    { id: 'competitors', query: `${company} vs competitors alternative comparison` },
    { id: 'product_tech', query: `${company} product features platform technology how it works` },
    { id: 'ip_patents', query: `${company} patent trademark proprietary technology intellectual property` },
    { id: 'crunchbase_scoped', query: `site:crunchbase.com ${company}` },
    { id: 'linkedin_scoped', query: `site:linkedin.com ${company}` },
    { id: 'partnerships_hiring', query: `${company} partners integration hiring careers team expansion` },
  ]
}

function truncate(content: string): string {
  return content.length > MAX_CONTENT_LENGTH ? `${content.slice(0, MAX_CONTENT_LENGTH)}…` : content
}

function toEvidenceItems(results: TavilyResult[], sourceQuery: string): EvidenceItem[] {
  return results.map(r => ({
    url: r.url,
    domain: safeHost(r.url),
    title: r.title,
    content: truncate(r.content),
    publishedDate: r.publishedDate,
    sourceQuery,
  }))
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return url
  }
}

export interface EvidenceBundle {
  items: EvidenceItem[]
  githubMatch: Awaited<ReturnType<typeof lookupGithubOrg>>
}

export async function gatherEvidence(companyName: string, domain: string): Promise<EvidenceBundle> {
  const discovery = await tavilySearch(`"${companyName}" founder CEO co-founder`, { maxResults: MAX_RESULTS_PER_QUERY })
  const founderName = extractLikelyFounderName(discovery?.answer ?? null)

  const targeted = queryTemplates(companyName, founderName)
  const [targetedResults, githubMatch] = await Promise.all([
    Promise.all(targeted.map(async t => {
      const res = await tavilySearch(t.query, { maxResults: MAX_RESULTS_PER_QUERY })
      return toEvidenceItems(res?.results ?? [], t.id)
    })),
    lookupGithubOrg(companyName, domain),
  ])

  const items: EvidenceItem[] = [
    ...toEvidenceItems(discovery?.results ?? [], 'discovery'),
    ...targetedResults.flat(),
  ]

  if (githubMatch) {
    items.push({
      url: GITHUB_API_SOURCE,
      domain: GITHUB_API_SOURCE,
      title: `GitHub org: ${githubMatch.login}`,
      content: `${githubMatch.publicRepos} public repos, ${githubMatch.followers} followers, created ${githubMatch.createdAt}, last push ${githubMatch.lastPushedAt ?? 'unknown'}.`,
      publishedDate: githubMatch.lastPushedAt ?? undefined,
      sourceQuery: 'github',
    })
  }

  return { items, githubMatch }
}

/** Tavily's `answer` field is a short synthesized blurb, not structured data — this is a best-
 *  effort heuristic (capitalized name near "founder"/"CEO"), not a reliable extraction. Downstream
 *  queries degrade gracefully to searching by company name alone when this returns null. */
function extractLikelyFounderName(answer: string | null): string | null {
  if (!answer) return null
  const match = answer.match(/([A-Z][a-z]+ [A-Z][a-z]+)(?=[^.]{0,40}\b(founder|CEO|co-founder)\b)/i)
    ?? answer.match(/\b(founder|CEO|co-founder)\b[^.]{0,40}([A-Z][a-z]+ [A-Z][a-z]+)/i)
  if (!match) return null
  return match[1] && /^[A-Z]/.test(match[1]) ? match[1] : match[2] ?? null
}
