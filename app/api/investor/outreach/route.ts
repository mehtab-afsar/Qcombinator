import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

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

    const { founderId, message } = await request.json()
    if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })
    if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

    // Look up this investor's demo_investor_id so we can check both FK columns.
    // A founder may have previously connected to the demo version of this investor.
    const { data: myProfile } = await admin
      .from('investor_profiles')
      .select('demo_investor_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const demoInvestorId = (myProfile as { demo_investor_id?: string } | null)?.demo_investor_id ?? null

    // Prevent duplicate connections — check via investor_id AND demo_investor_id
    const orFilter = demoInvestorId
      ? `investor_id.eq.${user.id},demo_investor_id.eq.${demoInvestorId}`
      : `investor_id.eq.${user.id}`

    const { data: existing } = await admin
      .from('connection_requests')
      .select('id, status')
      .eq('founder_id', founderId)
      .or(orFilter)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ status: existing.status, already_exists: true })
    }

    // Investor reaching out = connection is live immediately (meeting_scheduled)
    const { data, error } = await admin
      .from('connection_requests')
      .insert({
        founder_id:       founderId,
        investor_id:      user.id,
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
