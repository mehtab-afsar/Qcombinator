import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/icp-validation
// Validates ICP effectiveness using real outreach data.
// Compares open/reply rates across ICP segments from outreach_sends + icp_document artifact.
// Returns: { segments, bestSegment, worstSegment, icpRefinements, recommendation, totalSent }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    const [
      { data: icpArtifact },
      { data: outreachArtifact },
      { data: outreachSends },
      { data: fp },
    ] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel').eq('artifact_type', 'icp_document').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel').eq('artifact_type', 'outreach_sequence').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('outreach_sends').select('contact_email, status, opened_at, replied_at, company, title, metadata').eq('user_id', user.id).order('sent_at', { ascending: false }).limit(200),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const icp = (icpArtifact?.content ?? {}) as Record<string, unknown>
    const outreach = (outreachArtifact?.content ?? {}) as Record<string, unknown>
    const sends = outreachSends ?? []

    if (sends.length < 5) {
      return NextResponse.json({
        error: 'Not enough outreach data yet. Send at least 5 emails first, then validate your ICP.',
      }, { status: 400 })
    }

    // Aggregate outreach stats
    const totalSent = sends.length
    const totalOpened = sends.filter(s => s.opened_at || s.status === 'opened' || s.status === 'clicked').length
    const totalReplied = sends.filter(s => s.replied_at || s.status === 'replied').length
    const overallOpenRate = Math.round((totalOpened / totalSent) * 100)
    const overallReplyRate = Math.round((totalReplied / totalSent) * 100)

    // Group by title/seniority if available
    const byTitle: Record<string, { sent: number; opened: number; replied: number }> = {}
    for (const s of sends) {
      const titleGroup = classifyTitle(s.title ?? (s.metadata as Record<string, unknown>)?.title as string ?? '')
      if (!byTitle[titleGroup]) byTitle[titleGroup] = { sent: 0, opened: 0, replied: 0 }
      byTitle[titleGroup].sent++
      if (s.opened_at || s.status === 'opened' || s.status === 'clicked') byTitle[titleGroup].opened++
      if (s.replied_at || s.status === 'replied') byTitle[titleGroup].replied++
    }

    const segments = Object.entries(byTitle)
      .filter(([, v]) => v.sent >= 3)
      .map(([segment, v]) => ({
        segment,
        sent: v.sent,
        openRate: Math.round((v.opened / v.sent) * 100),
        replyRate: Math.round((v.replied / v.sent) * 100),
      }))

    // Context for LLM
    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const icpSummary = [
      icp.targetProfile ? `ICP target: ${icp.targetProfile}` : '',
      icp.painPoints && Array.isArray(icp.painPoints) ? `Key pain points: ${(icp.painPoints as string[]).join(', ')}` : '',
      icp.segments && Array.isArray(icp.segments) ? `Defined segments: ${(icp.segments as string[]).join(', ')}` : '',
      outreach.targetPersona ? `Outreach persona: ${outreach.targetPersona}` : '',
      sp.targetCustomer ? `Target customer: ${sp.targetCustomer}` : '',
    ].filter(Boolean).join('\n')

    const segmentsText = segments.map(s => `${s.segment}: sent=${s.sent}, open=${s.openRate}%, reply=${s.replyRate}%`).join('\n')
    const overallText = `Overall: sent=${totalSent}, open=${overallOpenRate}%, reply=${overallReplyRate}%`

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Patel, a GTM advisor. Analyze outreach performance data to validate ICP fit and recommend refinements.

Return ONLY valid JSON:
{
  "verdict": "1-2 sentence overall assessment of ICP accuracy based on the data",
  "bestSegment": { "name": "segment name", "whyItWorks": "1 sentence on why this segment responds well" },
  "worstSegment": { "name": "segment name", "whyItFails": "1 sentence on why this segment underperforms" },
  "icpRefinements": [
    "specific ICP refinement based on the data — e.g. 'Prioritize VP Engineering over CTO — 3x higher reply rate'"
  ],
  "messagingInsight": "what the open/reply rate gap suggests about message-market fit",
  "nextTest": "1 specific A/B test to run next — e.g. test subject lines focused on [X] for [segment]",
  "projectedImpact": "if they implement the top refinement, estimated improvement — e.g. '+8% reply rate'"
}

Provide 3-5 ICP refinements. Base everything on the real numbers.`,
        },
        {
          role: 'user',
          content: `Validate ICP for: ${fp?.startup_name ?? 'this startup'}\n\nCurrent ICP:\n${icpSummary || 'No ICP artifact built yet'}\n\nOutreach performance:\n${overallText}\n\nBy segment:\n${segmentsText || 'Not enough data to segment by title'}`,
        },
      ],
      { maxTokens: 700, temperature: 0.35 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { analysis = m ? JSON.parse(m[0]) : {} } catch { analysis = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'patel',
      action_type: 'icp_validated',
      description: `ICP validation — ${totalSent} emails, ${overallOpenRate}% open rate, ${overallReplyRate}% reply rate`,
      metadata:    { totalSent, overallOpenRate, overallReplyRate, segmentCount: segments.length },
    }).then(() => {})

    return NextResponse.json({
      totalSent,
      overallOpenRate,
      overallReplyRate,
      segments,
      verdict:           analysis.verdict ?? null,
      bestSegment:       analysis.bestSegment ?? null,
      worstSegment:      analysis.worstSegment ?? null,
      icpRefinements:    analysis.icpRefinements ?? [],
      messagingInsight:  analysis.messagingInsight ?? null,
      nextTest:          analysis.nextTest ?? null,
      projectedImpact:   analysis.projectedImpact ?? null,
    })
  } catch (err) {
    console.error('Patel ICP validation POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function classifyTitle(title: string): string {
  if (!title) return 'Unknown'
  const t = title.toLowerCase()
  if (t.includes('ceo') || t.includes('founder') || t.includes('co-founder')) return 'CEO/Founder'
  if (t.includes('cto') || t.includes('vp eng') || t.includes('vp of eng') || t.includes('head of eng') || t.includes('engineering')) return 'Engineering Leadership'
  if (t.includes('cmo') || t.includes('marketing') || t.includes('growth')) return 'Marketing/Growth'
  if (t.includes('vp sales') || t.includes('head of sales') || t.includes('sales director') || t.includes('account executive')) return 'Sales Leadership'
  if (t.includes('product') || t.includes('cpo')) return 'Product'
  if (t.includes('ops') || t.includes('coo')) return 'Operations'
  if (t.includes('finance') || t.includes('cfo')) return 'Finance'
  if (t.includes('hr') || t.includes('people') || t.includes('talent')) return 'HR/People'
  return 'Other'
}
