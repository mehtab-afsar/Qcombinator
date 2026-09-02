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
 * Thin: flag → auth → anchor → call the sweep → return (CLAUDE.md §2). No connector logic here.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { getAnchorFounderId } from '@/lib/team/founder-permissions'
import { sweepOutreachReplies } from '@/lib/signals/outreach-replies'
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
