/**
 * TechCrunch venture-news RSS — the source for market_funding_signals (RAG Phase 3).
 * All fetches of this feed go through here — circuit breaker included.
 *
 * The original target URL (fundings-exits/feed/) 404s as of 2026-08-07 — TechCrunch
 * restructured their site. This is the verified-live replacement: same domain, same terms
 * (free, full-text, no paywall — attribution/link-back required only if content is ever
 * DISPLAYED, not for internal fact-extraction), but noisier — alongside "Company X raises $Y"
 * posts it carries commentary, podcasts, and event pieces. That's why the ingest route
 * classifies every item before trusting it (see app/api/cron/ingest-market-signals/route.ts) —
 * this isn't a hypothetical edge case, it's most of a day's real feed content.
 *
 * Parsing is hand-rolled, not a library — deliberately, matching CLAUDE.md's "keep dependencies
 * minimal." Verified against the real, live feed (not assumed): every item's title/description
 * may or may not be CDATA-wrapped, <guid> always carries an isPermaLink attribute, and the only
 * HTML entities WordPress actually emits here are the 5 XML-predefined ones plus numeric
 * decimal/hex references (&#8217; for a right single quote, &#038; for &, etc.) — no large
 * named-entity table is needed. <category> tags mix genuine topics with company names in one
 * flat list (e.g. "Transportation", "Venture", "Moove" as siblings) — don't be tempted to read
 * sector off them; the LLM extraction step infers sector from title/description text instead.
 */

import { withCircuitBreaker } from '@/lib/circuit-breaker'
import { log } from '@/lib/logger'

export const TECHCRUNCH_FUNDING_FEED_URL = 'https://techcrunch.com/category/venture/feed/'

export interface RssFundingItem {
  title: string
  link: string
  guid: string
  pubDate: string | null
  description: string
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // &#160; decodes to a real non-breaking space (U+00A0) — WordPress uses it constantly for
    // line-wrap control. Visually identical to a normal space but a different character, which
    // is exactly the kind of invisible landmine to normalize before this text reaches an LLM
    // prompt or gets string-matched anywhere downstream.
    .replace(/ /g, ' ')
}

function extractTag(itemXml: string, tag: string): string | null {
  // Attribute-tolerant — techcrunch's <guid isPermaLink="false"> needs this; a bare
  // `<tag>...</tag>` regex would silently never match it.
  const m = itemXml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`))
  if (!m) return null
  const inner = m[1].trim()
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  return decodeEntities((cdata ? cdata[1] : inner).trim())
}

/** Parses RSS 2.0 <item> blocks into the fields this feature needs. Skips (never throws on) a
 * malformed item — same graceful-degrade convention the LLM-extraction code elsewhere in this
 * repo already uses for untrusted external text. */
export function parseRssItems(xml: string): RssFundingItem[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1])
  const out: RssFundingItem[] = []
  for (const raw of items) {
    try {
      const title = extractTag(raw, 'title')
      const link = extractTag(raw, 'link')
      const guid = extractTag(raw, 'guid')
      if (!title || !link || !guid) continue
      out.push({
        title,
        link,
        guid,
        pubDate: extractTag(raw, 'pubDate'),
        description: extractTag(raw, 'description') ?? '',
      })
    } catch {
      continue
    }
  }
  return out
}

/** Fetches and parses the feed. Returns null on a network failure, timeout, or open circuit —
 * never throws to the caller (matches lib/tavily.ts's shape). */
export async function fetchFundingFeed(): Promise<RssFundingItem[] | null> {
  return withCircuitBreaker(
    'techcrunch_rss',
    async () => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15_000)
      let response: Response
      try {
        response = await fetch(TECHCRUNCH_FUNDING_FEED_URL, {
          signal: controller.signal,
          headers: { 'User-Agent': 'EdgeAlphaBot/1.0 (+https://edgealpha.vc)' },
        })
      } finally {
        clearTimeout(timer)
      }

      if (!response.ok) {
        // This feed already died once (the original URL 404s as of 2026-08-07) — a repeat
        // needs to be visible in error monitoring, not just quietly degrade forever.
        log.error(`[techcrunch-rss] feed fetch failed: ${response.status} ${response.statusText}`)
        throw new Error(`TechCrunch feed ${response.status}: ${response.statusText}`)
      }

      const xml = await response.text()
      return parseRssItems(xml)
    },
    null,
  )
}
