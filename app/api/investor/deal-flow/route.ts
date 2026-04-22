import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET /api/investor/deal-flow
// Returns founders with completed onboarding and a Q-Score, sorted by score desc.
// Investors use this to browse the deal flow pipeline.
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()

    // Fetch founders who have completed onboarding
    const { data: founders, error } = await admin
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
      .or('role.is.null,role.neq.investor')
      .not('startup_name', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      log.error('Deal flow fetch error:', error)
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
      // Latest Q-Score per founder — bounded to prevent full table scans at scale.
      // Ordered DESC so the JS dedup map (below) keeps the latest per user.
      admin
        .from('qscore_history')
        .select('user_id, overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, percentile, calculated_at')
        .in('user_id', userIds)
        .order('calculated_at', { ascending: false })
        .limit(userIds.length * 5),   // at most 5 scores per founder; prevents O(N×M) scan
      // Weekly activity — fetch user_ids only and count in JS
      admin
        .from('agent_activity')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', since7d)
        .limit(userIds.length * 20),  // bound: ~20 actions/week per founder is generous
      // Total deliverables — fetch user_ids only and count in JS
      admin
        .from('agent_artifacts')
        .select('user_id')
        .in('user_id', userIds)
        .limit(userIds.length * 50),  // bound: ~50 artifacts per founder
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

        // Map canonical DB stage values to display labels
        const stageLabel: Record<string, string> = {
          idea:         'Idea',
          mvp:          'MVP',
          'pre-seed':   'Pre-Seed',
          seed:         'Seed',
          'series-a':   'Series A',
          bootstrapped: 'Bootstrapped',
          // legacy aliases kept for rows not yet migrated
          launched:     'Seed',
          scaling:      'Series A',
          preseed:      'Pre-Seed',
          'pre_seed':   'Pre-Seed',
          'series_a':   'Series A',
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
          qScore: (() => {
            if (!qrow) return 0;
            const daysSince = Math.floor((Date.now() - new Date(qrow.calculated_at).getTime()) / 86400000);
            const decay = daysSince < 90 ? 1.00 : daysSince < 180 ? 0.975 : daysSince < 270 ? 0.95 : daysSince < 365 ? 0.90 : 0.80;
            return Math.max(1, Math.round(qrow.overall_score * decay));
          })(),
          rawQScore: qrow?.overall_score ?? 0,
          qScoreCalculatedAt: qrow?.calculated_at ?? null,
          qScoreDaysSince: qrow ? Math.floor((Date.now() - new Date(qrow.calculated_at).getTime()) / 86400000) : null,
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
          avatarUrl:        (f as Record<string, unknown>).avatar_url        ?? null,
          companyLogoUrl:   (f as Record<string, unknown>).company_logo_url  ?? null,
          // Composite "hot deal" signal — OR of multiple independent signals
          // so new investors qualify even without 30-day momentum history
          get isHot() {
            const momentum = ((f as Record<string, unknown>).momentum_score as number | null) ?? null
            const stripe   = ((f as Record<string, unknown>).stripe_verified as boolean) ?? false
            const qS       = qrow?.overall_score ?? 0
            return (
              (momentum !== null && momentum >= 4)     // improving Q-Score trajectory
              || (stripe && qS >= 55)                  // Stripe-verified revenue + decent score
              || (agentActionsThisWeek >= 5 && qS >= 60) // highly active + solid score
              || (qS >= 80)                            // top-tier score regardless
            )
          },
        }
      })

    // Fetch investor's AI personalization + custom parameter weights
    const [{ data: investorProfile }, { data: investorWeights }] = await Promise.all([
      admin
        .from('investor_profiles')
        .select('ai_personalization, firm_name, thesis, focus_sectors, focus_stages, portfolio_companies, full_name')
        .eq('user_id', user.id)
        .single(),
      admin
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
      // base match kept for reference; actual match score computed below with custom weights
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

    // Investor preference matching — founders matching investor's sectors/stages surface first
    const prefSectors = ((investorProfile as Record<string, unknown> | null)?.focus_sectors as string[] | null) ?? [];
    const prefStages  = ((investorProfile as Record<string, unknown> | null)?.focus_stages  as string[] | null) ?? [];

    function matchesPrefs(f: (typeof visible)[0]): boolean {
      if (prefSectors.length === 0 && prefStages.length === 0) return true;
      const sectorMatch = prefSectors.length === 0 || prefSectors.some(s =>
        f.sector.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(f.sector.toLowerCase())
      );
      const stageMatch = prefStages.length === 0 || prefStages.some(s =>
        f.stage.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(f.stage.toLowerCase())
      );
      return sectorMatch && stageMatch;
    }

    const visibleWithPrefs = visible.map(f => ({ ...f, matchesPreferences: matchesPrefs(f) }));

    // Sort: preference matches first, then momentum, then match score, then Q-Score, then recency
    visibleWithPrefs.sort((a, b) => {
      if (a.matchesPreferences !== b.matchesPreferences) return a.matchesPreferences ? -1 : 1;
      const mA = (a.momentumScore as number | null) ?? 0;
      const mB = (b.momentumScore as number | null) ?? 0;
      if (mB !== mA) return (mB as number) - (mA as number);
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.qScore !== a.qScore) return b.qScore - a.qScore;
      // Tiebreaker: most recently active first (new founders appear above old inactive ones)
      return new Date(b.lastActive ?? 0).getTime() - new Date(a.lastActive ?? 0).getTime();
    });

    // AI match summaries come from the cached ai_personalization field (matchReason above).
    // Do NOT generate them synchronously here — that blocks the response by 500ms-2s per request.
    // Rationale is generated lazily via POST /api/investor/deal-flow/rationale and cached in DB.
    type FounderWithSummary = (typeof visibleWithPrefs)[0] & { aiMatchSummary: string | null }
    const foundersWithSummary: FounderWithSummary[] = visibleWithPrefs.map(f => ({
      ...f,
      aiMatchSummary: (aiMatches[f.id]?.reason as string | undefined) ?? null,
    }))

    return NextResponse.json({
      founders: foundersWithSummary,
      meta: { totalFounders: withMatch.length, gated: withMatch.length - visibleWithPrefs.length, preferenceFiltered: prefSectors.length > 0 || prefStages.length > 0 },
    })
  } catch (err) {
    log.error('GET /api/investor/deal-flow', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
