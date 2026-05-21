import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

interface EnrichmentInput {
  userId: string
  // Narrative fields from profile builder sections
  problemStory?: string
  advantages?: string[]
  founderMarketFit?: string
  // IP / moat signals from section 3
  knowHowDensity?: string
  technicalDepth?: string
  patentDescription?: string
  buildComplexity?: string
  // Market signals from section 2
  marketUrgency?: string
  valuePool?: string
  competitorDensityContext?: string
  targetCustomers?: string
  tamDescription?: string
  // Financial signals from section 5
  mrr?: number
  monthlyBurn?: number
  runway?: number
  // Context
  stage?: string
  sector?: string
}

interface EnrichmentResult {
  solution?: string
  moat?: string
  businessModel?: string
  uniquePosition?: string
  ltv?: string
}

export async function deriveInvestorFields(input: EnrichmentInput): Promise<void> {
  const {
    userId,
    problemStory, advantages = [], founderMarketFit,
    knowHowDensity, technicalDepth, patentDescription, buildComplexity,
    marketUrgency, valuePool, competitorDensityContext, targetCustomers,
    mrr, monthlyBurn, runway,
    stage = 'early', sector = 'technology',
  } = input

  const hasEnoughData = problemStory || advantages.length > 0 || founderMarketFit || knowHowDensity || marketUrgency

  if (!hasEnoughData) return

  try {
    const client = new Anthropic()

    const contextBlock = [
      problemStory   ? `Founder's problem story: "${problemStory}"`         : '',
      advantages.length > 0 ? `Competitive advantages: ${advantages.join('; ')}`   : '',
      founderMarketFit  ? `Founder-market fit: "${founderMarketFit}"`              : '',
      knowHowDensity    ? `Technical know-how: "${knowHowDensity}"`                : '',
      technicalDepth    ? `Technical depth: "${technicalDepth}"`                   : '',
      patentDescription ? `IP/Patent: "${patentDescription}"`                      : '',
      buildComplexity   ? `Build complexity: ${buildComplexity}`                    : '',
      marketUrgency     ? `Market timing / why now: "${marketUrgency}"`             : '',
      valuePool         ? `Value pool / market opportunity: "${valuePool}"`         : '',
      competitorDensityContext ? `Competitive landscape: "${competitorDensityContext}"` : '',
      targetCustomers   ? `Target customers: "${targetCustomers}"`                  : '',
      mrr               ? `Current MRR: $${mrr}`                                    : '',
      runway            ? `Runway: ${runway} months`                                : '',
      `Stage: ${stage}, Sector: ${sector}`,
    ].filter(Boolean).join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are a startup analyst. Based on the founder's profile builder data below, derive 4 concise investor-facing fields. Be factual and grounded in the data provided. Do not invent facts.

${contextBlock}

Return ONLY a JSON object (no markdown) with these exact keys:
{
  "solution": "1–2 sentence description of what the product does and the problem it solves",
  "moat": "1–2 sentence description of their competitive defensibility / moat",
  "businessModel": "1 sentence on how they make money (e.g. SaaS subscription, marketplace commission, usage-based)",
  "uniquePosition": "1 sentence on what uniquely positions them in the market"
}

If a field cannot be determined from the data, return an empty string "" for that field.`,
      }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return

    let derived: EnrichmentResult = {}
    try {
      const raw = textBlock.text.trim()
      const jsonStr = raw.startsWith('{') ? raw : raw.slice(raw.indexOf('{'))
      derived = JSON.parse(jsonStr) as EnrichmentResult
    } catch {
      log.warn('ai-enrichment: failed to parse LLM JSON', { userId })
      return
    }

    // Only write non-empty fields
    const toWrite: Record<string, string | boolean> = { _aiDerived: true }
    if (derived.solution)       toWrite.solution       = derived.solution
    if (derived.moat)           toWrite.moat           = derived.moat
    if (derived.businessModel)  toWrite.businessModel  = derived.businessModel
    if (derived.uniquePosition) toWrite.uniquePosition = derived.uniquePosition

    if (Object.keys(toWrite).length <= 1) return

    const admin = createAdminClient()

    // Merge into existing startup_profile_data without overwriting user-entered fields
    const { data: current } = await admin
      .from('founder_profiles')
      .select('startup_profile_data')
      .eq('user_id', userId)
      .single()

    const existing = ((current?.startup_profile_data ?? {}) as Record<string, unknown>)

    // Only fill gaps — don't overwrite if field already has a real value
    const merged: Record<string, unknown> = { ...existing }
    for (const [key, val] of Object.entries(toWrite)) {
      if (!existing[key] || existing[key] === '') {
        merged[key] = val
      }
    }

    await admin
      .from('founder_profiles')
      .update({ startup_profile_data: merged })
      .eq('user_id', userId)

  } catch (err) {
    log.error('ai-enrichment: failed', { userId, err })
    // non-blocking — caller should not await
  }
}
