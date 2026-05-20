import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/investor/ai-analysis/chat
// Streams a response about the investor's deal flow portfolio.
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const { message, history = [] } = await req.json() as {
      message: string
      history: Array<{ role: 'user' | 'assistant'; content: string }>
    }
    if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

    const admin = createAdminClient()

    // Verify investor access + load profile
    const { data: investorRow } = await admin
      .from('investor_profiles')
      .select('subscription_tier, full_name, firm_name, thesis, focus_sectors, focus_stages')
      .eq('user_id', user.id)
      .maybeSingle()

    if (investorRow?.subscription_tier === 'free') {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })
    }

    // Fetch portfolio data to ground the AI
    const [{ data: founders }, { data: scores }, { data: pipeline }] = await Promise.all([
      admin
        .from('founder_profiles')
        .select('user_id, startup_name, full_name, industry, stage, startup_profile_data, updated_at')
        .neq('role', 'investor')
        .order('updated_at', { ascending: false })
        .limit(60),
      admin
        .from('qscore_history')
        .select('user_id, overall_score, grade, calculated_at')
        .order('calculated_at', { ascending: false })
        .limit(300),
      admin
        .from('investor_pipeline')
        .select('founder_id, stage')
        .eq('investor_id', user.id),
    ])

    // Deduplicate: keep latest score per founder
    const latestScore: Record<string, { score: number; grade: string }> = {}
    for (const s of (scores ?? [])) {
      if (!latestScore[s.user_id]) latestScore[s.user_id] = { score: s.overall_score, grade: s.grade }
    }

    const pipelineMap: Record<string, string> = {}
    for (const p of (pipeline ?? [])) pipelineMap[p.founder_id] = p.stage

    const founderLines = (founders ?? []).map(f => {
      const sp = (f.startup_profile_data ?? {}) as Record<string, unknown>
      const name = f.startup_name || (sp.companyName as string) || f.full_name
      const q = latestScore[f.user_id]
      const ps = pipelineMap[f.user_id]
      return `• ${name} | ${f.industry || 'Unknown'} | ${f.stage || 'Unknown stage'} | Q-Score: ${q ? `${q.score} (${q.grade})` : 'Not assessed'}${ps ? ` | Pipeline: ${ps}` : ''}`
    }).join('\n')

    const systemPrompt = `You are a sharp deal analyst AI for ${investorRow?.firm_name || 'the firm'}${investorRow?.full_name ? `, supporting ${investorRow.full_name}` : ''}.

Your job: give clear, specific, data-driven answers about this investor's deal flow. Reference real companies, Q-Scores, and pipeline stages from the data below. Be direct — no filler, no hedging.

INVESTOR PROFILE:
Firm: ${investorRow?.firm_name || 'Independent'}
Thesis: ${investorRow?.thesis || 'Not specified'}
Focus sectors: ${((investorRow?.focus_sectors as string[] | null) ?? []).join(', ') || 'All sectors'}
Focus stages: ${((investorRow?.focus_stages as string[] | null) ?? []).join(', ') || 'All stages'}

DEAL FLOW (${(founders ?? []).length} companies):
${founderLines || 'No companies in pipeline yet.'}

Rules:
- Answer only from the data above — don't fabricate Q-Scores or details
- When asked "who should I contact", rank by Q-Score ≥ 70 first, then pipeline stage
- Keep answers concise and structured with bullet points when listing companies
- If data is missing for a question, say so and suggest what info would help`

    const messages: Anthropic.MessageParam[] = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ]

    // SSE stream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = await anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1500,
            system: systemPrompt,
            messages,
          })

          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        } catch (e) {
          log.error('investor ai-analysis chat stream', { e })
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    log.error('POST /api/investor/ai-analysis/chat', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
