import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'

const VALID = ['posthog', 'calendly', 'fireflies'] as const
type Integration = (typeof VALID)[number]

function isValid(s: unknown): s is Integration {
  return typeof s === 'string' && (VALID as readonly string[]).includes(s)
}

async function resolveUser(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const supabase = getAdminClient()
  const { data: { user }, error } = await supabase.auth.getUser(auth.slice(7))
  if (error || !user) return null
  return { supabase, user }
}

// POST — save a per-founder API key
export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveUser(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { integration, key, projectId } = body

    if (!isValid(integration)) {
      return NextResponse.json({ error: 'Invalid integration' }, { status: 400 })
    }
    if (typeof key !== 'string' || !key.trim()) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    const updates: Record<string, string | null> = {}
    if (integration === 'posthog') {
      updates.posthog_api_key = key.trim()
      updates.posthog_project_id = typeof projectId === 'string' && projectId.trim() ? projectId.trim() : null
    } else if (integration === 'calendly') {
      updates.calendly_api_key = key.trim()
    } else if (integration === 'fireflies') {
      updates.fireflies_api_key = key.trim()
    }

    const { error } = await ctx.supabase
      .from('founder_profiles')
      .update(updates)
      .eq('user_id', ctx.user.id)

    if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    return NextResponse.json({ connected: true, integration })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — remove a per-founder API key
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await resolveUser(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const integration = new URL(request.url).searchParams.get('integration')
    if (!isValid(integration)) {
      return NextResponse.json({ error: 'Invalid integration' }, { status: 400 })
    }

    const nulls: Record<string, null> = {}
    if (integration === 'posthog') {
      nulls.posthog_api_key = null
      nulls.posthog_project_id = null
    } else if (integration === 'calendly') {
      nulls.calendly_api_key = null
    } else if (integration === 'fireflies') {
      nulls.fireflies_api_key = null
    }

    await ctx.supabase.from('founder_profiles').update(nulls).eq('user_id', ctx.user.id)
    return NextResponse.json({ connected: false, integration })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
