import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { embedText } from '@/features/qscore/rag/embeddings/embedder';

/**
 * POST /api/qscore/validate-claim
 *
 * Real-time claim validation against user's agent artifact embeddings.
 * Auth required: userId comes from session, NOT from request body.
 *
 * Body: { claim: string, dimension?: string, value?: number }
 * Returns: { verdict, evidence[], confidence }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth: userId from session only
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { claim, dimension } = await request.json();

    if (!claim || typeof claim !== 'string') {
      return NextResponse.json(
        { error: 'claim (string) is required' },
        { status: 400 }
      );
    }

    // Check if user has any embeddings
    const { count } = await supabase
      .from('artifact_embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!count || count === 0) {
      return NextResponse.json({
        verdict: 'unverified',
        evidence: [],
        confidence: 0,
        message: 'No agent artifacts found. Build deliverables with your AI advisors to enable evidence verification.',
      });
    }

    // Embed the claim
    const embedding = await embedText(claim);

    // Vector similarity search against user's embeddings only
    const { data: matches, error: searchError } = await supabase
      .rpc('match_artifact_embeddings', {
        query_embedding: `[${embedding.join(',')}]`,
        match_user_id: user.id,
        match_threshold: 0.6,
        match_count: 5,
      });

    if (searchError || !matches || matches.length === 0) {
      return NextResponse.json({
        verdict: 'unverified',
        evidence: [],
        confidence: 0,
        message: 'No matching evidence found in your artifacts.',
      });
    }

    // Analyze matches for corroboration/conflict
    const evidence = matches.map((m: {
      chunk_text: string;
      metadata: Record<string, unknown>;
      similarity: number;
      artifact_id: string;
    }) => ({
      text: m.chunk_text,
      artifactType: m.metadata?.artifactType || 'unknown',
      artifactId: m.artifact_id,
      similarity: Math.round(m.similarity * 100),
    }));

    // Simple verdict based on similarity strength
    const topSimilarity = matches[0].similarity;
    const verdict = topSimilarity > 0.8
      ? 'corroborated'
      : topSimilarity > 0.7
        ? 'likely_corroborated'
        : 'weak_match';

    return NextResponse.json({
      verdict,
      evidence,
      confidence: Math.round(topSimilarity * 100) / 100,
      dimension: dimension || null,
    });
  } catch (error) {
    console.error('[validate-claim] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
