import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// POST /api/academy/workshops/:id/register — register the caller for a workshop.
// Capacity-safe: register_for_workshop() locks the workshop row and checks spots_left
// inside that lock, so two concurrent requests for the last spot cannot both succeed.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: workshopId } = await params
    const admin = createAdminClient()

    const { data, error } = await admin
      .rpc('register_for_workshop', { p_workshop_id: workshopId, p_founder_id: auth.user.id })
      .single()

    if (error) {
      log.error('POST /api/academy/workshops/[id]/register rpc', { error, workshopId })
      return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
    }

    const result = data as { success: boolean; reason: string; remaining_spots: number }

    if (!result.success) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
      }
      if (result.reason === 'full') {
        return NextResponse.json({ error: 'This workshop is full', full: true }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
    }

    // Fire-and-forget confirmation notification — non-blocking, matches the pattern in
    // app/api/connections/route.ts.
    void admin.from('notifications').insert({
      user_id: auth.user.id,
      type: 'workshop_registered',
      title: 'You\'re registered for the workshop',
      read: false,
      metadata: { workshop_id: workshopId },
    }).then(({ error: notifErr }) => {
      if (notifErr) log.error('POST /api/academy/workshops/[id]/register notification', { notifErr })
    })

    return NextResponse.json({ registered: true, spotsLeft: result.remaining_spots })
  } catch (err) {
    log.error('POST /api/academy/workshops/[id]/register', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/academy/workshops/:id/register — unregister the caller from a workshop.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: workshopId } = await params
    const admin = createAdminClient()

    const { data, error } = await admin
      .rpc('unregister_from_workshop', { p_workshop_id: workshopId, p_founder_id: auth.user.id })
      .single()

    if (error) {
      log.error('DELETE /api/academy/workshops/[id]/register rpc', { error, workshopId })
      return NextResponse.json({ error: 'Failed to unregister' }, { status: 500 })
    }

    const result = data as { success: boolean; reason: string; remaining_spots: number }

    if (!result.success && result.reason === 'not_found') {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    return NextResponse.json({ registered: false, spotsLeft: result.remaining_spots })
  } catch (err) {
    log.error('DELETE /api/academy/workshops/[id]/register', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
