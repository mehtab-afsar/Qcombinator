import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { isFounderVisible } from '@/lib/investor/visibility'
import { parseBody, outreachPostSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'
import { getMyDemoInvestorId, investorConnectionOrFilter } from '@/lib/investor/demo-investor'

// POST /api/investor/outreach
// Allows investors to initiate contact with a founder.
// Creates a connection_request with status 'meeting_scheduled' and sends a notification.
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const supabase = await createClient()
    const admin = createAdminClient()

    const parsed = await parseBody(request, outreachPostSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { founderId, message } = parsed.data

    // Same class of bug as H-1 (docs/INVESTOR_AUDIT.md §2) — not in the original 5-route
    // list, found while fixing the adjacent outreach validation gap. A founder hidden from
    // marketplace listing must not be contactable via a guessed/enumerated id either.
    if (!(await isFounderVisible(admin, founderId))) {
      return NextResponse.json({ error: 'Founder not found' }, { status: 404 })
    }

    // Look up this investor's demo_investor_id so we can check both FK columns.
    // A founder may have previously connected to the demo version of this investor.
    const demoInvestorId = await getMyDemoInvestorId(admin, user.id)

    // Prevent duplicate connections — check via investor_id AND demo_investor_id
    const orFilter = investorConnectionOrFilter(user.id, demoInvestorId)

    const { data: existing } = await admin
      .from('connection_requests')
      .select('id, status')
      .eq('founder_id', founderId)
      .or(orFilter)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ status: existing.status, already_exists: true })
    }

    // ── Check investor_connection usage limit (atomic RPC) ──────────────────
    // Mirrors app/api/connections/route.ts's founder-side check on the same feature/RPC.
    try {
      const { data: usageData, error: usageErr } = await admin.rpc('increment_usage_if_allowed', {
        p_user_id: user.id,
        p_feature: 'investor_connection',
      }) as { data: Array<{ allowed: boolean; remaining: number }> | null; error: unknown }

      if (!usageErr && usageData?.[0]?.allowed === false) {
        return NextResponse.json({
          error: 'Monthly investor connection limit reached',
          limitReached: true,
          remaining: 0,
        }, { status: 429 })
      }
    } catch {
      // Usage check failed — allow through (fail-open)
      log.warn('investor_connection usage check failed — allowing through', { userId: user.id })
    }

    // Investor reaching out = connection is live immediately (meeting_scheduled). The opening
    // note lives only on personal_message — it used to also be inserted as a real messages row
    // ("so both parties see it in the thread"), but ThreadPanel already renders personal_message
    // as the thread's opening bubble, so that second insert just duplicated the same text as two
    // bubbles. requested_by records that the investor wrote it, so the UI can attribute it
    // correctly regardless of which party is viewing.
    const { data, error } = await admin
      .from('connection_requests')
      .insert({
        founder_id:       founderId,
        investor_id:      user.id,
        requested_by:     user.id,
        personal_message: message.trim(),
        status:           'meeting_scheduled',
      })
      .select('id, status')
      .single()

    if (error) {
      log.error('POST /api/investor/outreach insert', { error })
      return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 })
    }

    // Notify the founder
    try {
      const { data: ip } = await supabase
        .from('investor_profiles')
        .select('full_name, firm_name')
        .eq('user_id', user.id)
        .single()

      const investorName = (ip as { full_name?: string } | null)?.full_name ?? 'An investor'
      const firmName     = (ip as { firm_name?: string }  | null)?.firm_name  ?? ''

      await admin.from('notifications').insert({
        user_id:  founderId,
        type:     'investor_outreach',
        title:    `${investorName}${firmName ? ` from ${firmName}` : ''} wants to connect with you`,
        read:     false,
        metadata: { connection_id: data.id, investor_id: user.id },
      })
    } catch (notifErr) {
      log.error('POST /api/investor/outreach notification', { notifErr })
    }

    return NextResponse.json({ status: data.status, id: data.id })
  } catch (err) {
    log.error('POST /api/investor/outreach', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
