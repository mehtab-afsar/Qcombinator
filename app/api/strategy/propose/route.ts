/**
 * POST /api/strategy/propose — stream a Strategy proposal from the founder's
 * Q-Score and company context (S001, F07b). Proposes; does NOT save.
 *
 * Streamed (SSE) so Layer 1 of the unveiling ("the read") types in live instead of
 * landing as a dead block once the whole six-step session finishes — see
 * STRATEGY_READ_DELIMITER in lib/prompts/composer/mandate.ts for how the model is
 * asked to front-load a short paragraph before the slower full document. Same
 * `data: {...}\n\n` / `[DONE]` framing as app/api/profile-builder/extract/route.ts
 * — the one SSE convention already established in this codebase, not a new one.
 *
 * The founder reviews what comes back (or nudges it, see /api/strategy/nudge),
 * then it's saved exactly the same way it always could — via POST /api/strategy
 * (lib/mandate/strategy.ts). This route never writes to strategy_sessions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { composeMandatePrompt } from '@/lib/prompts/compose'
import { routedStream } from '@/lib/llm/router'
import { splitDocumentAndJson, validateGeneratedStrategy, MandateGenerationError } from '@/lib/mandate/generate'
import { buildStrategyContext } from '@/lib/mandate/strategy-proposal'
import { log } from '@/lib/logger'

const proposeSchema = z.object({
  // Founder-supplied free text feeding an LLM prompt — capped for the same reason
  // /api/strategy caps mission/priorities/goals (CLAUDE.md §3: bounded input).
  currentTraction: z.string().trim().max(1_000).optional(),
})

function sseEncode(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function POST(req: NextRequest): Promise<Response> {
  const off = newModelOff()
  if (off) return off

  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = await parseBody(req, proposeSchema)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const supabase = await createClient()

  // Expected disagreement (no score yet) is resolved BEFORE the stream opens, so it
  // can still be a normal JSON 409 — the frontend's cue to fall back to a blank,
  // founder-authored form, same contract as before this route streamed.
  let context: Awaited<ReturnType<typeof buildStrategyContext>>
  try {
    context = await buildStrategyContext(supabase, auth.user.id, parsed.data)
  } catch (err) {
    if (err instanceof MandateGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    log.error('POST /api/strategy/propose', { err })
    return NextResponse.json({ error: 'Could not draft a proposal' }, { status: 500 })
  }

  const pkg = composeMandatePrompt({ kind: 'strategy', structuredTail: 'strategy', context })

  const readable = new ReadableStream({
    async start(controller) {
      let full = ''
      try {
        for await (const event of routedStream('reasoning', [{ role: 'user', content: pkg.text }], {
          maxTokens: 6_000,
          temperature: 0.2,
        })) {
          if (event.type === 'delta') {
            full += event.text
            controller.enqueue(sseEncode({ type: 'delta', text: event.text }))
          }
        }
        const { document, json } = splitDocumentAndJson(full)
        const fields = validateGeneratedStrategy(json)
        controller.enqueue(sseEncode({ type: 'done', proposal: { ...fields, document } }))
      } catch (err) {
        // A soft error over the stream, never a bare 500 mid-connection — the client
        // reads `error` on the done event and falls back to the blank form, exactly
        // the same fallback the old blocking route offered on a MandateGenerationError.
        const message = err instanceof MandateGenerationError
          ? err.message
          : 'Could not draft a proposal right now.'
        log.warn('[strategy/propose] stream generation failed', message)
        controller.enqueue(sseEncode({ type: 'done', error: message }))
      }
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
