import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { getMyDemoInvestorId } from '@/lib/investor/demo-investor'

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()

    // demo_investors is a separate, founder-facing directory row synced from this profile
    // (see app/api/investor/onboarding/route.ts) — deleting the profile doesn't touch it, so
    // a departed investor's name/firm/thesis stayed discoverable forever. Deactivate it (not a
    // hard delete: connection_requests/messages reference it by id, and this table's own
    // "is_active" flag is already what deal-flow and /api/investors filter on).
    const demoInvestorId = await getMyDemoInvestorId(admin, user.id)

    if (demoInvestorId) {
      await admin.from('demo_investors').update({ is_active: false }).eq('id', demoInvestorId)
    }

    // Delete the investor profile
    await admin.from('investor_profiles').delete().eq('user_id', user.id)

    // Delete the auth user (this also cascades to delete all related data via Supabase RLS)
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('POST /api/investor/delete-account', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
