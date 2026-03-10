import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/qscore/activity-boost
// No body — rewards consistent platform engagement with a small Q-Score signal boost
// Checks: last login within 24h, 3+ agent actions in last 7 days, 5+ messages today
// Returns: { boosted: boolean, boostAmount: number, currentScore: number, reason: string }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const oneDayAgo    = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const todayStart   = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

    const [
      { data: recentActivity, count: activityCount },
      { data: _todayMessages, count: messageCount },
      { data: latestScore },
      { data: lastBoost },
    ] = await Promise.all([
      admin.from('agent_activity')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo),
      admin.from('agent_messages')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('role', 'user')
        .gte('created_at', todayStart)
        .limit(1), // just need count
      admin.from('qscore_history')
        .select('id, overall_score, calculated_at')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1).maybeSingle(),
      admin.from('qscore_history')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('data_source', 'activity_boost')
        .gte('created_at', oneDayAgo)
        .limit(1).maybeSingle(),
    ])

    // Don't boost more than once per day
    if (lastBoost) {
      return NextResponse.json({
        boosted: false,
        boostAmount: 0,
        currentScore: latestScore?.overall_score ?? 0,
        reason: 'Activity boost already applied today — come back tomorrow',
      })
    }

    const currentScore = latestScore?.overall_score ?? 0
    const weeklyActions = activityCount ?? 0
    const todayChats = messageCount ?? 0

    let boostAmount = 0
    const reasons: string[] = []

    // Consistent weekly engagement: 3+ agent actions
    if (weeklyActions >= 3) {
      boostAmount += 1
      reasons.push(`${weeklyActions} agent actions this week`)
    }

    // Active today: 5+ messages sent
    if (todayChats >= 5) {
      boostAmount += 1
      reasons.push(`${todayChats} messages sent today`)
    }

    // Power user: 10+ actions this week
    if (weeklyActions >= 10) {
      boostAmount += 1
      reasons.push('Power user: 10+ actions this week')
    }

    if (boostAmount === 0) {
      return NextResponse.json({
        boosted: false,
        boostAmount: 0,
        currentScore,
        reason: 'Keep engaging — 3+ agent actions this week or 5+ messages today to earn a boost',
      })
    }

    const newScore = Math.min(100, currentScore + boostAmount)

    // Insert a new qscore_history row as activity boost (chain to previous score)
    await admin.from('qscore_history').insert({
      user_id: user.id,
      overall_score: newScore,
      previous_score_id: latestScore?.id ?? null,
      data_source: 'activity_boost',
      source_artifact_type: null,
      assessment_data: {},
    })

    void recentActivity // suppress unused warning

    return NextResponse.json({
      boosted: true,
      boostAmount,
      currentScore: newScore,
      reason: reasons.join(' + '),
    })
  } catch (err) {
    console.error('Activity boost error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
