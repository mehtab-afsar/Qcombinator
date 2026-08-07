/**
 * POST /api/executive/[executiveId]/chat — CANVAS_SPEC §4.6's chat rail.
 *
 * ⚠️ STATELESS BY DESIGN — read this before touching anything here. This is NOT the adviser-chat
 * surface ADR-034 deleted and CLAUDE.md says never to rebuild. The test that makes it safe: every
 * call is one independent turn — one message in, one grounded answer or one already-existing safe
 * action out. There is no `messages[]`/history field anywhere in this file, and there must never
 * be one — that's the entire difference between this and the deleted surface. See
 * lib/rhythm/direct.ts's own note and docs/Architecture.md's "stateless reasoning over versioned
 * memory" for the same rule applied elsewhere in this codebase.
 *
 * Three outcomes, never a fourth:
 *  - "initiate" (a real phrase match, e.g. "run the cycle now") → the SAME POST /api/rhythm/run
 *    a founder's own click already triggers. Not reimplemented here — reused, so idempotency and
 *    the circuit breaker never have a second copy to drift from (CLAUDE.md §0.3).
 *  - a real question → answered from real, bounded, fenced data. Cannot reach lib/actions/** at
 *    all — the safest way to keep ADR-004's approval gate un-bypassable is to never build a path
 *    that could reach it, the same reasoning lib/rhythm/direct.ts uses.
 *  - a steer-shaped request ("hold the outreach") → an honest decline. No pause/hold mechanism
 *    exists in this engine yet; inventing one here would be new engine machinery smuggled in as a
 *    chat feature, not this route's job.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, executiveChatSchema } from '@/lib/api/validate'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { getActivityForExecutive } from '@/lib/activity/log'
import { getBriefings, pickLatestPerProgram } from '@/lib/briefings/briefings'
import { getExecutive, ExecutiveNotFoundError } from '@/lib/registry'
import { getExecutivePrompt } from '@/lib/prompts/registry'
import { composeAdhocPrompt } from '@/lib/prompts/compose'
import { routedText } from '@/lib/llm/router'
import { matchesInitiateIntent } from '@/features/executive/lib/chat-intent'
import { env } from '@/lib/env'
import { log } from '@/lib/logger'

// Only the first 12 (already newest-first) activity entries and each program's bare verdict are
// fenced — bounding what goes INTO the model, not just guarding what comes out. Fencing all 50
// activity rows or a full briefing `body` here risks the same class of mistake the S002
// truncation bug taught this session.
const MAX_ACTIVITY_ENTRIES = 12

const INSTRUCTIONS = `You answer a founder's question about their own executive team's real work, or recognize when they're asking you to pause/hold/stop something.

STRICT RULES:
1. Answer ONLY using the data provided below. Never invent facts, numbers, or events not present in it.
2. If the message asks you to pause, hold, stop, or cancel any ongoing work, respond with EXACTLY this JSON and nothing else: {"decline":"steer"}
3. If the answer cannot be found in the data below, respond with EXACTLY this JSON and nothing else: {"decline":"unanswerable"}
4. Otherwise, answer in 2-3 sentences maximum, in your own voice as described above.`

type ChatResult =
  | { kind: 'answer'; text: string }
  | { kind: 'initiated'; runId: string; cycleKey: string }
  | { kind: 'declined'; reason: string }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ executiveId: string }> },
): Promise<NextResponse> {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { executiveId } = await params
    let executive
    try {
      executive = getExecutive(executiveId)
    } catch (err) {
      if (err instanceof ExecutiveNotFoundError) {
        return NextResponse.json({ error: 'Unknown executive' }, { status: 404 })
      }
      throw err
    }

    const parsed = await parseBody(req, executiveChatSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { message } = parsed.data

    const supabase = await createClient()
    const contract = await getCurrentContract(supabase, auth.user.id)
    if (!contract || contract.status !== 'confirmed') {
      return NextResponse.json({ error: 'No confirmed mandate — there is nothing to ask yet.' }, { status: 400 })
    }
    const programs = await getProgramsForContract(supabase, contract.id)
    const owned = programs.filter(p => p.owner === executiveId)
    if (owned.length === 0) {
      return NextResponse.json({ error: `${executive.name} has no active program in your current mandate.` }, { status: 400 })
    }

    // "initiate" — a real phrase match, before any LLM call. The only branch with a side effect.
    if (matchesInitiateIntent(message)) {
      const res = await fetch(`${env.appUrl}/api/rhythm/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward the founder's own session so /api/rhythm/run's own auth check applies exactly
          // as it would to a direct click — this route grants nothing extra.
          cookie: req.headers.get('cookie') ?? '',
        },
        body: '{}',
      })
      const data = await res.json()
      if (!res.ok) {
        // Already ran this week, no confirmed mandate, or the circuit breaker — surfaced as an
        // honest decline, not a raw error.
        const result: ChatResult = { kind: 'declined', reason: data.error ?? 'Could not start the cycle.' }
        return NextResponse.json(result)
      }
      const result: ChatResult = { kind: 'initiated', runId: data.runId, cycleKey: data.cycleKey }
      return NextResponse.json(result)
    }

    // Everything else: one grounded LLM call that both answers and recognizes steer-shaped asks.
    const activity = (await getActivityForExecutive(supabase, auth.user.id, executiveId, programs))
      .slice(0, MAX_ACTIVITY_ENTRIES)
    const latestBriefings = pickLatestPerProgram(await getBriefings(supabase, auth.user.id))
      .filter(b => owned.some(p => p.id === b.programId))
      .map(b => ({ program: b.programId, verdict: b.verdict }))

    const voice = getExecutivePrompt(executive.systemPromptRef)
    const messages = composeAdhocPrompt({
      sourceRef: `executive/${executiveId}/chat`,
      instructions: `${voice}\n\n${INSTRUCTIONS}`,
      data: JSON.stringify({ recentActivity: activity, latestBriefings }, null, 2),
    })
    messages.push({ role: 'user', content: message })

    const raw = (await routedText('reasoning', messages, { maxTokens: 300 })).trim()

    try {
      const parsedReply = JSON.parse(raw)
      if (parsedReply?.decline === 'steer') {
        const result: ChatResult = {
          kind: 'declined',
          reason: "I can't pause or hold anything yet — approve or decline it from the actions waiting on you instead.",
        }
        return NextResponse.json(result)
      }
      if (parsedReply?.decline === 'unanswerable') {
        const result: ChatResult = { kind: 'declined', reason: "I don't have enough to answer that from what's happened so far." }
        return NextResponse.json(result)
      }
    } catch {
      /* not JSON — a normal answer */
    }

    const result: ChatResult = { kind: 'answer', text: raw }
    return NextResponse.json(result)
  } catch (err) {
    log.error('POST /api/executive/[executiveId]/chat', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
