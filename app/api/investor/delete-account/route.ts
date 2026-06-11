import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()

    // Delete the investor profile
    await admin.from('investor_profiles').delete().eq('user_id', user.id)

    // Delete the auth user (this also cascades to delete all related data via Supabase RLS)
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/investor/delete-account', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
