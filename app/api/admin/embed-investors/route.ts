/**
 * POST /api/admin/embed-investors
 *
 * One-time (and idempotent) admin operation: embeds every active demo_investor's
 * thesis text using Voyage AI and stores the result in demo_investors.thesis_embedding.
 *
 * Only processes investors whose thesis_embedding is NULL, so it is safe to call
 * multiple times — already-embedded rows are skipped.
 *
 * Auth: requires Authorization: Bearer <CRON_SECRET> header.
 * Run once after deploying migration 20260603000001_document_rag_investor_embeddings.sql.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { embedBatch } from '@/features/qscore/scoring/embeddings/embedder'
import { log } from '@/lib/logger'

const BATCH_SIZE = 20

export async function POST(request: NextRequest) {
  // Gate behind CRON_SECRET so this can't be called by random users
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('Authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.VOYAGE_API_KEY) {
    return NextResponse.json({ error: 'VOYAGE_API_KEY not configured' }, { status: 500 })
  }

  try {
    const supabase = getAdminClient()

    // Fetch investors that have thesis text but no embedding yet
    const { data: investors, error } = await supabase
      .from('demo_investors')
      .select('id, thesis')
      .eq('is_active', true)
      .not('thesis', 'is', null)
      .is('thesis_embedding', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!investors || investors.length === 0) {
      return NextResponse.json({ message: 'All investors already embedded', processed: 0 })
    }

    let processed = 0
    let failed = 0

    // Process in batches of 20 (Voyage API limit)
    for (let i = 0; i < investors.length; i += BATCH_SIZE) {
      const batch = investors.slice(i, i + BATCH_SIZE)
      try {
        const embeddings = await embedBatch(batch.map((inv: { id: string; thesis: string | null }) => inv.thesis ?? ''))

        // Upsert each investor's embedding
        const updates = batch.map((inv: { id: string; thesis: string | null }, j: number) => ({
          id: inv.id,
          thesis_embedding: JSON.stringify(embeddings[j]),
        }))

        for (const update of updates) {
          const { error: updateErr } = await supabase
            .from('demo_investors')
            .update({ thesis_embedding: update.thesis_embedding })
            .eq('id', update.id)
          if (updateErr) { failed++; continue }
          processed++
        }
      } catch (batchErr) {
        log.error('[embed-investors] batch failed', { offset: i, err: batchErr })
        failed += batch.length
      }
    }

    return NextResponse.json({ message: 'Done', processed, failed, total: investors.length })
  } catch (err) {
    log.error('[embed-investors] unexpected error', { err })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
