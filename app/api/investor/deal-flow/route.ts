import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/investor/deal-flow
// Returns founders with completed onboarding and a Q-Score, sorted by score desc.
// Investors use this to browse the deal flow pipeline.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch founders who have completed onboarding
    const { data: founders, error } = await supabase
      .from('founder_profiles')
      .select(`
        user_id,
        full_name,
        startup_name,
        industry,
        stage,
        tagline,
        location,
        funding,
        startup_profile_data,
        updated_at,
        stripe_verified,
        signal_strength,
        integrity_index,
        momentum_score,
        behavioural_score,
        visibility_gated
      `)
      .eq('onboarding_completed', true)
      .eq('role', 'founder')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Deal flow fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch deal flow' }, { status: 500 })
    }

    if (!founders || founders.length === 0) {
      return NextResponse.json({ founders: [] })
    }

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const userIds = founders.map(f => f.user_id)

    // ── 3 batch queries instead of N×3 per-founder queries ────────────────
    const [
      { data: allQScores },
      { data: allActivity },
      { data: allArtifacts },
    ] = await Promise.all([
      // Latest Q-Score per founder — fetch all, pick latest in JS
      supabase
        .from('qscore_history')
        .select('user_id, overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, percentile, calculated_at')
        .in('user_id', userIds)
        .order('calculated_at', { ascending: false }),
      // Weekly activity — fetch user_ids only and count in JS
      supabase
        .from('agent_activity')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', since7d),
      // Total deliverables — fetch user_ids only and count in JS
      supabase
        .from('agent_artifacts')
        .select('user_id')
        .in('user_id', userIds),
    ])

    // Build lookup maps from batched results
    type QScoreRow = { user_id: string; overall_score: number; market_score: number; product_score: number; gtm_score: number; financial_score: number; team_score: number; traction_score: number; percentile: number; calculated_at: string }
    const latestQScore = new Map<string, QScoreRow>()
    for (const row of (allQScores ?? []) as QScoreRow[]) {
      if (!latestQScore.has(row.user_id)) latestQScore.set(row.user_id, row)
    }

    const activityCountByUser = new Map<string, number>()
    for (const row of (allActivity ?? []) as { user_id: string }[]) {
      activityCountByUser.set(row.user_id, (activityCountByUser.get(row.user_id) ?? 0) + 1)
    }

    const artifactCountByUser = new Map<string, number>()
    for (const row of (allArtifacts ?? []) as { user_id: string }[]) {
      artifactCountByUser.set(row.user_id, (artifactCountByUser.get(row.user_id) ?? 0) + 1)
    }

    const enriched = founders.map((f) => {
        const qrow = latestQScore.get(f.user_id) ?? null
        const weeklyActions = activityCountByUser.get(f.user_id) ?? 0
        const deliverableCount = artifactCountByUser.get(f.user_id) ?? 0

        // Map DB stage values to display labels
        const stageLabel: Record<string, string> = {
          idea: 'Idea', mvp: 'MVP', launched: 'Seed', scaling: 'Series A',
          'pre-seed': 'Pre-Seed', seed: 'Seed', 'series-a': 'Series A', bootstrapped: 'Bootstrapped',
        }

        // Pull richer data from startup_profile_data JSONB
        const sp = (f.startup_profile_data ?? {}) as Record<string, unknown>
        const tagline = f.tagline
          || (sp.oneLiner as string)
          || (sp.problemStatement as string)?.slice(0, 100)
          || f.industry
          || ''
        const fundingGoal = (sp.raisingAmount as string)
          || f.funding
          || ''
        const highlights: string[] = []
        if (sp.tamSize)       highlights.push(`TAM: ${sp.tamSize as string}`)
        if (sp.businessModel) highlights.push(sp.businessModel as string)
        if (sp.whyNow)        highlights.push((sp.whyNow as string).slice(0, 60))

        const agentActionsThisWeek = weeklyActions
        const totalDeliverables    = deliverableCount

        return {
          id: f.user_id,
          name: f.startup_name || (sp.companyName as string) || `${f.full_name}'s Startup`,
          tagline,
          qScore: qrow?.overall_score ?? 0,
          qScorePercentile: qrow?.percentile ?? 0,
          stage: stageLabel[f.stage ?? ''] ?? f.stage ?? 'Unknown',
          sector: f.industry ?? 'Other',
          location: f.location ?? '',
          fundingGoal,
          teamSize: sp.teamSize ? Number(sp.teamSize) || null : null,
          highlights,
          lastActive: f.updated_at,
          founder: { name: f.full_name },
          status: 'new' as const,
          hasScore: !!qrow,
          // Activity signals — visible to investors
          agentActionsThisWeek,
          totalDeliverables,
          isActiveFounder: agentActionsThisWeek >= 3,
          // External verification signals
          stripeVerified:   (f as Record<string, unknown>).stripe_verified   ?? false,
          signalStrength:   (f as Record<string, unknown>).signal_strength   ?? null,
          integrityIndex:   (f as Record<string, unknown>).integrity_index   ?? null,
          momentumScore:    (f as Record<string, unknown>).momentum_score    ?? null,
          behaviouralScore: (f as Record<string, unknown>).behavioural_score ?? null,
          visibilityGated:  (f as Record<string, unknown>).visibility_gated  ?? false,
        }
      })

    // Fetch investor's AI personalization + custom parameter weights
    const [{ data: investorProfile }, { data: investorWeights }] = await Promise.all([
      supabase
        .from('investor_profiles')
        .select('ai_personalization')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('investor_parameter_weights')
        .select('weight_market, weight_product, weight_gtm, weight_financial, weight_team, weight_traction')
        .eq('investor_user_id', user.id)
        .single(),
    ]);

    const aiMatches = (investorProfile?.ai_personalization as { matches?: Record<string, { score: number; reason: string }> } | null)?.matches ?? {}

    type WeightRow = { weight_market: number; weight_product: number; weight_gtm: number; weight_financial: number; weight_team: number; weight_traction: number } | null;
    const iw = investorWeights as WeightRow;

    // Apply personalized match scores + custom weighted Q-Score
    const withMatch = enriched.map(f => {
      const baseMatch = aiMatches[f.id]?.score ?? Math.round(50 + (f.qScore / 100) * 40);
      // If investor has custom weights, recalculate match score using them
      // (uses dimension scores from qscore_history if available via latestQScore map)
      const qrow = latestQScore.get(f.id);
      let weightedQScore = f.qScore;
      if (iw && qrow) {
        const total = iw.weight_market + iw.weight_product + iw.weight_gtm + iw.weight_financial + iw.weight_team + iw.weight_traction;
        if (total > 0) {
          weightedQScore = Math.round(
            (qrow.market_score   * iw.weight_market   +
             qrow.product_score  * iw.weight_product  +
             qrow.gtm_score      * iw.weight_gtm      +
             qrow.financial_score* iw.weight_financial +
             qrow.team_score     * iw.weight_team     +
             qrow.traction_score * iw.weight_traction) / total
          );
        }
      }
      return {
        ...f,
        weightedQScore,
        matchScore: aiMatches[f.id]?.score ?? Math.round(50 + (weightedQScore / 100) * 40),
        matchReason: aiMatches[f.id]?.reason ?? null,
      };
    });

    // Gate visibility: filter out founders below Signal Strength 40
    const visible = withMatch.filter(f => !f.visibilityGated);

    // Sort by momentum first (hot founders first), then match score, then Q-Score
    visible.sort((a, b) => {
      const mA = (a.momentumScore as number | null) ?? 0;
      const mB = (b.momentumScore as number | null) ?? 0;
      if (mB !== mA) return (mB as number) - (mA as number);
      return b.matchScore - a.matchScore || b.qScore - a.qScore;
    });

    return NextResponse.json({
      founders: visible,
      meta: { totalFounders: withMatch.length, gated: withMatch.length - visible.length },
    })
  } catch (err) {
    console.error('Deal flow GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
