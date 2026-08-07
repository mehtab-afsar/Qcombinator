import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchFundingFeed, type RssFundingItem } from '@/lib/techcrunch-rss'
import { composeAdhocPrompt } from '@/lib/prompts/compose'
import { routedText } from '@/lib/llm/router'
import { log } from '@/lib/logger'

// GET /api/cron/ingest-market-signals
// Runs every 6 hours via Vercel cron (see vercel.json) — RAG Phase 3.
// Fetches the TechCrunch venture-news RSS feed, classifies each unseen item (funding /
// acquisition / other) via a cheap LLM call, extracts structured facts for real funding items,
// and stores every classified item so a non-funding item is never re-fetched-and-re-classified
// on a future tick (see the migration's comment for why "store everything" matters here).
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const SOURCE = 'techcrunch_rss'

  const items = await fetchFundingFeed()
  if (!items || items.length === 0) {
    return NextResponse.json({ fetched: 0, new: 0, stored: 0, skipped: 0 })
  }

  const guids = items.map(i => i.guid)
  const { data: existing } = await admin
    .from('market_funding_signals')
    .select('external_id')
    .eq('source', SOURCE)
    .in('external_id', guids)

  const seenGuids = new Set((existing ?? []).map(r => r.external_id as string))
  const unseen = items.filter(i => !seenGuids.has(i.guid))

  let skipped = 0
  const rows = (
    await Promise.all(unseen.map(item => classifyAndExtract(item).catch(err => {
      log.warn('[ingest-market-signals] extraction failed for one item (non-blocking)', { guid: item.guid, err })
      skipped++
      return null
    })))
  ).filter((row): row is NonNullable<typeof row> => row !== null)

  let stored = 0
  if (rows.length > 0) {
    const { error, count } = await admin
      .from('market_funding_signals')
      .upsert(rows, { onConflict: 'source,external_id', ignoreDuplicates: true, count: 'exact' })
    if (error) {
      log.error('[ingest-market-signals] upsert failed', { error })
    } else {
      stored = count ?? rows.length
    }
  }

  return NextResponse.json({ fetched: items.length, new: unseen.length, stored, skipped })
}

interface ExtractedFacts {
  eventType: 'funding' | 'acquisition' | 'other'
  companyName: string | null
  sector: string | null
  stage: string | null
  roundAmount: string | null
  investors: string[]
  summary: string | null
}

const INSTRUCTIONS = `You are extracting structured facts from one TechCrunch article about the startup/venture industry. The title and an excerpt are provided as DATA below.

Step 1 — classify eventType as exactly one of:
- "funding": primarily about ONE specific company raising a funding round or receiving an investment.
- "acquisition": primarily about one company acquiring, or being acquired by, another.
- "other": anything else — commentary, opinion, analysis, event announcements, advice pieces, personnel moves, or industry trends not tied to one company's raise.

Step 2 — ONLY if eventType is "funding", also extract:
- companyName: the company that raised money, exact name as written
- sector: the company's industry/vertical in plain English, inferred from context — do not copy a category/tag verbatim
- stage: funding stage if stated (e.g. "seed", "Series A"), else null
- roundAmount: amount exactly as reported (e.g. "$5M", "$250 million") — never convert, round, or recompute a number that wasn't stated
- investors: array of named investors/firms mentioned as participating, [] if none named
- summary: one factual sentence (<=200 chars), no speculation, no adjectives not in the source

If eventType is "acquisition" or "other", set companyName/sector/stage/roundAmount/summary to null and investors to []. Never fabricate funding details for a non-funding item.

Respond with ONLY one JSON object, no prose, no markdown fences, shaped exactly like:
{"eventType":"funding"|"acquisition"|"other","companyName":string|null,"sector":string|null,"stage":string|null,"roundAmount":string|null,"investors":string[],"summary":string|null}`

/**
 * Regex-extract-braces + JSON.parse + minimal shape check — same convention as
 * app/api/profile-builder/upload/route.ts's LLM-JSON handling (no Zod precedent exists in this
 * repo for LLM output). Returns null on any malformed/truncated/unparseable response rather
 * than throwing, so the caller can skip-and-retry-next-tick instead of crashing the whole batch.
 * Pure and exported specifically so this — the one genuinely risky part of the pipeline,
 * untrusted external text run through an LLM — is unit-testable without mocking the LLM call.
 */
export function parseExtractionResponse(raw: string): ExtractedFacts | null {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const facts = JSON.parse(match[0]) as Partial<ExtractedFacts>
    if (facts.eventType !== 'funding' && facts.eventType !== 'acquisition' && facts.eventType !== 'other') {
      return null
    }
    return {
      eventType: facts.eventType,
      companyName: facts.companyName ?? null,
      sector: facts.sector ?? null,
      stage: facts.stage ?? null,
      roundAmount: facts.roundAmount ?? null,
      investors: Array.isArray(facts.investors) ? facts.investors : [],
      summary: facts.summary ?? null,
    }
  } catch {
    return null
  }
}

async function classifyAndExtract(item: RssFundingItem) {
  const raw = await routedText('extraction', composeAdhocPrompt({
    sourceRef: `cron/ingest-market-signals:${item.guid}`,
    instructions: INSTRUCTIONS,
    data: `${item.title}\n\n${item.description}`,
  }), { maxTokens: 500 })

  const facts = parseExtractionResponse(raw)
  if (!facts) throw new Error('Unparseable extraction response')

  return {
    source: 'techcrunch_rss',
    external_id: item.guid,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    source_url: item.link,
    event_type: facts.eventType,
    company_name: facts.companyName,
    sector: facts.sector,
    stage: facts.stage,
    round_amount: facts.roundAmount,
    investors: facts.investors ?? [],
    summary: facts.summary,
    raw_title: item.title,
  }
}
