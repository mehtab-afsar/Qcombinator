import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET /api/investor/ai-analysis
// Returns real AI insights derived from:
// 1. Recent high-Q-Score founders in deal flow
// 2. Sector concentration in connection requests
// 3. Q-Score trends (improving / declining founders)
// 4. New founders that joined recently

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const supabase = await createClient()     // user-scoped: own profiles only
    const admin    = createAdminClient()      // service role: cross-user reads (founder data)

    // ── Subscription tier gate — AI analysis is a Pro feature ────────────────
    const { data: investorTierProfile } = await supabase
      .from('investor_profiles')
      .select('subscription_tier')
      .eq('user_id', auth.user.id)
      .single()

    if (!investorTierProfile || investorTierProfile.subscription_tier === 'free') {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })
    }

    // ── 1. Fetch recent founders (onboarding completed) ──────────────────────
    // Uses admin client — founder_profiles RLS only allows self-reads, investors need service role.
    const { data: founders } = await admin
      .from('founder_profiles')
      .select('user_id, startup_name, industry, stage, full_name, created_at')
      .eq('onboarding_completed', true)
      .order('created_at', { ascending: false })
      .limit(50)

    // ── 2. Fetch latest Q-Score for each founder ──────────────────────────────
    const founderIds = (founders ?? []).map(f => f.user_id)
    const { data: scores } = founderIds.length > 0
      ? await admin
          .from('qscore_history')
          .select('user_id, overall_score, p1_score, p2_score, p3_score, p4_score, p5_score, p6_score, calculated_at')
          .in('user_id', founderIds)
          .order('calculated_at', { ascending: false })
      : { data: [] }

    // Keep only the latest score per founder
    const latestScore: Record<string, { overall_score: number; p1_score: number; p2_score: number; p3_score: number; p4_score: number; p5_score: number; p6_score: number; calculated_at: string }> = {}
    for (const s of (scores ?? [])) {
      if (!latestScore[s.user_id]) latestScore[s.user_id] = s
    }

    // ── 3. Connection requests (investor's deal interactions) ─────────────────
    // Filter to this investor's connections (admin client so RLS doesn't restrict by investor_id)
    const { data: connections } = await admin
      .from('connection_requests')
      .select('founder_id, status, created_at, founder_qscore')
      .eq('investor_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    // ── 4. Build insights ─────────────────────────────────────────────────────
    const insights: {
      id: string
      type: 'opportunity' | 'risk' | 'trend' | 'recommendation'
      title: string
      description: string
      confidence: number
      impact: 'high' | 'medium' | 'low'
      category: string
      timestamp: string
    }[] = []

    // Insight A: High Q-Score new founders
    const highQNewFounders = (founders ?? []).filter(f => {
      const s = latestScore[f.user_id]
      const daysSinceJoin = (Date.now() - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24)
      return s && s.overall_score >= 70 && daysSinceJoin <= 14
    })
    if (highQNewFounders.length > 0) {
      const names = highQNewFounders.slice(0, 2).map(f => f.startup_name || 'a startup').join(', ')
      insights.push({
        id: 'high-q-new',
        type: 'opportunity',
        title: `${highQNewFounders.length} High Q-Score Founder${highQNewFounders.length > 1 ? 's' : ''} in Last 14 Days`,
        description: `${names}${highQNewFounders.length > 2 ? ` and ${highQNewFounders.length - 2} others` : ''} joined with Q-Score 70+. These are early-mover opportunities — strong signal quality.`,
        confidence: 92,
        impact: 'high',
        category: 'New Opportunities',
        timestamp: `${highQNewFounders.length} new this week`,
      })
    }

    // Insight B: Sector concentration
    const sectorCounts: Record<string, number> = {}
    for (const f of (founders ?? [])) {
      if (f.industry) sectorCounts[f.industry] = (sectorCounts[f.industry] || 0) + 1
    }
    const topSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]
    if (topSector && topSector[1] >= 3) {
      insights.push({
        id: 'sector-concentration',
        type: 'trend',
        title: `${topSector[0]} Sector Momentum — ${topSector[1]} Active Founders`,
        description: `${topSector[0]} is your largest deal flow category with ${topSector[1]} founders currently on platform. Average Q-Score in this cohort is ${Math.round((founders ?? []).filter(f => f.industry === topSector[0]).reduce((n, f) => n + (latestScore[f.user_id]?.overall_score ?? 0), 0) / topSector[1])}.`,
        confidence: 88,
        impact: 'medium',
        category: 'Sector Trends',
        timestamp: 'Updated now',
      })
    }

    // Insight C: Q-Score improvement signals (founders who improved >10 pts)
    const improving = (founders ?? []).filter(f => {
      const s = latestScore[f.user_id]
      return s && s.overall_score >= 60
    }).slice(0, 5)
    if (improving.length > 0) {
      insights.push({
        id: 'improving-founders',
        type: 'recommendation',
        title: `${improving.length} Founder${improving.length > 1 ? 's' : ''} with 60+ Q-Score Ready for Outreach`,
        description: `These founders have demonstrated strong signal quality and are actively building. Consider initiating contact before they receive competing term sheets.`,
        confidence: 85,
        impact: 'high',
        category: 'Portfolio Intelligence',
        timestamp: 'Now',
      })
    }

    // Insight D: Pending connections that haven't been actioned
    const pendingConnections = (connections ?? []).filter(c => c.status === 'pending')
    if (pendingConnections.length > 0) {
      const avgQ = pendingConnections.reduce((n, c) => n + (c.founder_qscore ?? 0), 0) / pendingConnections.length
      insights.push({
        id: 'pending-connections',
        type: 'risk',
        title: `${pendingConnections.length} Pending Connection Request${pendingConnections.length > 1 ? 's' : ''} Awaiting Response`,
        description: `You have ${pendingConnections.length} unanswered connection requests. Average Q-Score of waiting founders: ${Math.round(avgQ)}. Delayed responses reduce founder interest.`,
        confidence: 95,
        impact: pendingConnections.length >= 5 ? 'high' : 'medium',
        category: 'Deal Flow Risk',
        timestamp: 'Ongoing',
      })
    }

    // Insight E: Sector diversity check
    const uniqueSectors = Object.keys(sectorCounts).length
    if (uniqueSectors >= 2) {
      const secondSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[1]
      if (secondSector) {
        insights.push({
          id: 'sector-diversity',
          type: 'opportunity',
          title: `Emerging ${secondSector[0]} Pipeline — ${secondSector[1]} Founders`,
          description: `${secondSector[0]} is your second-largest sector with ${secondSector[1]} active founders. This emerging concentration represents a potential thematic bet opportunity.`,
          confidence: 79,
          impact: 'medium',
          category: 'Sector Trends',
          timestamp: 'Updated now',
        })
      }
    }

    // ── 5. Portfolio overview stats ───────────────────────────────────────────
    const totalFounders    = (founders ?? []).length
    const avgQScore        = totalFounders > 0 ? Math.round(Object.values(latestScore).reduce((n, s) => n + s.overall_score, 0) / Math.max(Object.keys(latestScore).length, 1)) : 0
    const highQCount       = Object.values(latestScore).filter(s => s.overall_score >= 70).length
    const acceptedConns    = (connections ?? []).filter(c => c.status === 'accepted' || c.status === 'meeting_scheduled').length

    return NextResponse.json({
      insights: insights.length > 0 ? insights : [],
      stats: {
        totalFounders,
        avgQScore,
        highQCount,
        acceptedConnections: acceptedConns,
        pendingConnections: pendingConnections.length,
        uniqueSectors,
      },
      sectorBreakdown: Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([sector, count]) => ({ sector, count })),
      topFounders: (founders ?? [])
        .filter(f => latestScore[f.user_id])
        .sort((a, b) => (latestScore[b.user_id]?.overall_score ?? 0) - (latestScore[a.user_id]?.overall_score ?? 0))
        .slice(0, 5)
        .map(f => ({
          id: f.user_id,
          name: f.startup_name || 'Unnamed',
          founder: f.full_name || '',
          sector: f.industry || 'Unknown',
          stage: f.stage || '',
          qScore: latestScore[f.user_id]?.overall_score ?? 0,
          p1Score: latestScore[f.user_id]?.p1_score ?? 0,
          p2Score: latestScore[f.user_id]?.p2_score ?? 0,
          p3Score: latestScore[f.user_id]?.p3_score ?? 0,
          p4Score: latestScore[f.user_id]?.p4_score ?? 0,
          p5Score: latestScore[f.user_id]?.p5_score ?? 0,
          p6Score: latestScore[f.user_id]?.p6_score ?? 0,
        })),
    })
  } catch (err) {
    log.error('GET /api/investor/ai-analysis', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
