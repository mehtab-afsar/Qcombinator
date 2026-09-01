/**
 * Best-effort GitHub org lookup — a direct, high-reliability signal for Technical Depth /
 * Product Velocity when a company's GitHub org is findable, distinct from a Tavily search
 * snippet. Mirrors lib/tavily.ts's shape: graceful null on missing/failed call, circuit-breaker
 * protected, no throw.
 */

import { withCircuitBreaker } from '@/lib/circuit-breaker'
import { log } from '@/lib/logger'

export interface GithubOrgMatch {
  login: string
  publicRepos: number
  followers: number
  createdAt: string
  /** Most recent push across the org's top repos — the closest cheap proxy for "product velocity". */
  lastPushedAt: string | null
}

/** Normalizes a company name into a plausible GitHub org slug guess (lowercase, alnum/hyphen only). */
function slugGuess(companyName: string): string {
  return companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function lookupGithubOrg(companyName: string, domain: string): Promise<GithubOrgMatch | null> {
  const token = process.env.GITHUB_TOKEN
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (token) headers.Authorization = `Bearer ${token}`

  return withCircuitBreaker(
    'github_api',
    async () => {
      const candidates = Array.from(new Set([slugGuess(companyName), slugGuess(domain.split('.')[0] ?? '')]))
        .filter(Boolean)

      for (const candidate of candidates) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8_000)
        const res = await fetch(`https://api.github.com/orgs/${encodeURIComponent(candidate)}`, {
          headers,
          signal: controller.signal,
        })
        clearTimeout(timer)

        if (res.status === 404) continue
        if (!res.ok) throw new Error(`GitHub orgs ${res.status}: ${res.statusText}`)

        const org = await res.json()
        const reposRes = await fetch(
          `https://api.github.com/orgs/${encodeURIComponent(candidate)}/repos?sort=pushed&per_page=1`,
          { headers },
        )
        const repos = reposRes.ok ? await reposRes.json() : []

        return {
          login: org.login,
          publicRepos: org.public_repos ?? 0,
          followers: org.followers ?? 0,
          createdAt: org.created_at,
          lastPushedAt: repos[0]?.pushed_at ?? null,
        } as GithubOrgMatch
      }
      return null
    },
    null,
  ).catch(err => {
    log.warn('[qscore-lite] github org lookup failed', { err: (err as Error)?.message })
    return null
  })
}
