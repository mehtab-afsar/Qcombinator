import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/runway-cuts
// Body: { runwayMonths, burnRate?, mrr?, snapshot?, artifactId? }
// Uses LLM to identify the biggest cost reduction levers and prioritise cuts.
// Returns: { cuts: CutItem[], summary: string }

interface CutItem {
  category: string
  potentialSaving: string
  action: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeframe: string
  rationale: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { runwayMonths, burnRate, mrr, snapshot = {}, artifactId } = await request.json() as {
      runwayMonths: number
      burnRate?: number
      mrr?: number
      snapshot?: Record<string, string>
      artifactId?: string
    }

    if (typeof runwayMonths !== 'number') {
      return NextResponse.json({ error: 'runwayMonths is required' }, { status: 400 })
    }

    const urgency = runwayMonths <= 2 ? 'CRITICAL' : runwayMonths <= 4 ? 'HIGH' : 'MEDIUM'

    // Build a financial context string from what we have
    const contextParts: string[] = []
    if (runwayMonths) contextParts.push(`Runway: ${runwayMonths} months (${urgency})`)
    if (burnRate)     contextParts.push(`Monthly burn: $${burnRate.toLocaleString()}`)
    if (mrr)          contextParts.push(`MRR: $${mrr.toLocaleString()}`)
    // Add any snapshot fields
    for (const [k, v] of Object.entries(snapshot)) {
      if (v && !contextParts.some(p => p.toLowerCase().includes(k.toLowerCase()))) {
        contextParts.push(`${k}: ${v}`)
      }
    }

    const prompt = `You are Felix, an expert startup CFO. A founder has ${runwayMonths} months of runway — this is a ${urgency} situation.

Financial snapshot:
${contextParts.join('\n')}

Analyse common startup expense categories and identify the top 5-7 specific cost cuts that could meaningfully extend runway. Be specific, practical, and rank by impact × ease.

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "summary": "one or two sentence executive summary of the overall recommendation",
  "totalPotentialSavings": "e.g. $8,000–$15,000/mo",
  "cuts": [
    {
      "category": "e.g. SaaS Tools",
      "potentialSaving": "e.g. $1,200/mo",
      "action": "Specific, concrete action the founder should take",
      "difficulty": "easy|medium|hard",
      "timeframe": "e.g. 1 week",
      "rationale": "One sentence explaining why this is the right cut"
    }
  ]
}`

    const raw = await callOpenRouter(
      [{ role: 'user', content: prompt }],
      { maxTokens: 900, temperature: 0.3 },
    )

    let parsed: { summary: string; totalPotentialSavings?: string; cuts: CutItem[] }
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch?.[0] ?? raw)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Log to agent_activity
    try {
      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'felix',
        action_type: 'runway_cuts_analysis',
        description: `Runway cuts analysis — ${runwayMonths} months remaining (${urgency}) — potential savings: ${parsed.totalPotentialSavings ?? 'unknown'}`,
        metadata:    { runwayMonths, urgency, artifactId, cutsCount: parsed.cuts?.length ?? 0 },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      cuts: parsed.cuts ?? [],
      summary: parsed.summary ?? '',
      totalPotentialSavings: parsed.totalPotentialSavings ?? '',
      urgency,
    })
  } catch (err) {
    console.error('Felix runway-cuts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
