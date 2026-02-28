import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenRouter } from '@/lib/openrouter';

/**
 * GET /api/qscore/actions
 *
 * Returns 5 personalized "What gets me to 80?" action items for the authed founder.
 * - First call: generates via LLM using their score breakdown + assessment data, then caches.
 * - Subsequent calls: returns cached result from qscore_history.ai_actions.
 */

const DIMENSION_AGENTS: Record<string, { agentId: string; agentName: string; label: string }> = {
  market:     { agentId: 'atlas',  agentName: 'Atlas',  label: 'Market' },
  product:    { agentId: 'nova',   agentName: 'Nova',   label: 'Product' },
  goToMarket: { agentId: 'patel',  agentName: 'Patel',  label: 'Go-to-Market' },
  financial:  { agentId: 'felix',  agentName: 'Felix',  label: 'Financial' },
  team:       { agentId: 'harper', agentName: 'Harper', label: 'Team' },
  traction:   { agentId: 'susi',   agentName: 'Susi',   label: 'Traction' },
};


export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch latest score row (includes cached ai_actions)
    const { data: latest, error: scoreError } = await supabase
      .from('qscore_history')
      .select('id, ai_actions, overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, assessment_id')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (scoreError || !latest) {
      return NextResponse.json({ actions: [] });
    }

    // Return cached actions if they exist
    if (Array.isArray(latest.ai_actions) && latest.ai_actions.length > 0) {
      return NextResponse.json({ actions: latest.ai_actions });
    }

    // ── Generate personalized actions via LLM ──────────────────────────────────
    const scores: Record<string, number> = {
      market:     latest.market_score    ?? 0,
      product:    latest.product_score   ?? 0,
      goToMarket: latest.gtm_score       ?? 0,
      financial:  latest.financial_score ?? 0,
      team:       latest.team_score      ?? 0,
      traction:   latest.traction_score  ?? 0,
    };

    // Sorted worst → best
    const sortedDims = Object.entries(scores)
      .sort((a, b) => a[1] - b[1])
      .map(([dim, score]) => `${DIMENSION_AGENTS[dim]?.label ?? dim}: ${score}/100`)
      .join(', ');

    // Fetch assessment data for personalisation
    let assessmentContext = '';
    if (latest.assessment_id) {
      const { data: assessment } = await supabase
        .from('qscore_assessments')
        .select('assessment_data')
        .eq('id', latest.assessment_id)
        .single();

      if (assessment?.assessment_data) {
        const snippet = JSON.stringify(assessment.assessment_data).slice(0, 3000);
        assessmentContext = `\n\nFounder's assessment responses (use these for specificity):\n${snippet}`;
      }
    }

    const systemPrompt = `You are a top-tier startup advisor. Generate exactly 5 highly specific, personalized action items to help this founder improve their Q-Score toward 80.

Current Q-Score: ${latest.overall_score}/100
Dimension Scores (worst → best): ${sortedDims}
${assessmentContext}

Rules:
- Each action must be SPECIFIC to this founder's actual product, market, and situation
- Reference things they mentioned (product name, customers, competitors, metrics) wherever possible
- Target their lowest-scoring dimensions first
- Each action must be achievable in 1–4 weeks
- Actions must be concrete steps, NOT generic advice like "define your ICP"
- The "impact" field should reflect the estimated score improvement for that dimension
- The "starterPrompt" must be a ready-to-send first message to the agent that: (a) greets the agent by name, (b) states exactly what the founder wants to build based on their specific context, (c) includes 1-2 key details from their assessment (product name, market, stage, biggest weakness). Max 3 sentences. This is what the founder will actually send to start the agent conversation.

Return a JSON array of exactly 5 objects:
[
  {
    "title": "Short action title (max 8 words)",
    "description": "2-3 sentences: what to do and why it specifically helps this founder",
    "dimension": "one of: market, product, goToMarket, financial, team, traction",
    "impact": "+X points",
    "agentId": "one of: atlas, nova, patel, felix, harper, susi",
    "agentName": "one of: Atlas, Nova, Patel, Felix, Harper, Susi",
    "timeframe": "e.g. '1 week' or '2 weeks'",
    "starterPrompt": "A ready-to-send opening message for the agent that's specific to this founder's situation"
  }
]

Return ONLY valid JSON. No markdown, no explanation.`;

    const raw = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the 5 personalized actions now.' },
    ], { maxTokens: 1600, temperature: 0.5 });

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let actions: unknown[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        actions = parsed.slice(0, 5);
      }
    } catch {
      return NextResponse.json({ actions: [] });
    }

    // Cache to DB
    if (actions.length > 0) {
      await supabase
        .from('qscore_history')
        .update({ ai_actions: actions })
        .eq('id', latest.id);
    }

    return NextResponse.json({ actions });

  } catch (error) {
    console.error('Q-Score actions error:', error);
    return NextResponse.json({ actions: [] });
  }
}

/**
 * POST /api/qscore/actions
 * Clears cached actions and regenerates fresh ones.
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Clear cached actions on latest score row
    const { data: latest } = await supabase
      .from('qscore_history')
      .select('id')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (latest?.id) {
      await supabase
        .from('qscore_history')
        .update({ ai_actions: null })
        .eq('id', latest.id);
    }

    // Delegate to GET for fresh generation
    return GET(_request);
  } catch (error) {
    console.error('Q-Score actions regenerate error:', error);
    return NextResponse.json({ actions: [] });
  }
}
