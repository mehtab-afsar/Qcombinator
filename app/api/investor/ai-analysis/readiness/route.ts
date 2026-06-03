/**
 * POST /api/investor/ai-analysis/readiness
 *
 * Multi-agent synthesis: fans out to 4 specialist agents in parallel,
 * then Sage synthesises their outputs into one investor-grade readiness report.
 *
 * This is the core of the investor due-diligence product:
 *   - Wall-clock time = slowest of the 4 parallel reads, NOT 4× sequential
 *   - Each dimension is read independently (no agent sees another's analysis)
 *   - Sage synthesises with full visibility into all four
 *
 * Body: { founderId: string }
 * Returns: { report: ReadinessReport }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { llmChat } from '@/lib/llm/provider'
import { log } from '@/lib/logger'

export interface ReadinessDimension {
  score:    number          // 0–100
  label:    string          // e.g. "Strong" | "Developing" | "Weak" | "Unknown"
  headline: string          // one line summary
  bullets:  string[]        // 3 supporting points
  gaps:     string[]        // 1-2 gaps or risks
}

export interface ReadinessReport {
  founderId:       string
  founderName:     string
  startupName:     string
  overallScore:    number
  overallVerdict:  string   // "Fundable" | "Promising — needs work" | "Too early"
  summary:         string   // 2-3 sentence investor brief
  dimensions: {
    financial:   ReadinessDimension
    gtm:         ReadinessDimension
    market:      ReadinessDimension
    product:     ReadinessDimension
  }
  nextSteps:       string[]  // what an investor should do next
  generatedAt:     string
}

// ─── Per-dimension analyser prompts ──────────────────────────────────────────
// Each runs in parallel with no awareness of the other dimensions.

const DIMENSION_PROMPTS: Record<string, { system: string; artifactTypes: string[] }> = {
  financial: {
    artifactTypes: ['financial_summary'],
    system: `You are a VC analyst assessing a startup's financial health.
Given the available data, return a JSON object with:
{
  "score": <0-100 integer>,
  "label": "<Strong|Developing|Weak|Unknown>",
  "headline": "<one sentence: the single most important financial signal>",
  "bullets": ["<3 specific supporting evidence points>"],
  "gaps": ["<1-2 specific financial gaps or risks>"]
}
Score guide: 80+ = strong, 60-79 = developing, 40-59 = weak, <40 = unknown/insufficient data.
Be specific. Use numbers if available. Return JSON only.`,
  },
  gtm: {
    artifactTypes: ['icp_document', 'gtm_playbook', 'outreach_sequence'],
    system: `You are a VC analyst assessing a startup's go-to-market readiness.
Given the available data, return a JSON object with:
{
  "score": <0-100 integer>,
  "label": "<Strong|Developing|Weak|Unknown>",
  "headline": "<one sentence: the single most important GTM signal>",
  "bullets": ["<3 specific supporting evidence points>"],
  "gaps": ["<1-2 specific GTM gaps or risks>"]
}
Score guide: 80+ = clear ICP + proven channel + traction, 60-79 = ICP defined + some channel, 40-59 = ICP fuzzy + no channel, <40 = insufficient data.
Be specific. Return JSON only.`,
  },
  market: {
    artifactTypes: ['competitive_matrix', 'market_analysis'],
    system: `You are a VC analyst assessing market opportunity and competitive position.
Given the available data, return a JSON object with:
{
  "score": <0-100 integer>,
  "label": "<Strong|Developing|Weak|Unknown>",
  "headline": "<one sentence: the single most important market signal>",
  "bullets": ["<3 specific supporting evidence points>"],
  "gaps": ["<1-2 specific market gaps or risks>"]
}
Score guide: 80+ = large market + clear differentiation + weak competitors, 60-79 = good market + some differentiation, <60 = crowded/small/unclear.
Be specific. Return JSON only.`,
  },
  product: {
    artifactTypes: ['pmf_survey', 'product_roadmap'],
    system: `You are a VC analyst assessing product-market fit and product quality.
Given the available data, return a JSON object with:
{
  "score": <0-100 integer>,
  "label": "<Strong|Developing|Weak|Unknown>",
  "headline": "<one sentence: the single most important product signal>",
  "bullets": ["<3 specific supporting evidence points>"],
  "gaps": ["<1-2 specific product gaps or risks>"]
}
Score guide: 80+ = strong PMF signal + clear roadmap, 60-79 = early validation + unclear roadmap, <60 = pre-validation.
Be specific. Return JSON only.`,
  },
}

const SYNTHESIS_PROMPT = `You are Sage, a senior VC advisor, synthesising a multi-dimensional analysis of a startup for an investor.

You have received dimension scores from four independent specialist analyses:
- Financial health
- Go-to-market readiness
- Market opportunity
- Product-market fit

Based on all four dimensions plus the founder and Q-Score context provided, produce a synthesis JSON:
{
  "overallScore": <weighted average, 0-100>,
  "overallVerdict": "<Fundable|Promising — needs work|Too early>",
  "summary": "<2-3 sentences for an investor. Lead with the strongest signal, name the biggest risk, give a clear view.>",
  "nextSteps": ["<3 specific actionable things an investor should do or ask the founder>"]
}

Weighting: financial 25%, gtm 30%, market 25%, product 20%.
Verdict guide: Fundable = overall 70+, Promising = 50-69, Too early = <50.
Be honest. Investors trust you because you call it as you see it.
Return JSON only.`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreToLabel(score: number): string {
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Developing'
  if (score >= 40) return 'Weak'
  return 'Unknown'
}

async function analyseDimension(
  dimensionKey: string,
  artifacts: Array<{ artifact_type: string; content: unknown }>,
  founderContext: string,
): Promise<ReadinessDimension> {
  const cfg = DIMENSION_PROMPTS[dimensionKey]!
  const relevantArtifacts = artifacts.filter(a => cfg.artifactTypes.includes(a.artifact_type))

  const artifactText = relevantArtifacts.length > 0
    ? relevantArtifacts.map(a => `[${a.artifact_type}]\n${JSON.stringify(a.content).slice(0, 800)}`).join('\n\n')
    : 'No artifacts available for this dimension.'

  try {
    const response = await llmChat({
      messages: [
        { role: 'system', content: cfg.system },
        { role: 'user',   content: `Founder context:\n${founderContext}\n\nArtifact data:\n${artifactText}` },
      ],
      modelTier:   'fast',
      temperature: 0.1,
      maxTokens:   400,
    })

    const raw = (response.text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const parsed = JSON.parse(raw) as Partial<ReadinessDimension>

    return {
      score:    parsed.score    ?? 0,
      label:    parsed.label    ?? scoreToLabel(parsed.score ?? 0),
      headline: parsed.headline ?? 'Insufficient data to assess.',
      bullets:  parsed.bullets  ?? [],
      gaps:     parsed.gaps     ?? [],
    }
  } catch {
    return {
      score: 0, label: 'Unknown',
      headline: 'Analysis failed — insufficient data.',
      bullets: [], gaps: ['Unable to retrieve data for this dimension'],
    }
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json() as { founderId?: string }
    const founderId = body.founderId
    if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

    const admin = createAdminClient()

    // ── Investor tier gate ────────────────────────────────────────────────────
    const { data: investorProfile } = await admin
      .from('investor_profiles')
      .select('subscription_tier')
      .eq('user_id', auth.user.id)
      .single()

    if (!investorProfile || investorProfile.subscription_tier === 'free') {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })
    }

    // ── Fan-out: load all data in parallel ───────────────────────────────────
    // Four independent reads — wall-clock = slowest single query, not sum of all four
    const [
      founderResult,
      qScoreResult,
      artifactsResult,
      startupStateResult,
    ] = await Promise.allSettled([
      admin
        .from('founder_profiles')
        .select('full_name, startup_name, industry, stage, startup_profile_data')
        .eq('user_id', founderId)
        .single(),
      admin
        .from('qscore_history')
        .select('overall_score, p1_score, p2_score, p3_score, p4_score, p5_score, p6_score')
        .eq('user_id', founderId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
      admin
        .from('agent_artifacts')
        .select('agent_id, artifact_type, content')
        .eq('user_id', founderId)
        .in('artifact_type', [
          'financial_summary', 'icp_document', 'gtm_playbook', 'outreach_sequence',
          'competitive_matrix', 'market_analysis', 'pmf_survey', 'product_roadmap',
        ])
        .order('created_at', { ascending: false }),
      admin
        .from('startup_state')
        .select('mrr, monthly_burn, runway_months, pmf_score, paying_customer_count, team_size, open_deals_count')
        .eq('user_id', founderId)
        .single(),
    ])

    const founder      = founderResult.status      === 'fulfilled' ? founderResult.value.data       : null
    const qScore       = qScoreResult.status       === 'fulfilled' ? qScoreResult.value.data        : null
    const artifacts    = artifactsResult.status    === 'fulfilled' ? (artifactsResult.value.data ?? []) : []
    const startupState = startupStateResult.status === 'fulfilled' ? startupStateResult.value.data  : null

    if (!founder) {
      return NextResponse.json({ error: 'Founder not found' }, { status: 404 })
    }

    // Build founder context string for all dimension analysers
    const founderContext = [
      `Startup: ${founder.startup_name ?? 'Unknown'} (${founder.industry ?? ''}, ${founder.stage ?? ''})`,
      qScore ? `Q-Score: ${qScore.overall_score}/100` : '',
      startupState?.mrr              !== null && startupState?.mrr              !== undefined ? `MRR: $${startupState.mrr}` : '',
      startupState?.monthly_burn     !== null && startupState?.monthly_burn     !== undefined ? `Monthly burn: $${startupState.monthly_burn}` : '',
      startupState?.runway_months    !== null && startupState?.runway_months    !== undefined ? `Runway: ${startupState.runway_months} months` : '',
      startupState?.paying_customer_count !== null && startupState?.paying_customer_count !== undefined ? `Paying customers: ${startupState.paying_customer_count}` : '',
      startupState?.pmf_score        !== null && startupState?.pmf_score        !== undefined ? `PMF score: ${startupState.pmf_score}/100` : '',
      startupState?.team_size        !== null && startupState?.team_size        !== undefined ? `Team size: ${startupState.team_size}` : '',
      startupState?.open_deals_count !== null && startupState?.open_deals_count !== undefined ? `Open deals: ${startupState.open_deals_count}` : '',
    ].filter(Boolean).join(' | ')

    // ── Parallel dimension analysis ───────────────────────────────────────────
    // Each dimension runs independently — no awareness of other dimensions
    const [financial, gtm, market, product] = await Promise.all([
      analyseDimension('financial', artifacts, founderContext),
      analyseDimension('gtm',       artifacts, founderContext),
      analyseDimension('market',    artifacts, founderContext),
      analyseDimension('product',   artifacts, founderContext),
    ])

    // ── Sage synthesis ────────────────────────────────────────────────────────
    const dimensionSummary = `
Financial (${financial.score}/100): ${financial.headline}
GTM (${gtm.score}/100): ${gtm.headline}
Market (${market.score}/100): ${market.headline}
Product (${product.score}/100): ${product.headline}
`.trim()

    const synthResponse = await llmChat({
      messages: [
        { role: 'system', content: SYNTHESIS_PROMPT },
        { role: 'user',   content: `Founder context:\n${founderContext}\n\nDimension summaries:\n${dimensionSummary}` },
      ],
      modelTier:   'capable',
      temperature: 0.2,
      maxTokens:   500,
    })

    let synthesis: { overallScore: number; overallVerdict: string; summary: string; nextSteps: string[] }
    try {
      const raw = (synthResponse.text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
      synthesis = JSON.parse(raw)
    } catch {
      // Synthesis parse failed — compute fallback
      const avg = Math.round((financial.score + gtm.score + market.score + product.score) / 4)
      synthesis = {
        overallScore:   avg,
        overallVerdict: avg >= 70 ? 'Fundable' : avg >= 50 ? 'Promising — needs work' : 'Too early',
        summary:        'Multi-agent synthesis could not be completed. Review individual dimension scores.',
        nextSteps:      ['Review financial dimension', 'Review GTM dimension', 'Request updated Q-Score'],
      }
    }

    const report: ReadinessReport = {
      founderId,
      founderName:    founder.full_name    ?? 'Unknown',
      startupName:    founder.startup_name ?? 'Unknown',
      overallScore:   synthesis.overallScore,
      overallVerdict: synthesis.overallVerdict,
      summary:        synthesis.summary,
      dimensions:     { financial, gtm, market, product },
      nextSteps:      synthesis.nextSteps ?? [],
      generatedAt:    new Date().toISOString(),
    }

    return NextResponse.json({ report })
  } catch (err) {
    log.error('POST /api/investor/ai-analysis/readiness', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
