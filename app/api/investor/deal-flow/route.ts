import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET /api/investor/deal-flow?page=1&limit=50
// Returns founders sorted by score. Requires investor access (any tier except 'free').
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit

    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()

    // ── Step 1: tier check + founder fetch in parallel ───────────────────────
    const [{ data: tierRow }, { data: founders, error: founderErr }, { count: totalCount }] = await Promise.all([
      admin.from('investor_profiles').select('subscription_tier').eq('user_id', user.id).maybeSingle(),
      admin
        .from('founder_profiles')
        .select(`
          user_id, full_name, startup_name, industry, stage, tagline,
          location, funding, startup_profile_data, updated_at,
          stripe_verified, signal_strength, integrity_index,
          momentum_score, behavioural_score, visibility_gated
        `)
        .neq('role', 'investor')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1),
      admin
        .from('founder_profiles')
        .select('user_id', { count: 'exact', head: true })
        .neq('role', 'investor'),
    ])

    // ── Subscription gate ────────────────────────────────────────────────────
    // Auto-enroll on first access — creates a pro investor profile so the user
    // isn't locked out before going through the full investor onboarding flow.
    if (!tierRow) {
      const email = user.email ?? ''
      const name  = (user.user_metadata?.full_name as string | undefined)
                    ?? (user.user_metadata?.name as string | undefined)
                    ?? email.split('@')[0]
                    ?? 'Investor'
      await admin.from('investor_profiles').upsert(
        { user_id: user.id, full_name: name, email, subscription_tier: 'pro', updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    } else if (tierRow.subscription_tier === 'free') {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })
    }

    if (founderErr) {
      log.error('Deal flow fetch error:', founderErr)
      return NextResponse.json({ error: 'Failed to fetch deal flow' }, { status: 500 })
    }

    if (!founders || founders.length === 0) {
      return NextResponse.json({ founders: [], meta: { totalFounders: 0, gated: 0, preferenceFiltered: false } })
    }

    // Strip test/seed/E2E accounts from deal flow — these have synthetic names injected
    // by the test runner and should never appear to real investors.
    const TEST_NAME_PATTERNS = /platformtest|debug co|gocarin.*test|syncflow|spendiq.*test|nuvora.*test/i
    const filteredFounders = founders.filter(f => {
      const name = (f.startup_name ?? '').toLowerCase()
      return name.length > 0 && !TEST_NAME_PATTERNS.test(name)
    })
    if (filteredFounders.length === 0) {
      return NextResponse.json({ founders: [], meta: { totalFounders: 0, gated: 0, preferenceFiltered: false } })
    }

    const since7d  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const userIds  = filteredFounders.map(f => f.user_id)

    // ── Step 2: all enrichment queries in one parallel batch ─────────────────
    const [
      { data: allQScores },
      { data: allActivity },
      { data: allArtifacts },
      { data: investorProfile },
      { data: investorWeights },
    ] = await Promise.all([
      // RPC returns DISTINCT ON (user_id) — one row per founder, no JS deduplication needed
      admin.rpc('get_latest_qscores', { user_ids: userIds }),
      // Limit to one row per user — we only need a boolean "has recent activity"
      admin
        .from('agent_activity')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', since7d)
        .order('created_at', { ascending: false })
        .limit(userIds.length),
      // Limit to one row per user — we only need a boolean "has any artifact"
      admin
        .from('agent_artifacts')
        .select('user_id')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(userIds.length),
      admin
        .from('investor_profiles')
        .select('ai_personalization, firm_name, thesis, focus_sectors, focus_stages, portfolio_companies, full_name')
        .eq('user_id', user.id)
        .maybeSingle(),
      admin
        .from('investor_parameter_weights')
        .select('weight_p1, weight_p2, weight_p3, weight_p4, weight_p5, weight_p6')
        .eq('investor_user_id', user.id)
        .maybeSingle(),
    ])

    // Build lookup maps (RPC already returns one row per user — no deduplication needed)
    type QScoreRow = { user_id: string; overall_score: number; p1_score: number; p2_score: number; p3_score: number; p4_score: number; p5_score: number; p6_score: number; percentile: number; calculated_at: string }
    const latestQScore = new Map<string, QScoreRow>()
    for (const row of (allQScores ?? []) as QScoreRow[]) {
      latestQScore.set(row.user_id, row)
    }

    const activityCountByUser = new Map<string, number>()
    for (const row of (allActivity ?? []) as { user_id: string }[]) {
      activityCountByUser.set(row.user_id, (activityCountByUser.get(row.user_id) ?? 0) + 1)
    }

    const artifactCountByUser = new Map<string, number>()
    for (const row of (allArtifacts ?? []) as { user_id: string }[]) {
      artifactCountByUser.set(row.user_id, (artifactCountByUser.get(row.user_id) ?? 0) + 1)
    }

    const stageLabel: Record<string, string> = {
      idea: 'Idea', mvp: 'MVP', 'pre-seed': 'Pre-Seed', seed: 'Seed',
      'series-a': 'Series A', bootstrapped: 'Bootstrapped',
      launched: 'Seed', scaling: 'Series A', preseed: 'Pre-Seed',
      'pre_seed': 'Pre-Seed', 'series_a': 'Series A',
    }

    const enriched = filteredFounders.map((f) => {
      const qrow          = latestQScore.get(f.user_id) ?? null
      const weeklyActions = activityCountByUser.get(f.user_id) ?? 0
      const deliverableCount = artifactCountByUser.get(f.user_id) ?? 0
      const sp = (f.startup_profile_data ?? {}) as Record<string, unknown>

      const tagline     = f.tagline || (sp.oneLiner as string) || (sp.problemStatement as string)?.slice(0, 100) || f.industry || ''
      const fundingGoal = (sp.raisingAmount as string) || f.funding || ''
      const highlights: string[] = []
      if (sp.tamSize)       highlights.push(`TAM: ${sp.tamSize as string}`)
      if (sp.businessModel) highlights.push(sp.businessModel as string)
      if (sp.whyNow)        highlights.push((sp.whyNow as string).slice(0, 60))

      return {
        id: f.user_id,
        name: f.startup_name || (sp.companyName as string) || `${f.full_name}'s Startup`,
        tagline,
        qScore: (() => {
          if (!qrow) return 0
          const d = Math.floor((Date.now() - new Date(qrow.calculated_at).getTime()) / 86400000)
          const decay = d < 90 ? 1.00 : d < 180 ? 0.975 : d < 270 ? 0.95 : d < 365 ? 0.90 : 0.80
          return Math.max(1, Math.round(qrow.overall_score * decay))
        })(),
        rawQScore:          qrow?.overall_score ?? 0,
        qScoreCalculatedAt: qrow?.calculated_at ?? null,
        qScoreDaysSince:    qrow ? Math.floor((Date.now() - new Date(qrow.calculated_at).getTime()) / 86400000) : null,
        qScorePercentile:   qrow?.percentile ?? 0,
        stage:    stageLabel[f.stage ?? ''] ?? f.stage ?? 'Unknown',
        sector:   f.industry ?? 'Other',
        location: f.location ?? '',
        fundingGoal,
        teamSize:   sp.teamSize ? Number(sp.teamSize) || null : null,
        highlights,
        lastActive: f.updated_at,
        founder:    { name: f.full_name },
        status:     'new' as const,
        hasScore:   !!qrow,
        agentActionsThisWeek: weeklyActions,
        totalDeliverables:    deliverableCount,
        isActiveFounder:      weeklyActions >= 3,
        stripeVerified:   (f as Record<string, unknown>).stripe_verified   ?? false,
        signalStrength:   (f as Record<string, unknown>).signal_strength   ?? null,
        integrityIndex:   (f as Record<string, unknown>).integrity_index   ?? null,
        momentumScore:    (f as Record<string, unknown>).momentum_score    ?? null,
        behaviouralScore: (f as Record<string, unknown>).behavioural_score ?? null,
        visibilityGated:  (f as Record<string, unknown>).visibility_gated  ?? false,
        avatarUrl:        (f as Record<string, unknown>).avatar_url        ?? null,
        companyLogoUrl:   (f as Record<string, unknown>).company_logo_url  ?? null,
        get isHot() {
          const momentum = ((f as Record<string, unknown>).momentum_score as number | null) ?? null
          const stripe   = ((f as Record<string, unknown>).stripe_verified as boolean) ?? false
          const qS       = qrow?.overall_score ?? 0
          return (momentum !== null && momentum >= 4) || (stripe && qS >= 55) || (weeklyActions >= 5 && qS >= 60) || (qS >= 80)
        },
      }
    })

    const aiMatches = (investorProfile?.ai_personalization as { matches?: Record<string, { score: number; reason: string }> } | null)?.matches ?? {}
    type WeightRow = { weight_p1: number; weight_p2: number; weight_p3: number; weight_p4: number; weight_p5: number; weight_p6: number } | null
    const iw = investorWeights as WeightRow

    const withMatch = enriched.map(f => {
      const qrow = latestQScore.get(f.id)
      let weightedQScore = f.qScore
      if (iw && qrow) {
        const total = (iw.weight_p1 ?? 0) + (iw.weight_p2 ?? 0) + (iw.weight_p3 ?? 0) + (iw.weight_p4 ?? 0) + (iw.weight_p5 ?? 0) + (iw.weight_p6 ?? 0)
        if (total > 0) {
          weightedQScore = Math.round(
            (qrow.p1_score * (iw.weight_p1 ?? 0) + qrow.p2_score * (iw.weight_p2 ?? 0) +
             qrow.p3_score * (iw.weight_p3 ?? 0) + qrow.p4_score * (iw.weight_p4 ?? 0) +
             qrow.p5_score * (iw.weight_p5 ?? 0) + qrow.p6_score * (iw.weight_p6 ?? 0)) / total
          )
        }
      }
      return {
        ...f,
        weightedQScore,
        matchScore:  aiMatches[f.id]?.score ?? Math.round(50 + (weightedQScore / 100) * 40),
        matchReason: aiMatches[f.id]?.reason ?? null,
      }
    })

    const visible = withMatch.filter(f => !f.visibilityGated)

    const prefSectors = ((investorProfile as Record<string, unknown> | null)?.focus_sectors as string[] | null) ?? []
    const prefStages  = ((investorProfile as Record<string, unknown> | null)?.focus_stages  as string[] | null) ?? []

    function matchesPrefs(f: (typeof visible)[0]): boolean {
      if (prefSectors.length === 0 && prefStages.length === 0) return true
      const sectorMatch = prefSectors.length === 0 || prefSectors.some(s => f.sector.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(f.sector.toLowerCase()))
      const stageMatch  = prefStages.length  === 0 || prefStages.some(s => f.stage.toLowerCase().includes(s.toLowerCase())  || s.toLowerCase().includes(f.stage.toLowerCase()))
      return sectorMatch && stageMatch
    }

    const visibleWithPrefs = visible.map(f => ({ ...f, matchesPreferences: matchesPrefs(f) }))

    visibleWithPrefs.sort((a, b) => {
      if (a.matchesPreferences !== b.matchesPreferences) return a.matchesPreferences ? -1 : 1
      const mA = (a.momentumScore as number | null) ?? 0
      const mB = (b.momentumScore as number | null) ?? 0
      if (mB !== mA) return (mB as number) - (mA as number)
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
      if (b.qScore !== a.qScore) return b.qScore - a.qScore
      return new Date(b.lastActive ?? 0).getTime() - new Date(a.lastActive ?? 0).getTime()
    })

    type FounderWithSummary = (typeof visibleWithPrefs)[0] & { aiMatchSummary: string | null }
    const foundersWithSummary: FounderWithSummary[] = visibleWithPrefs.map(f => ({
      ...f,
      aiMatchSummary: (aiMatches[f.id]?.reason as string | undefined) ?? null,
    }))

    const totalPages = Math.ceil((totalCount ?? 0) / limit)
    return NextResponse.json(
      { founders: foundersWithSummary, meta: { totalFounders: withMatch.length, gated: withMatch.length - visibleWithPrefs.length, preferenceFiltered: prefSectors.length > 0 || prefStages.length > 0, pagination: { page, limit, totalCount: totalCount ?? 0, totalPages, hasNextPage: page < totalPages } } },
      { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' } },
    )
  } catch (err) {
    log.error('GET /api/investor/deal-flow', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
