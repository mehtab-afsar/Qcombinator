import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/followup
// Drafts a contextual follow-up email for a deal.
// Takes deal info + last interaction notes → LLM writes a specific email.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { dealId, company, contactName, contactTitle, stage, value, notes, nextAction, daysSinceContact, founderName, founderCompany } = body as {
      dealId?: string
      company: string
      contactName?: string
      contactTitle?: string
      stage: string
      value?: string
      notes?: string
      nextAction?: string
      daysSinceContact?: number
      founderName?: string
      founderCompany?: string
    }

    if (!company) return NextResponse.json({ error: 'company is required' }, { status: 400 })

    const stageContext: Record<string, string> = {
      lead:        'This is an early-stage lead — keep it light and curiosity-driven.',
      qualified:   'This lead is qualified — mention specific value relevant to their situation.',
      proposal:    'A proposal was sent — follow up on whether they reviewed it and address any questions.',
      negotiating: 'You are in active negotiation — keep momentum, address specific blockers.',
    }

    const context = [
      `Company: ${company}`,
      contactName ? `Contact: ${contactName}${contactTitle ? `, ${contactTitle}` : ''}` : null,
      `Deal stage: ${stage}`,
      value ? `Deal value: ${value}` : null,
      daysSinceContact ? `Days since last contact: ${daysSinceContact}` : null,
      notes ? `Deal notes / last interaction: ${notes}` : null,
      nextAction ? `Agreed next action: ${nextAction}` : null,
      founderName ? `Sender: ${founderName} at ${founderCompany ?? 'the company'}` : null,
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Susi, a sales advisor who writes precise, non-generic follow-up emails.
${stageContext[stage] ?? ''}

Return ONLY valid JSON:
{
  "subject": "email subject line (specific, no filler words)",
  "body": "email body (2-3 short paragraphs, plain text, no HTML, conversational not corporate)",
  "suggestedSendTime": "e.g. Tuesday morning, first thing Monday",
  "talkingPoints": ["2-3 key points to reinforce in this follow-up"]
}

Rules:
- DO NOT start with "I hope this email finds you well" or any filler opener
- Reference specific context from the deal notes if available
- Keep it under 150 words in the body
- End with a clear, single CTA`,
        },
        { role: 'user', content: `Draft a follow-up for this deal:\n${context}` },
      ],
      { maxTokens: 500, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(clean)
    } catch {
      const m = clean.match(/\{[\s\S]*\}/)
      try { parsed = m ? JSON.parse(m[0]) : {} } catch { parsed = {} }
    }

    // Log activity
    if (dealId) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await admin.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'susi',
        action_type: 'followup_drafted',
        description: `Follow-up email drafted for ${company}`,
        metadata:    { dealId, company, stage },
      })
    }

    return NextResponse.json({ draft: parsed })
  } catch (err) {
    console.error('Susi followup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
