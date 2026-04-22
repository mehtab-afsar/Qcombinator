import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET /api/investor/startup/[id]/share — list real investors to share with
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: founderId } = await params
    const admin = createAdminClient()

    // Return real investors (excluding self and the founder being viewed)
    const { data: investors } = await admin
      .from('investor_profiles')
      .select('user_id, full_name, firm_name')
      .neq('user_id', auth.user.id)
      .neq('user_id', founderId)
      .not('full_name', 'is', null)
      .order('full_name', { ascending: true })
      .limit(100)

    return NextResponse.json({ investors: investors ?? [] })
  } catch (err) {
    log.error('GET /api/investor/startup/[id]/share', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/investor/startup/[id]/share — notify target investor
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: founderId } = await params
    const body = await req.json()
    const { targetInvestorId, note } = body as { targetInvestorId: string; note?: string }

    if (!targetInvestorId) return NextResponse.json({ error: 'targetInvestorId is required' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch sharer's name + startup info in parallel
    const [
      { data: sharer },
      { data: founder },
    ] = await Promise.all([
      admin.from('investor_profiles').select('full_name, firm_name').eq('user_id', auth.user.id).single(),
      admin.from('founder_profiles').select('full_name, startup_name').eq('user_id', founderId).single(),
    ])

    if (!founder) return NextResponse.json({ error: 'Startup not found' }, { status: 404 })

    const sharerName = sharer?.full_name ?? 'A fellow investor'
    const sharerFirm = sharer?.firm_name ? ` (${sharer.firm_name})` : ''
    const startupName = founder.startup_name ?? `${founder.full_name}'s startup`

    await admin.from('notifications').insert({
      user_id: targetInvestorId,
      type: 'startup_share',
      title: `${sharerName} shared ${startupName} with you`,
      body: note
        ? `"${note}"`
        : `${sharerName}${sharerFirm} thinks you might be interested in ${startupName}.`,
      metadata: {
        founderId,
        startupName,
        sharedBy: auth.user.id,
        sharerName,
        note: note ?? null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('POST /api/investor/startup/[id]/share', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
