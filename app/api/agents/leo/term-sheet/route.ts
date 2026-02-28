import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/term-sheet
// Body: { text } — raw term sheet text (paste)
// Returns: { flags[], summary, overallRisk, highlights[] }

interface TermSheetFlag {
  clause: string
  severity: 'high' | 'medium' | 'low'
  explanation: string
  recommendation: string
  standardMarket?: string
}

interface TermSheetHighlight {
  clause: string
  value: string
  comment: string
  verdict: 'good' | 'standard' | 'watch'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { text } = await request.json() as { text: string }
    if (!text?.trim() || text.trim().length < 100) {
      return NextResponse.json({ error: 'Term sheet text (min 100 chars) is required' }, { status: 400 })
    }

    const prompt = `You are Leo, a startup attorney with 15 years of experience advising seed and Series A founders. A founder pasted in their term sheet or SAFE. Analyze it for red flags and explain each clause in plain language.

TERM SHEET TEXT:
"""
${text.slice(0, 4000)}
"""

Identify red flags (clauses that are unusual, founder-unfriendly, or need negotiation) and key highlights (what was actually agreed). Be specific — quote or paraphrase the exact language causing concern.

Return ONLY valid JSON with this exact shape:
{
  "overallRisk": "low|medium|high",
  "summary": "2-3 sentence plain-English summary of what this document says and the overall risk level",
  "flags": [
    {
      "clause": "Name of the clause",
      "severity": "high|medium|low",
      "explanation": "What this clause means in plain English and why it matters",
      "recommendation": "What to do — accept, negotiate, or reject and why",
      "standardMarket": "What market-standard looks like for this clause (optional)"
    }
  ],
  "highlights": [
    {
      "clause": "Valuation cap / discount / rate",
      "value": "e.g. $8M post-money cap",
      "comment": "Brief context on whether this is reasonable",
      "verdict": "good|standard|watch"
    }
  ]
}`

    const raw = await callOpenRouter(
      [{ role: 'user', content: prompt }],
      { maxTokens: 1200, temperature: 0.2 },
    )

    let parsed: { overallRisk: string; summary: string; flags: TermSheetFlag[]; highlights: TermSheetHighlight[] }
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch?.[0] ?? raw)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Log activity
    try {
      const flagCount = parsed.flags?.length ?? 0
      const highFlags = parsed.flags?.filter(f => f.severity === 'high').length ?? 0
      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'leo',
        action_type: 'term_sheet_analysis',
        description: `Term sheet analyzed — ${flagCount} flags (${highFlags} high severity) · overall risk: ${parsed.overallRisk}`,
        metadata:    { flagCount, highFlags, overallRisk: parsed.overallRisk },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      overallRisk: parsed.overallRisk ?? 'medium',
      summary:     parsed.summary ?? '',
      flags:       parsed.flags ?? [],
      highlights:  parsed.highlights ?? [],
    })
  } catch (err) {
    console.error('Leo term-sheet error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
