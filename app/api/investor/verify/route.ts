/**
 * PATCH /api/investor/verify
 * Admin-only: set verification_status on an investor profile.
 * Body: { investorUserId: string, status: 'verified' | 'rejected' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

const schema = z.object({
  investorUserId: z.string().uuid(),
  status:         z.enum(['verified', 'rejected']),
})

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    if (!ADMIN_EMAILS.includes(user.email ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    const { investorUserId, status } = parsed.data

    const admin = createAdminClient()
    const { error } = await admin
      .from('investor_profiles')
      .update({ verification_status: status })
      .eq('user_id', investorUserId)

    if (error) {
      log.error('investor verify update failed', { error })
      return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
    }

    // Notify investor via notifications table
    await admin
      .from('notifications')
      .insert({
        user_id: investorUserId,
        type:    status === 'verified' ? 'qscore_update' : 'message',
        title:   status === 'verified'
          ? '✅ Your investor profile is verified'
          : 'Profile update required',
        body:    status === 'verified'
          ? 'Your QCombinator investor profile has been verified. You now have full access to deal flow and founder connections.'
          : 'Your investor profile could not be verified at this time. Please contact support for more information.',
        read:    false,
      })

    log.info('investor verified', { investorUserId, status, by: user.email })
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('PATCH /api/investor/verify', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/investor/verify
 * Admin-only: list all pending investor profiles for review.
 */
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    if (!ADMIN_EMAILS.includes(user.email ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('investor_profiles')
      .select('user_id, full_name, email, firm_name, firm_type, location, thesis, sectors, stages, created_at, verification_status')
      .eq('verification_status', 'pending')
      .eq('onboarding_completed', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: 'Failed to fetch pending investors' }, { status: 500 })
    return NextResponse.json({ investors: data ?? [] })
  } catch (err) {
    log.error('GET /api/investor/verify', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
