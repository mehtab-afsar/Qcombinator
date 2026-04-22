import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import Anthropic from '@anthropic-ai/sdk'

const anthropicKey = process.env.ANTHROPIC_API_KEY

// POST /api/investor/startup/[id]/chat
// Answers investor questions about a startup strictly from DB data.
// Returns { answer: string } or { unanswerable: true, founderName: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id: founderId } = await params
    const body = await req.json()
    const question: string = (body.question ?? '').trim()

    if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 })
    if (!anthropicKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

    const admin = createAdminClient()

    // Fetch all startup data in parallel
    const [
      { data: profile },
      { data: qrow },
      { data: artifacts },
    ] = await Promise.all([
      admin
        .from('founder_profiles')
        .select('full_name, startup_name, industry, stage, tagline, location, funding, startup_profile_data, team_size')
        .eq('user_id', founderId)
        .single(),
      admin
        .from('qscore_history')
        .select('overall_score, percentile, grade, market_score, product_score, gtm_score, financial_score, team_score, traction_score, calculated_at, iq_breakdown')
        .eq('user_id', founderId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('agent_artifacts')
        .select('artifact_type, content, created_at')
        .eq('user_id', founderId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (!profile) return NextResponse.json({ error: 'Founder not found' }, { status: 404 })

    const sp = (profile.startup_profile_data ?? {}) as Record<string, unknown>

    // Build latest artifact by type
    const latestByType: Record<string, Record<string, unknown>> = {}
    for (const art of artifacts ?? []) {
      if (!latestByType[art.artifact_type]) {
        latestByType[art.artifact_type] = art.content as Record<string, unknown>
      }
    }
    const fin  = latestByType['financial_summary'] ?? {}
    const hire = latestByType['hiring_plan']        ?? {}
    const comp = latestByType['competitive_matrix'] ?? {}

    // Serialize startup data as structured context for Claude
    const startupContext = {
      name:         profile.startup_name || (sp.companyName as string) || `${profile.full_name}'s Startup`,
      founderName:  profile.full_name,
      industry:     profile.industry,
      stage:        profile.stage,
      location:     profile.location,
      tagline:      profile.tagline || (sp.oneLiner as string) || '',
      problemStatement: (sp.problemStatement as string) || '',
      solution:     (sp.solution as string) || '',
      whyNow:       (sp.whyNow as string) || '',
      moat:         (sp.moat as string) || '',
      businessModel:(sp.businessModel as string) || '',
      differentiation: (sp.differentiation as string) || '',
      tamSize:      (sp.tamSize as string) || '',
      marketGrowth: (sp.marketGrowth as string) || '',
      customerType: (sp.customerPersona as string) || (sp.targetCustomer as string) || '',
      teamSize:     (profile.team_size as string) || (sp.teamSize as string) || '',
      advisors:     (sp.advisors as string[]) || [],
      keyHires:     (sp.keyHires as string[]) || [],
      raisingAmount:(sp.raisingAmount as string) || (profile.funding as string) || '',
      useOfFunds:   (sp.useOfFunds as string) || '',
      previousFunding: (sp.previousFunding as string) || '',
      runwayRemaining: (sp.runwayRemaining as string) || (sp.runway as string) || (fin.runway as string) || '',
      qScore: qrow ? {
        overall: qrow.overall_score,
        percentile: qrow.percentile,
        grade: qrow.grade,
        market: qrow.market_score,
        product: qrow.product_score,
        gtm: qrow.gtm_score,
        financial: qrow.financial_score,
        team: qrow.team_score,
        traction: qrow.traction_score,
        calculatedAt: qrow.calculated_at,
      } : null,
      financials: {
        mrr:        (fin.mrr as string) || (sp.mrr as string) || (sp.currentMRR as string) || '',
        arr:        (fin.arr as string) || (sp.arr as string) || '',
        burnRate:   (fin.burnRate as string) || (sp.burnRate as string) || '',
        runway:     (fin.runway as string) || (sp.runway as string) || '',
        customers:  (fin.customers as string) || (sp.customerCount as string) || '',
        grossMargin:(fin.grossMargin as string) || (sp.grossMargin as string) || '',
        cac:        (fin.cac as string) || (sp.cac as string) || '',
        ltv:        (fin.ltv as string) || (sp.ltv as string) || '',
      },
      team: (hire.teamMembers as unknown[]) || [],
      competitors: (comp.competitors as unknown[]) || (sp.competitors as unknown[]) || [],
    }

    // Build Claude system prompt — strict data-only answering
    const systemPrompt = `You are a concise investment research assistant answering questions about a specific startup for an investor.

STRICT RULES:
1. Answer ONLY using the startup data provided below. Do not extrapolate, infer, or invent anything not explicitly in the data.
2. If the answer cannot be found in the data, respond with EXACTLY this JSON: {"unanswerable": true}
3. Keep answers to 2-3 sentences maximum. Be precise and factual.
4. When citing a number or fact, mention where it comes from (e.g. "Per their Q-Score assessment...", "From their profile...").
5. Do not give investment advice or recommendations.

STARTUP DATA:
${JSON.stringify(startupContext, null, 2)}`

    const client = new Anthropic({ apiKey: anthropicKey })
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 400,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    })

    // Extract text from response
    const textBlock = message.content.find(b => b.type === 'text')
    const rawText = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    // Check if Claude returned an unanswerable signal
    try {
      const parsed = JSON.parse(rawText)
      if (parsed.unanswerable === true) {
        return NextResponse.json({ unanswerable: true, founderName: profile.full_name })
      }
    } catch { /* not JSON — normal answer */ }

    return NextResponse.json({ answer: rawText })
  } catch (err) {
    log.error('POST /api/investor/startup/[id]/chat', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
