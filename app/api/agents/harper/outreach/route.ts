import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/outreach
// Drafts a personalized recruiting message for a sourced candidate.
// Body: { candidateName, candidateTitle, candidateCompany?, candidateUrl?, role, channel, extraContext? }
// channel: 'email' | 'linkedin' | 'twitter'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      candidateName,
      candidateTitle,
      candidateCompany,
      candidateUrl,
      role,
      channel = 'email',
      extraContext,
    } = body as {
      candidateName: string
      candidateTitle?: string
      candidateCompany?: string
      candidateUrl?: string
      role: string
      channel?: 'email' | 'linkedin' | 'twitter'
      extraContext?: string
    }

    if (!candidateName || !role) {
      return NextResponse.json({ error: 'candidateName and role are required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Get founder + company context
    const [fpRes, artifactRes] = await Promise.all([
      admin.from('founder_profiles').select('full_name, startup_name, industry, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper').eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const fp = fpRes.data
    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const artifact = artifactRes.data
    const hiringContent = artifact?.content as Record<string, unknown> | undefined

    // Find the specific role in hiring plan for context
    const roles = (hiringContent?.roles ?? []) as { title: string; compensation?: string; equity?: string; mustHaves?: string[] }[]
    const roleDetail = roles.find(r => r.title?.toLowerCase().includes(role.toLowerCase()))

    const company = fp?.startup_name ?? 'our startup'
    const founderName = fp?.full_name ?? 'the founder'
    const solution = (sp.solution as string) ?? ''
    const industry = fp?.industry ?? ''

    const channelConstraints = {
      email: 'Subject line + 3 short paragraphs. Total ~150 words. Professional but warm.',
      linkedin: 'LinkedIn connection request note — MAX 300 characters. No subject line. Very concise.',
      twitter: 'Twitter/X DM — MAX 280 characters. Casual, direct, no corporate language.',
    }

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Harper, a startup talent advisor. Draft a personalized recruiting outreach message.
Channel: ${channel}
Constraint: ${channelConstraints[channel]}

Return ONLY valid JSON:
{
  "subject": "email subject line — null if not email",
  "message": "the full recruiting message — personalized to candidate's background",
  "hook": "what specifically about their background makes them a fit — 1 sentence",
  "followUpNote": "suggested follow-up if no reply in 5 days — 1 sentence"
}

Rules:
- Lead with THEIR background, not your company pitch
- One specific compliment about their experience (don't make it up — use what's provided)
- Keep the ask clear: quick 15-min call
- Never mention compensation in first outreach`,
        },
        {
          role: 'user',
          content: `Draft recruiting message for:
Candidate: ${candidateName}
Their title/background: ${candidateTitle ?? 'not specified'}
Current company: ${candidateCompany ?? 'not specified'}
Profile URL: ${candidateUrl ?? 'not specified'}

Role we're hiring for: ${role}
${roleDetail?.mustHaves ? `Key requirements: ${roleDetail.mustHaves.join(', ')}` : ''}
${roleDetail?.compensation ? `Compensation range: ${roleDetail.compensation}` : ''}
${roleDetail?.equity ? `Equity: ${roleDetail.equity}` : ''}

Company: ${company}
${solution ? `What we do: ${solution}` : ''}
${industry ? `Industry: ${industry}` : ''}
Founder's name: ${founderName}
${extraContext ? `Additional context: ${extraContext}` : ''}`,
        },
      ],
      { maxTokens: 500, temperature: 0.5 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let draft: Record<string, unknown> = {}
    try { draft = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { draft = m ? JSON.parse(m[0]) : {} } catch { draft = {} } }

    await supabase.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'harper',
      action_type: 'candidate_outreach_drafted',
      description: `Recruiting message drafted for ${candidateName} (${role} via ${channel})`,
      metadata: { candidateName, role, channel },
    }).then(() => {})

    return NextResponse.json({ draft, candidateName, role, channel })
  } catch (err) {
    console.error('Harper outreach error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
