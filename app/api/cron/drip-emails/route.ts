import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendDay1NudgeEmail, sendDay7NudgeEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'

// POST /api/cron/drip-emails
// Runs daily at 10:00 UTC via Vercel cron.
// Sends day-1 nudge (profile builder) and day-7 nudge (AI advisors) to inactive founders.
// Free Supabase: no pg_cron — cron lives here and is scheduled in vercel.json.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  // ── Day-1 window: created 23–25 hours ago, not yet sent day-1 email ─────────
  const day1Start = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()
  const day1End   = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString()

  const { data: day1Founders, error: day1Err } = await admin
    .from('founder_profiles')
    .select('user_id, full_name, email_day1_sent')
    .eq('onboarding_completed', true)
    .eq('email_day1_sent', false)
    .gte('created_at', day1Start)
    .lte('created_at', day1End)
    .limit(50)

  if (day1Err) log.error('[drip-emails] day1 query error:', day1Err)

  // ── Day-7 window: created 167–169 hours ago, not yet sent day-7 email ───────
  const day7Start = new Date(now.getTime() - 169 * 60 * 60 * 1000).toISOString()
  const day7End   = new Date(now.getTime() - 167 * 60 * 60 * 1000).toISOString()

  const { data: day7Founders, error: day7Err } = await admin
    .from('founder_profiles')
    .select('user_id, full_name, email_day7_sent')
    .eq('onboarding_completed', true)
    .eq('email_day7_sent', false)
    .gte('created_at', day7Start)
    .lte('created_at', day7End)
    .limit(50)

  if (day7Err) log.error('[drip-emails] day7 query error:', day7Err)

  // ── Get auth emails for each user ────────────────────────────────────────────
  async function getEmail(userId: string): Promise<string | null> {
    try {
      const { data } = await admin.auth.admin.getUserById(userId)
      return data.user?.email ?? null
    } catch {
      return null
    }
  }

  // ── Send day-1 emails ────────────────────────────────────────────────────────
  let day1Sent = 0
  for (const founder of day1Founders ?? []) {
    try {
      const email = await getEmail(founder.user_id)
      if (!email) continue

      // Check if they have any agent artifacts — if they do, skip the nudge
      const { count } = await admin
        .from('agent_artifacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', founder.user_id)

      if ((count ?? 0) > 0) {
        // Active user — mark sent anyway to avoid future nudges
        await admin.from('founder_profiles').update({ email_day1_sent: true }).eq('user_id', founder.user_id)
        continue
      }

      await sendDay1NudgeEmail({ email, fullName: founder.full_name ?? 'Founder' })
      await admin.from('founder_profiles').update({ email_day1_sent: true }).eq('user_id', founder.user_id)
      day1Sent++
    } catch (e) {
      log.error('[drip-emails] day1 send failed', { userId: founder.user_id, err: e })
    }
  }

  // ── Send day-7 emails ────────────────────────────────────────────────────────
  let day7Sent = 0
  for (const founder of day7Founders ?? []) {
    try {
      const email = await getEmail(founder.user_id)
      if (!email) continue

      const { count } = await admin
        .from('agent_artifacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', founder.user_id)

      if ((count ?? 0) > 0) {
        await admin.from('founder_profiles').update({ email_day7_sent: true }).eq('user_id', founder.user_id)
        continue
      }

      await sendDay7NudgeEmail({ email, fullName: founder.full_name ?? 'Founder' })
      await admin.from('founder_profiles').update({ email_day7_sent: true }).eq('user_id', founder.user_id)
      day7Sent++
    } catch (e) {
      log.error('[drip-emails] day7 send failed', { userId: founder.user_id, err: e })
    }
  }

  log.info('[drip-emails] complete', { day1Sent, day7Sent })
  return NextResponse.json({ ok: true, day1Sent, day7Sent })
}
