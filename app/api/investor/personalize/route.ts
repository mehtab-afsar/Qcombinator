import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/investor/personalize
// Called at the end of investor onboarding — uses AI to score founders
// against this investor's thesis and store personalized match data.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 1. Fetch investor profile ──────────────────────────────────────────
    const { data: investor } = await supabase
      .from('investor_profiles')
      .select('full_name, firm_name, thesis, deal_flow_strategy, sectors, stages, check_sizes, geography, aum, firm_type')
      .eq('user_id', user.id)
      .single()

    if (!investor) {
      return NextResponse.json({ error: 'Investor profile not found' }, { status: 404 })
    }

    // ── 2. Fetch founders with Q-scores ────────────────────────────────────
    const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const admin = createAdmin(adminUrl, adminKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: founders } = await admin
      .from('founder_profiles')
      .select('user_id, full_name, startup_name, industry, stage, tagline, location, funding')
      .eq('onboarding_completed', true)
      .eq('role', 'founder')
      .limit(30)

    // For each founder get their latest Q-Score
    type FounderRow = { user_id: string; full_name: string; startup_name: string | null; industry: string | null; stage: string | null; tagline: string | null; location: string | null; funding: string | null }
    const enriched: { id: string; name: string; sector: string; stage: string; tagline: string; qScore: number }[] = []
    if (founders && founders.length > 0) {
      for (const f of founders as FounderRow[]) {
        const { data: qrow } = await admin
          .from('qscore_history')
          .select('overall_score')
          .eq('user_id', f.user_id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single()
        enriched.push({
          id: f.user_id,
          name: f.startup_name || f.full_name,
          sector: f.industry ?? 'Unknown',
          stage: f.stage ?? 'Unknown',
          tagline: f.tagline ?? '',
          qScore: qrow?.overall_score ?? 0,
        })
      }
    }

    // ── 3. Build AI prompt ─────────────────────────────────────────────────
    const investorSummary = [
      investor.firm_name ? `Firm: ${investor.firm_name}` : '',
      investor.firm_type ? `Type: ${investor.firm_type}` : '',
      investor.aum ? `AUM: ${investor.aum}` : '',
      investor.sectors?.length ? `Sectors: ${investor.sectors.join(', ')}` : '',
      investor.stages?.length ? `Stages: ${investor.stages.join(', ')}` : '',
      investor.check_sizes?.length ? `Check sizes: ${investor.check_sizes.join(', ')}` : '',
      investor.geography?.length ? `Geography: ${investor.geography.join(', ')}` : '',
      investor.thesis ? `Thesis: ${investor.thesis}` : '',
      investor.deal_flow_strategy ? `Deal sourcing: ${investor.deal_flow_strategy}` : '',
    ].filter(Boolean).join('\n')

    const founderList = enriched.length > 0
      ? enriched.map(f =>
          `ID: ${f.id} | ${f.name} | Sector: ${f.sector} | Stage: ${f.stage} | Q-Score: ${f.qScore} | "${f.tagline}"`
        ).join('\n')
      : 'No founders with completed profiles yet.'

    const prompt = `You are an investment analyst for a VC platform. Analyze this investor's profile and, if founders are listed, score each one for fit.

INVESTOR PROFILE:
${investorSummary}

FOUNDERS ON PLATFORM:
${founderList}

Return ONLY valid JSON (no markdown, no explanation):
{
  "insight": "<2-3 sentence personalized insight about what this investor will find on the platform, their likely deal flow, and one piece of advice for using the platform effectively>",
  "matches": {
    "<founder_id>": { "score": <0-100 integer>, "reason": "<one sentence why they match or don't>" }
  }
}

If there are no founders, return an empty matches object. Score based on sector fit, stage fit, and Q-Score quality. Do not invent founder IDs.`

    // ── 4. Call AI ─────────────────────────────────────────────────────────
    let insight = `Welcome, ${investor.full_name || 'investor'}. Your deal flow is being curated based on your thesis. Check back as founders complete their Q-Score assessments.`
    const matches: Record<string, { score: number; reason: string }> = {}

    try {
      const raw = await callOpenRouter(
        [{ role: 'user', content: prompt }],
        { maxTokens: 1024, temperature: 0.3 },
      )
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      const parsed = JSON.parse(cleaned)
      if (parsed.insight) insight = parsed.insight
      if (parsed.matches && typeof parsed.matches === 'object') {
        Object.assign(matches, parsed.matches)
      }
    } catch {
      // AI call failed — proceed with fallback insight, empty matches
    }

    // ── 5. Save to DB ──────────────────────────────────────────────────────
    const personalization = { insight, matches, generated_at: new Date().toISOString() }

    await supabase
      .from('investor_profiles')
      .update({ ai_personalization: personalization })
      .eq('user_id', user.id)

    return NextResponse.json({ insight, matches })
  } catch (err) {
    console.error('Personalize error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
