import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/contradictions
// Reads all agent artifacts and uses an LLM to detect strategic contradictions:
// e.g. "GTM targets SMBs but hiring plan has 2 enterprise sales reps"
// Returns a list of contradictions with severity and recommended resolution.

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

    // Fetch latest artifact of each type
    const ARTIFACT_TYPES = [
      'icp_document', 'outreach_sequence', 'gtm_playbook',
      'sales_script', 'brand_messaging', 'financial_summary',
      'legal_checklist', 'hiring_plan', 'pmf_survey',
      'competitive_matrix', 'strategic_plan', 'battle_card',
    ] as const

    const artifacts: Record<string, unknown> = {}

    await Promise.all(
      ARTIFACT_TYPES.map(async (type) => {
        const { data } = await admin
          .from('agent_artifacts')
          .select('artifact_type, content')
          .eq('user_id', user.id)
          .eq('artifact_type', type)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data?.content) {
          artifacts[type] = data.content
        }
      })
    )

    const availableTypes = Object.keys(artifacts)
    if (availableTypes.length < 2) {
      return NextResponse.json({
        error: 'Need at least 2 agent artifacts to detect contradictions. Build more deliverables first.',
      }, { status: 400 })
    }

    // Build a compact summary of each artifact for the LLM
    function summarize(type: string, content: unknown): string {
      const c = content as Record<string, unknown>
      switch (type) {
        case 'icp_document':
          return `ICP: Target customer — ${c.buyerPersona ?? c.summary ?? JSON.stringify(c).slice(0, 200)}`
        case 'gtm_playbook':
          return `GTM: Target market — ${c.targetMarket ?? ''} | Channels — ${Array.isArray(c.channels) ? (c.channels as string[]).join(', ') : c.channels ?? ''} | Timeline — ${c.timeline ?? ''}`
        case 'hiring_plan':
          return `Hiring: Next roles — ${Array.isArray(c.nextHires) ? (c.nextHires as Record<string,string>[]).map(h => h.role).join(', ') : ''} | Gaps — ${Array.isArray(c.currentGaps) ? (c.currentGaps as string[]).join(', ') : ''}`
        case 'brand_messaging':
          return `Brand: Positioning — ${c.positioningStatement ?? ''} | Tone — ${c.toneOfVoice ?? c.tone ?? ''}`
        case 'financial_summary':
          return `Finance: MRR — ${c.mrr ?? ''} | Runway — ${c.runway ?? ''} | Burn — ${c.burn ?? c.monthlyBurn ?? ''}`
        case 'strategic_plan':
          return `Strategy: Vision — ${c.vision ?? ''} | Core bets — ${Array.isArray(c.coreBets) ? (c.coreBets as string[]).join(', ') : ''} | Fundraising milestones — ${Array.isArray(c.fundraisingMilestones) ? (c.fundraisingMilestones as string[]).join('; ') : ''}`
        case 'competitive_matrix':
          return `Competitive: Our position — ${c.ourPosition ?? ''} | Top competitors — ${Array.isArray(c.competitors) ? (c.competitors as Record<string,string>[]).map(c => c.name ?? c).join(', ') : ''}`
        case 'pmf_survey':
          return `PMF: Target segment — ${c.targetSegment ?? ''}`
        case 'sales_script':
          return `Sales: Target persona — ${c.targetPersona ?? ''}`
        case 'outreach_sequence':
          return `Outreach: Subject — ${c.subject ?? ''}`
        case 'legal_checklist':
          return `Legal: Corp status — ${(c.incorporationStatus as Record<string,unknown>)?.status ?? ''}`
        default:
          return `${type}: ${JSON.stringify(c).slice(0, 150)}`
      }
    }

    const artifactSummaries = availableTypes
      .map(type => summarize(type, artifacts[type]))
      .join('\n\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Sage, a strategic advisor. Analyse a startup's agent artifacts and identify strategic contradictions, misalignments, or inconsistencies between them.

Return ONLY valid JSON:
{
  "contradictions": [
    {
      "area": "short category name (e.g. 'Targeting', 'Hiring vs GTM', 'Brand vs Sales')",
      "description": "1-2 sentences describing the specific contradiction",
      "artifactA": "which artifact/agent surfaces side A",
      "artifactB": "which artifact/agent surfaces side B",
      "severity": "high|medium|low",
      "recommendation": "1 sentence on how to resolve the contradiction"
    }
  ],
  "alignmentScore": 0-100,
  "summary": "1-2 sentences on the overall strategic alignment state",
  "strongestAlignments": ["1-2 areas where the strategy is well-aligned"]
}

Rules:
- Only flag real contradictions, not just differences in focus
- High severity: contradictions that will actively hurt execution (e.g. targeting opposite customer types)
- Medium: inefficiencies or inconsistencies worth addressing
- Low: minor mismatches that are common and fixable
- If the strategy is well-aligned, say so — don't invent contradictions`,
        },
        {
          role: 'user',
          content: `Analyse these artifacts for strategic contradictions:\n\n${artifactSummaries}`,
        },
      ],
      { maxTokens: 900, temperature: 0.35 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { parsed = m ? JSON.parse(m[0]) : {} } catch { parsed = {} } }

    // Log activity
    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'sage',
      action_type: 'contradictions_detected',
      description: `Strategic contradiction check — ${availableTypes.length} artifacts analysed, ${(parsed.contradictions as unknown[])?.length ?? 0} issues found`,
      metadata:    { artifactsAnalysed: availableTypes, alignmentScore: parsed.alignmentScore },
    })

    return NextResponse.json({ analysis: parsed, artifactsAnalysed: availableTypes.length })
  } catch (err) {
    console.error('Sage contradictions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
