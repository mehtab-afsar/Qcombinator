import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const supabase = await createClient()
    const userId = auth.user.id

    const [
      { data: myProfile },
      { data: myInvestorProfile },
      { data: myScore },
      { data: topScores },
      { count: founderCount },
      { count: investorCount },
    ] = await Promise.all([
      supabase.from('founder_profiles')
        .select('full_name, startup_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle(),

      supabase.from('investor_profiles')
        .select('user_id, full_name, firm_name')
        .eq('user_id', userId)
        .maybeSingle(),

      supabase.from('qscore_history')
        .select('overall_score, grade')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Top scores: fetch latest score per user
      supabase.from('qscore_history')
        .select('user_id, overall_score, grade')
        .order('overall_score', { ascending: false })
        .limit(20),

      supabase.from('founder_profiles').select('user_id', { count: 'exact', head: true }),
      supabase.from('investor_profiles').select('user_id', { count: 'exact', head: true }),
    ])

    // Deduplicate topScores to one entry per user, take top 5
    const seen = new Set<string>()
    const dedupedTop: Array<{ user_id: string; overall_score: number; grade: string }> = []
    for (const row of topScores ?? []) {
      if (!seen.has(row.user_id) && row.user_id !== userId) {
        seen.add(row.user_id)
        dedupedTop.push(row as { user_id: string; overall_score: number; grade: string })
      }
      if (dedupedTop.length >= 5) break
    }

    // Enrich top founders with profile data
    const topUserIds = dedupedTop.map(r => r.user_id)
    const { data: topProfiles } = topUserIds.length
      ? await supabase.from('founder_profiles')
          .select('user_id, full_name, startup_name, avatar_url')
          .in('user_id', topUserIds)
      : { data: [] }

    const profileMap = Object.fromEntries((topProfiles ?? []).map(p => [p.user_id, p]))

    const topFounders = dedupedTop
      .map(r => {
        const p = profileMap[r.user_id]
        if (!p?.full_name && !p?.startup_name) return null
        return {
          name:         p?.startup_name ?? p?.full_name ?? '',
          startup_name: p?.startup_name ?? '',
          avatar_url:   p?.avatar_url   ?? null,
          score:        r.overall_score,
          grade:        r.grade ?? '',
        }
      })
      .filter(Boolean) as Array<{ name: string; startup_name: string; avatar_url: string | null; score: number; grade: string }>

    const isInvestor = !!myInvestorProfile && !myProfile
    return NextResponse.json({
      currentUser: {
        name:         myProfile?.full_name    ?? myInvestorProfile?.full_name ?? null,
        startup_name: myProfile?.startup_name ?? null,
        firm_name:    myInvestorProfile?.firm_name ?? null,
        avatar_url:   myProfile?.avatar_url   ?? null,
        score:        myScore?.overall_score  ?? null,
        grade:        myScore?.grade          ?? null,
        role:         isInvestor ? 'investor' : 'founder',
      },
      topFounders,
      stats: {
        founderCount:  founderCount  ?? 0,
        investorCount: investorCount ?? 0,
      },
    })
  } catch (err) {
    log.error('GET /api/feed/sidebar', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
