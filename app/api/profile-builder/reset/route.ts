import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'

export async function PATCH() {
  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const userId = auth.user.id

  const supabase = createAdminClient()

  // Enforce 24-hour cooldown — same window as the submit rate limit
  const { data: recentScore } = await supabase
    .from('qscore_history')
    .select('calculated_at')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  if (recentScore) {
    const hoursSince = (Date.now() - new Date(recentScore.calculated_at).getTime()) / 3_600_000
    if (hoursSince < 24) {
      const retakeAvailableAt = new Date(
        new Date(recentScore.calculated_at).getTime() + 24 * 60 * 60 * 1000,
      ).toISOString()
      return NextResponse.json(
        { error: 'You can retake the assessment once per 24 hours.', retakeAvailableAt },
        { status: 429 },
      )
    }
  }

  await supabase
    .from('founder_profiles')
    .update({ profile_builder_completed: false })
    .eq('user_id', userId)

  return NextResponse.json({ ok: true })
}
