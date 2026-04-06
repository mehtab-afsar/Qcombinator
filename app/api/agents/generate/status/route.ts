import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

/**
 * GET /api/agents/generate/status?jobId=<uuid>
 *
 * Polls the status of an async artifact generation job.
 * Returns: { status, artifact?, scoreSignal?, error? }
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = req.nextUrl.searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    // Read job via admin client to bypass RLS (we verify ownership in the query)
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: job, error: jobErr } = await admin
      .from('artifact_jobs')
      .select('id, status, result, error, created_at, started_at, completed_at')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status === 'completed') {
      const r = job.result as { artifact: unknown; scoreSignal: unknown } | null
      return NextResponse.json({
        status: 'completed',
        artifact: r?.artifact,
        scoreSignal: r?.scoreSignal,
      })
    }

    if (job.status === 'failed') {
      return NextResponse.json({ status: 'failed', error: job.error })
    }

    return NextResponse.json({ status: job.status })
  } catch (err) {
    console.error('[generate/status]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
