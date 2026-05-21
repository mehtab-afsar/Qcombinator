import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

const PLAN_LIMITS = {
  free:    { agent_chat: 50,  qscore_recalc: 2,   investor_connection: 3   },
  premium: { agent_chat: 500, qscore_recalc: null, investor_connection: null },
}

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()

    const [{ data: profile }, { data: usageRows }] = await Promise.all([
      admin
        .from('founder_profiles')
        .select('subscription_tier, subscription_status, subscription_current_period_end')
        .eq('user_id', user.id)
        .single(),

      admin
        .from('subscription_usage')
        .select('feature, used_count')
        .eq('user_id', user.id)
        .in('feature', ['agent_chat', 'qscore_recalc', 'investor_connection']),
    ])

    const tier = ((profile?.subscription_tier as string) ?? 'free') as 'free' | 'premium'
    const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.free

    const usage: Record<string, number> = {}
    for (const row of usageRows ?? []) {
      usage[row.feature as string] = row.used_count as number
    }

    return NextResponse.json({
      subscriptionTier:   tier,
      subscriptionStatus: (profile?.subscription_status as string) ?? null,
      periodEnd:          (profile?.subscription_current_period_end as string) ?? null,
      usage: {
        agentChat:           { used: usage.agent_chat ?? 0,          limit: limits.agent_chat          },
        qscoreRecalc:        { used: usage.qscore_recalc ?? 0,       limit: limits.qscore_recalc       },
        investorConnection:  { used: usage.investor_connection ?? 0,  limit: limits.investor_connection  },
      },
    })
  } catch (err) {
    log.error('GET /api/founder/billing/status', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
