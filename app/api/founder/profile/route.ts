import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, founderProfilePatchSchema } from '@/lib/api/validate'
import { FounderProfile } from '@/features/founder/types/founder.types'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('founder_profiles')
      .select('full_name, startup_name, industry, stage, funding, description, website, team_size, tagline, location, startup_profile_data')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    if (!data) return NextResponse.json({ profile: null })

    const sp = (data.startup_profile_data ?? {}) as Record<string, unknown>

    const profile: FounderProfile = {
      fullName:         data.full_name    ?? '',
      email:            user.email        ?? '',
      startupName:      data.startup_name ?? '',
      industry:         data.industry     ?? '',
      stage:            data.stage        ?? '',
      funding:          data.funding      ?? '',
      description:      data.description  ?? '',
      timeCommitment:   '',
      tagline:          (data.tagline  as string | null)  ?? undefined,
      location:         (data.location as string | null)  ?? undefined,
      problemStatement: (sp.problemStatement as string | undefined) ?? undefined,
      targetCustomer:   (sp.targetCustomer   as string | undefined) ?? undefined,
    }

    return NextResponse.json({ profile })
  } catch (err) {
    log.error('GET /api/founder/profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(req, founderProfilePatchSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const updates = parsed.data

    const dbUpdates: Record<string, unknown> = {}
    if (updates.fullName    !== undefined) dbUpdates.full_name    = updates.fullName
    if (updates.startupName !== undefined) dbUpdates.startup_name = updates.startupName
    if (updates.industry    !== undefined) dbUpdates.industry     = updates.industry
    if (updates.stage       !== undefined) dbUpdates.stage        = updates.stage
    if (updates.funding     !== undefined) dbUpdates.funding      = updates.funding
    if (updates.description !== undefined) dbUpdates.description  = updates.description
    if (updates.tagline     !== undefined) dbUpdates.tagline      = updates.tagline
    if (updates.location    !== undefined) dbUpdates.location     = updates.location

    const admin = createAdminClient()

    const hasJsonbUpdates = updates.problemStatement !== undefined || updates.targetCustomer !== undefined
    if (hasJsonbUpdates) {
      const { data: existing } = await admin
        .from('founder_profiles')
        .select('startup_profile_data')
        .eq('user_id', user.id)
        .maybeSingle()
      const current = (existing?.startup_profile_data ?? {}) as Record<string, unknown>
      dbUpdates.startup_profile_data = {
        ...current,
        ...(updates.problemStatement !== undefined && { problemStatement: updates.problemStatement }),
        ...(updates.targetCustomer   !== undefined && { targetCustomer:   updates.targetCustomer }),
      }
    }

    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json({ success: true })
    }

    const { error } = await admin
      .from('founder_profiles')
      .update(dbUpdates)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('PATCH /api/founder/profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
