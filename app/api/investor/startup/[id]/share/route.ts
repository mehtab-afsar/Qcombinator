import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { isFounderVisible } from '@/lib/investor/visibility'
import { parseBody, startupShareSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'
import { getStartupDisplayName } from '@/lib/founder/display-name'
import { createNotification } from '@/lib/notifications/create'

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
    const parsed = await parseBody(req, startupShareSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { targetInvestorId, note } = parsed.data

    const admin = createAdminClient()

    if (!(await isFounderVisible(admin, founderId))) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
    }

    // H-2: targetInvestorId must resolve to a real investor — otherwise this write lets any
    // authenticated investor inject a spoofed notification into any user's inbox by UUID guess.
    const { data: target } = await admin
      .from('investor_profiles')
      .select('user_id')
      .eq('user_id', targetInvestorId)
      .maybeSingle()
    if (!target) return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 })

    // Fetch sharer's name + startup info in parallel
    const [
      { data: sharer },
      { data: founder },
    ] = await Promise.all([
      admin.from('investor_profiles').select('full_name, firm_name').eq('user_id', auth.user.id).single(),
      admin.from('founder_profiles').select('full_name, startup_name, company_name').eq('user_id', founderId).single(),
    ])

    if (!founder) return NextResponse.json({ error: 'Startup not found' }, { status: 404 })

    const sharerName = sharer?.full_name ?? 'A fellow investor'
    const sharerFirm = sharer?.firm_name ? ` (${sharer.firm_name})` : ''
    const startupName = getStartupDisplayName(founder)

    await createNotification({
      userId: targetInvestorId,
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
