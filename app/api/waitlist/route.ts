import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/waitlist — public, no auth
// Body: { testId, userId, email, name, source }
// Records a waitlist signup from a fake-door test landing page

export async function POST(request: NextRequest) {
  try {
    const { testId, userId, email, name, source } = await request.json()

    if (!testId || !userId || !email) {
      return NextResponse.json({ error: 'testId, userId, email required' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Insert signup (ignore duplicates gracefully)
    await adminClient.from('waitlist_signups').insert({
      test_id: testId,
      user_id: userId,
      email: email.trim().toLowerCase(),
      name: name ?? null,
      source: source ?? null,
    })

    // Log to agent_activity
    await adminClient.from('agent_activity').insert({
      user_id: userId,
      agent_id: 'nova',
      action_type: 'waitlist_signup',
      description: `${email} joined the waitlist`,
      metadata: { testId, email, name },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Waitlist signup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/waitlist?testId=xxx — founder only, returns signups + count
export async function GET(request: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const testId = request.nextUrl.searchParams.get('testId')
    if (!testId) return NextResponse.json({ signups: [], count: 0 })

    const { data, count } = await supabase
      .from('waitlist_signups')
      .select('id, email, name, submitted_at', { count: 'exact' })
      .eq('test_id', testId)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })

    return NextResponse.json({ signups: data ?? [], count: count ?? 0 })
  } catch {
    return NextResponse.json({ signups: [], count: 0 })
  }
}
