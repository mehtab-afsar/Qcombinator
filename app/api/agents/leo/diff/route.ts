import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/diff
// Compares two versions of a legal document (e.g., SAFE, NDA, term sheet).
// Returns a structured diff: what changed, what it means, what to negotiate.
// Body: { docType, original, revised }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { docType = 'contract', original, revised } = body as {
      docType?: string
      original: string
      revised: string
    }

    if (!original?.trim() || !revised?.trim()) {
      return NextResponse.json({ error: 'Both original and revised document text are required' }, { status: 400 })
    }

    // Truncate to avoid token overflow
    const truncate = (s: string, max = 3000) => s.trim().length > max ? s.trim().slice(0, max) + '\n[... truncated ...]' : s.trim()

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Leo, a startup legal advisor. Compare two versions of a legal document and explain every meaningful change.
Return ONLY valid JSON:
{
  "summary": "1-2 sentence overview of what changed and the overall direction (more favorable/less favorable to founder)",
  "overallImpact": "founder_favorable | neutral | investor_favorable",
  "changes": [
    {
      "section": "section or clause name",
      "type": "added | removed | modified | tightened | loosened",
      "original": "what it said before — null if added",
      "revised": "what it says now — null if removed",
      "explanation": "what this change means in plain English",
      "severity": "major | moderate | minor",
      "founderImpact": "how this affects the founder specifically"
    }
  ],
  "redFlags": ["any changes that significantly harm the founder — empty if none"],
  "winsBySide": {
    "founder": ["changes that benefit the founder"],
    "investor": ["changes that benefit the investor"]
  },
  "negotiationAdvice": "top 1-2 things to push back on — null if changes are acceptable"
}
Rules:
- Focus on material changes only (skip formatting/punctuation)
- Use plain English for all explanations
- Severity: major = affects economics/control/exit; moderate = affects operations; minor = clarifications`,
        },
        {
          role: 'user',
          content: `Document type: ${docType}

ORIGINAL VERSION:
${truncate(original)}

REVISED VERSION:
${truncate(revised)}`,
        },
      ],
      { maxTokens: 1000, temperature: 0.2 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let diff: Record<string, unknown> = {}
    try { diff = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { diff = m ? JSON.parse(m[0]) : {} } catch { diff = {} } }

    await supabase.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'leo',
      action_type: 'document_diff',
      description: `Document diff: ${docType} — ${(diff.changes as unknown[])?.length ?? 0} changes found`,
      metadata: { docType, overallImpact: diff.overallImpact, changeCount: (diff.changes as unknown[])?.length ?? 0 },
    }).then(() => {})

    return NextResponse.json({ diff, docType })
  } catch (err) {
    console.error('Leo diff error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
