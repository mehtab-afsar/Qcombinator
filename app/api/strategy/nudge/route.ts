/**
 * POST /api/strategy/nudge — "Nudge this" (F07b, Layer 2 of the unveiling).
 *
 * A short, cheap revision of a proposal already shown to the founder — never a
 * fresh six-step S001 session (see ComposeMandateInput.reshape in
 * lib/prompts/composer/mandate.ts). Streamed, same SSE shape as
 * /api/strategy/propose. Does not re-fetch the Q-Score: the founder's own
 * `previous` proposal already encodes it, and the whole point of a nudge is a
 * quick reshape, not a second research pass.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { composeMandatePrompt } from '@/lib/prompts/compose'
import { routedStream } from '@/lib/llm/router'
import { splitDocumentAndJson, validateGeneratedStrategy, MandateGenerationError } from '@/lib/mandate/generate'
import { log } from '@/lib/logger'

const nudgeSchema = z.object({
  previous: z.object({
    mission: z.string().trim().min(1).max(2_000),
    priorities: z.array(z.string().trim().min(1).max(500)).max(10),
    goals: z.array(z.string().trim().min(1).max(500)).max(10),
  }),
  // A short pushback, not an essay — "one tap or one short sentence" (UX_SPEC §3).
  note: z.string().trim().min(1).max(500),
})

function sseEncode(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function POST(req: NextRequest): Promise<Response> {
  const off = newModelOff()
  if (off) return off

  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = await parseBody(req, nudgeSchema)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // generateStrategyProposal composes the package internally when given a reshape —
  // this route only needs to route the resulting messages, mirroring how it's used
  // directly there rather than duplicating composeMandatePrompt's reshape wiring.
  const pkg = composeMandatePrompt({
    kind: 'strategy',
    structuredTail: 'strategy',
    context: {},
    reshape: parsed.data,
  })

  const readable = new ReadableStream({
    async start(controller) {
      let full = ''
      try {
        for await (const event of routedStream('reasoning', [{ role: 'user', content: pkg.text }], {
          maxTokens: 1_200,
          temperature: 0.2,
        })) {
          if (event.type === 'delta') {
            full += event.text
            controller.enqueue(sseEncode({ type: 'delta', text: event.text }))
          }
        }
        const { json } = splitDocumentAndJson(full)
        const fields = validateGeneratedStrategy(json)
        // No `document` — the six-step document itself wasn't regenerated; the
        // caller keeps showing the original one alongside this revised read/mission.
        controller.enqueue(sseEncode({ type: 'done', proposal: fields }))
      } catch (err) {
        const message = err instanceof MandateGenerationError
          ? err.message
          : 'Could not revise your direction right now.'
        log.warn('[strategy/nudge] stream generation failed', message)
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
