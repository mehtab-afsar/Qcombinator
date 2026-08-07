import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'

export async function PATCH() {
  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const userId = auth.user.id

  const supabase = createAdminClient()

  await supabase
    .from('founder_profiles')
    .update({ profile_builder_completed: false })
    .eq('user_id', userId)

  return NextResponse.json({ ok: true })
}
