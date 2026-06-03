/**
 * GET /api/matching/scores
 *
 * Returns semantic similarity scores for each demo investor vs. the current founder.
 * Used by the matching page to blend with the formula score (sector/stage/Q-Score).
 *
 * Fast path (stored embeddings):
 *   - Uses founder_profiles.iq_summary_embedding (computed at Q-Score submit time)
 *   - Calls match_investors_by_embedding Supabase RPC (pgvector cosine search in DB)
 *   - Single round-trip, O(n) in Postgres — no JS cosine computation
 *
 * Slow path fallback (no stored embeddings):
 *   - Embeds founder profile summary on the fly via Voyage AI
 *   - Fetches investor theses and embeds them in batches (expensive but correct)
 *   - Used until admin runs /api/admin/embed-investors and founder submits Q-Score
 *
 * Returns {} (formula-only) if VOYAGE_API_KEY is missing.
 */

import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { getAdminClient } from '@/lib/supabase/server'
import { embedText, embedBatch } from '@/features/qscore/scoring/embeddings/embedder'

const BATCH_SIZE = 20

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function GET() {
  if (!process.env.VOYAGE_API_KEY) {
    return NextResponse.json({ scores: {} })
  }

  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const supabase = await getAdminClient()

    // ── Fast path: use stored founder embedding + pgvector RPC ───────────────
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('iq_summary_embedding, company_name, product_description, problem_statement, industry, stage, target_customer')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ scores: {} })

    if (profile.iq_summary_embedding) {
      // Parse the stored embedding (stored as JSON string)
      let founderVec: number[]
      try {
        founderVec = typeof profile.iq_summary_embedding === 'string'
          ? JSON.parse(profile.iq_summary_embedding)
          : profile.iq_summary_embedding
      } catch {
        founderVec = []
      }

      if (founderVec.length > 0) {
        const { data: matches } = await supabase.rpc('match_investors_by_embedding', {
          founder_embedding: JSON.stringify(founderVec),
          match_threshold:   0.20,   // low threshold — return all investors, let frontend blend
          match_count:       100,
        })

        if (matches && matches.length > 0) {
          const scores: Record<string, number> = {}
          for (const m of matches as Array<{ id: string; similarity: number }>) {
            // similarity is already cosine in [0,1] from the RPC
            scores[m.id] = Math.max(0, m.similarity)
          }
          return NextResponse.json({ scores, source: 'stored_embedding' })
        }
      }
    }

    // ── Slow path fallback: embed on-the-fly ─────────────────────────────────
    const founderSummary = [
      profile.company_name        && `Company: ${profile.company_name}`,
      profile.industry            && `Sector: ${profile.industry}`,
      profile.stage               && `Stage: ${profile.stage}`,
      profile.product_description && `Product: ${profile.product_description}`,
      profile.problem_statement   && `Problem: ${profile.problem_statement}`,
      profile.target_customer     && `Customer: ${profile.target_customer}`,
    ].filter(Boolean).join('\n')

    if (founderSummary.trim().length < 20) return NextResponse.json({ scores: {} })

    const founderEmbedding = await embedText(founderSummary)

    // Prefer investors with stored embeddings first (avoids re-embedding their theses)
    const { data: storedInvestors } = await supabase
      .from('demo_investors')
      .select('id, thesis_embedding')
      .eq('is_active', true)
      .not('thesis_embedding', 'is', null)

    if (storedInvestors && storedInvestors.length > 0) {
      const scores: Record<string, number> = {}
      for (const inv of storedInvestors as Array<{ id: string; thesis_embedding: string | number[] }>) {
        try {
          const vec: number[] = typeof inv.thesis_embedding === 'string'
            ? JSON.parse(inv.thesis_embedding)
            : inv.thesis_embedding
          const sim = cosineSimilarity(founderEmbedding, vec)
          scores[inv.id] = Math.max(0, (sim + 1) / 2)
        } catch { /* skip malformed embedding */ }
      }
      return NextResponse.json({ scores, source: 'stored_thesis_embeddings' })
    }

    // Last resort: embed all investor theses live (slow, avoid in production)
    const { data: investors } = await supabase
      .from('demo_investors')
      .select('id, thesis')
      .eq('is_active', true)
      .not('thesis', 'is', null)

    if (!investors || investors.length === 0) return NextResponse.json({ scores: {} })

    const allEmbeddings: number[][] = []
    for (let i = 0; i < investors.length; i += BATCH_SIZE) {
      const batch = investors.slice(i, i + BATCH_SIZE)
      const batchEmbeddings = await embedBatch(batch.map((inv: { id: string; thesis: string | null }) => inv.thesis ?? ''))
      allEmbeddings.push(...batchEmbeddings)
    }

    const scores: Record<string, number> = {}
    for (let i = 0; i < investors.length; i++) {
      const similarity = cosineSimilarity(founderEmbedding, allEmbeddings[i])
      scores[investors[i].id] = Math.max(0, (similarity + 1) / 2)
    }

    return NextResponse.json({ scores, source: 'live_embeddings' })
  } catch (err) {
    console.error('[matching/scores] vector scoring failed:', err)
    return NextResponse.json({ scores: {} })
  }
}
