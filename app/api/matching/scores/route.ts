/**
 * GET /api/matching/scores
 *
 * Returns vector similarity scores for each demo investor relative to the
 * current founder's profile. Used by the matching page to blend formula
 * scores (sector/stage/Q-Score) with semantic thesis similarity.
 *
 * Flow:
 *   1. Load founder profile fields → build a short summary text
 *   2. Embed summary via OpenAI text-embedding-3-small
 *   3. Fetch all active demo_investors with their thesis text
 *   4. Compute cosine similarity in JS (trivial at ~100 investors × 1536 dims)
 *   5. Return { investorId → vectorScore } map (0–1, higher = more relevant)
 *
 * Falls back gracefully: returns {} if OPENAI_API_KEY is missing or embedding
 * fails — the matching page uses formula-only scores in that case.
 */

import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { getAdminClient } from '@/lib/supabase/server'
import { embedText } from '@/features/qscore/scoring/embeddings/embedder'

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
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ scores: {} })
  }

  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const supabase = await getAdminClient()

    // Load founder profile for embedding
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('company_name, product_description, problem_statement, industry, stage, target_customer')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ scores: {} })

    // Build founder summary — semantic signal for thesis matching
    const founderSummary = [
      profile.company_name && `Company: ${profile.company_name}`,
      profile.industry     && `Sector: ${profile.industry}`,
      profile.stage        && `Stage: ${profile.stage}`,
      profile.product_description  && `Product: ${profile.product_description}`,
      profile.problem_statement    && `Problem: ${profile.problem_statement}`,
      profile.target_customer      && `Customer: ${profile.target_customer}`,
    ].filter(Boolean).join('\n')

    if (founderSummary.trim().length < 20) return NextResponse.json({ scores: {} })

    // Embed founder summary
    const founderEmbedding = await embedText(founderSummary)

    // Fetch active investors with thesis text
    const { data: investors } = await supabase
      .from('demo_investors')
      .select('id, thesis')
      .eq('is_active', true)
      .not('thesis', 'is', null)

    if (!investors || investors.length === 0) return NextResponse.json({ scores: {} })

    // Embed all investor theses in one batch — max 20 per batch
    const BATCH = 20
    const allEmbeddings: number[][] = []
    for (let i = 0; i < investors.length; i += BATCH) {
      const batch = investors.slice(i, i + BATCH)
      const { embedBatch } = await import('@/features/qscore/scoring/embeddings/embedder')
      const batchEmbeddings = await embedBatch(batch.map((inv: { id: string; thesis: string | null }) => inv.thesis ?? ''))
      allEmbeddings.push(...batchEmbeddings)
    }

    // Compute cosine similarity for each investor
    const scores: Record<string, number> = {}
    for (let i = 0; i < investors.length; i++) {
      const similarity = cosineSimilarity(founderEmbedding, allEmbeddings[i])
      // Normalize from [-1,1] → [0,1] and apply a floor so non-matches don't go negative
      scores[investors[i].id] = Math.max(0, (similarity + 1) / 2)
    }

    return NextResponse.json({ scores })
  } catch (err) {
    console.error('[matching/scores] vector scoring failed:', err)
    return NextResponse.json({ scores: {} })
  }
}
