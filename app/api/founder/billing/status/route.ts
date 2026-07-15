import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { FOUNDER_PLAN_LIMITS, toDisplayLimit, type FounderTier } from '@/lib/billing/plans'


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
        .select('feature, usage_count')
        .eq('user_id', user.id)
        .in('feature', ['agent_chat', 'qscore_recalc', 'investor_connection']),
    ])

    const tier = ((profile?.subscription_tier as string) ?? 'free') as FounderTier
    const limits = FOUNDER_PLAN_LIMITS[tier] ?? FOUNDER_PLAN_LIMITS.free

    const usage: Record<string, number> = {}
    for (const row of usageRows ?? []) {
      usage[row.feature as string] = row.usage_count as number
    }

    return NextResponse.json({
      subscriptionTier:   tier,
      subscriptionStatus: (profile?.subscription_status as string) ?? null,
      periodEnd:          (profile?.subscription_current_period_end as string) ?? null,
      // toDisplayLimit maps the UNLIMITED sentinel back to null, which
      // app/founder/billing/page.tsx:52 renders as "Unlimited".
      usage: {
        agentChat:           { used: usage.agent_chat ?? 0,           limit: toDisplayLimit(limits.agent_chat)          },
        qscoreRecalc:        { used: usage.qscore_recalc ?? 0,        limit: toDisplayLimit(limits.qscore_recalc)       },
        investorConnection:  { used: usage.investor_connection ?? 0,  limit: toDisplayLimit(limits.investor_connection) },
      },
    })
  } catch (err) {
    log.error('GET /api/founder/billing/status', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
