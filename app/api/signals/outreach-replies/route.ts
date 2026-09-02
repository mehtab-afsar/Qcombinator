/**
 * POST /api/signals/outreach-replies — look for replies to outreach this founder's team sent.
 *
 * ⚠️ FOUNDER-ATTRIBUTABLE, NEVER AUTONOMOUS. This is called from a founder's own page load
 * (features/executive/hooks/useExecutiveWorkspace.tsx), never from a cron and never from a Rhythm
 * cycle step. Reading someone's mailbox should require them to be present. It is the same
 * principle `app/api/actions/[id]/pull-data/route.ts` follows, one step wider — a page view
 * rather than a button press — and recorded in the DecisionLog rather than left to a docstring.
 *
 * ⚠️ IT DETECTS; IT DOES NOT START WORK. The sweep writes rows and may create a notification.
 * Whether anything gets drafted in response is the founder's separate click. That is what keeps
 * ADR-028 intact — a cycle is still fed by founder activity — while the product can still notice
 * something the founder has not.
 *
 * GET on the same path answers the screen's question instead — how many replies are known, and
 * has a follow-up already been drafted for them. A plain table read: no Gmail, no gates, safe to
 * call on any render. The two verbs are split that way on purpose — POST may cost an external
 * call and is fired once per session; GET is free and can be re-asked after the founder clicks.
 *
 * Thin: flag → auth → anchor → call the sweep → return (CLAUDE.md §2). No connector logic here.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { getAnchorFounderId } from '@/lib/team/founder-permissions'
import { sweepOutreachReplies } from '@/lib/signals/outreach-replies'
import { getReplySummary } from '@/lib/signals/replies-summary'
import { log } from '@/lib/logger'

export async function POST(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const admin = createAdminClient()
    // The workspace owner, not the teammate who happened to load the page — outreach and its
    // replies belong to the company, and action_log rows live under the owner's id.
    const founderId = await getAnchorFounderId(auth.user.id, admin)
    // No workspace yet — nothing has ever been sent, so there is nothing to sweep. A quiet
    // no-op rather than a 400: this fires on every page load and must never look like an error.
    if (!founderId) return NextResponse.json({ status: 'skipped', sendsChecked: 0, repliesFound: 0 })

    const result = await sweepOutreachReplies(admin, founderId)
    return NextResponse.json(result)
  } catch (err) {
    // The sweep itself never throws; this catches the setup around it. A failure here must stay
    // invisible to the founder — nothing on their page depends on this succeeding.
    log.warn('POST /api/signals/outreach-replies', { err })
    return NextResponse.json({ status: 'error', sendsChecked: 0, repliesFound: 0 })
  }
}

export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const empty = { count: 0, newestSignalId: null, newestAt: null, handled: false, followUpKey: null }

  try {
    const admin = createAdminClient()
    const founderId = await getAnchorFounderId(auth.user.id, admin)
    if (!founderId) return NextResponse.json(empty)

    return NextResponse.json(await getReplySummary(admin, founderId))
  } catch (err) {
    // Same posture as POST: a prompt that fails to appear is a missed opportunity, a page that
    // fails to render is a bug. Degrade to "nothing to show".
    log.warn('GET /api/signals/outreach-replies', { err })
    return NextResponse.json(empty)
  }
}
