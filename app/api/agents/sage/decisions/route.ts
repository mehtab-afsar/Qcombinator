import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// GET  /api/agents/sage/decisions — returns decision journal entries
// POST /api/agents/sage/decisions — logs a new strategic decision
// Body (POST): { decision, reasoning, alternatives?, expectedOutcome?, category? }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const { data: entries } = await admin
      .from('agent_activity')
      .select('id, description, metadata, created_at')
      .eq('user_id', user.id)
      .eq('agent_id', 'sage')
      .eq('action_type', 'decision_logged')
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ decisions: entries ?? [] })
  } catch (err) {
    console.error('Sage decisions GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { decision, reasoning, alternatives, expectedOutcome, category } = body as {
      decision: string
      reasoning?: string
      alternatives?: string
      expectedOutcome?: string
      category?: string
    }

    if (!decision?.trim()) {
      return NextResponse.json({ error: 'decision is required' }, { status: 400 })
    }

    const admin = getAdmin()

    // LLM gives a Sage-style assessment of the decision
    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Sage, a startup strategy advisor. A founder just logged a strategic decision. Give a brief, sharp assessment.
Return ONLY valid JSON:
{
  "assessment": "2-3 sentences — does this seem like the right call? What's the key risk?",
  "confidence": "high | medium | low — how clearly defined is this decision?",
  "reversibility": "easily_reversible | partially_reversible | hard_to_reverse",
  "watchFor": "1 specific thing to track in the next 30 days to validate this decision",
  "reminderDate": "suggest a date to review this decision — format: 'in X weeks'"
}
Rules:
- Be direct about risks, don't just validate the decision
- If the reasoning is weak, say so
- If alternatives weren't considered, flag it`,
        },
        {
          role: 'user',
          content: `Decision: ${decision}
${reasoning ? `Reasoning: ${reasoning}` : ''}
${alternatives ? `Alternatives considered: ${alternatives}` : 'No alternatives mentioned'}
${expectedOutcome ? `Expected outcome: ${expectedOutcome}` : ''}
${category ? `Category: ${category}` : ''}`,
        },
      ],
      { maxTokens: 300, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let assessment: Record<string, unknown> = {}
    try { assessment = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { assessment = m ? JSON.parse(m[0]) : {} } catch { assessment = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'sage',
      action_type: 'decision_logged',
      description: `Decision: "${decision.slice(0, 80)}"`,
      metadata: {
        decision,
        reasoning: reasoning ?? null,
        alternatives: alternatives ?? null,
        expectedOutcome: expectedOutcome ?? null,
        category: category ?? 'general',
        assessment,
      },
    })

    return NextResponse.json({ ok: true, assessment, decision, category })
  } catch (err) {
    console.error('Sage decisions POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
