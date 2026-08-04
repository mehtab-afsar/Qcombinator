import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EXTRACTION_PROMPTS, PITCH_EXTRACTION_PROMPT, FOLLOW_UP_PROMPT, WHAT_ELSE_PROMPT } from '@/lib/profile-builder/extraction-prompts'
import { getSectionCompletionPct, getMissingFields, FounderProfile } from '@/lib/profile-builder/question-engine'
import { routedText, routedStream } from '@/lib/llm/router'
import { flattenConfidence } from '@/lib/profile-builder/utils'
import { log } from '@/lib/logger'

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase.auth.getUser(token)
  return data.user?.id ?? null
}

/**
 * SSE framing shared with app/api/investor/ai-analysis/chat/route.ts — the one
 * established streaming convention in this codebase (CLAUDE.md §0.2), not a second
 * one invented here. `data: {"type":"meta",...}` arrives once, before any text, so
 * the client has completionScore/missingFields/etc. before the reply starts typing;
 * `delta` events carry the reply as it's written; the stream ends with `[DONE]`.
 */
function sseEncode(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      section,
      conversationText,
      uploadedDocumentText,
      founderProfile,
      existingExtracted,
      existingConfidenceMap,
    }: {
      section: number | 'pitch'
      conversationText: string
      uploadedDocumentText?: string
      founderProfile?: FounderProfile
      existingExtracted?: Record<string, unknown>
      existingConfidenceMap?: Record<string, number>
    } = body

    if ((section === undefined || section === null) || !conversationText) {
      return NextResponse.json({ error: 'section and conversationText required' }, { status: 400 })
    }

    // ── Pitch section: extract pitch quality, then stream an adaptive follow-up ──
    if (section === 'pitch') {
      let extractedFields: Record<string, unknown> = {}
      try {
        const raw = await routedText('extraction', [
          { role: 'system', content: PITCH_EXTRACTION_PROMPT },
          { role: 'user', content: `Conversation:\n${conversationText}` },
        ])
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try { extractedFields = JSON.parse(jsonMatch[0]) } catch { /* ignore */ }
        }
      } catch { /* non-blocking */ }

      const pitchStream = routedStream('generation', [
        {
          role: 'system',
          content: `You are a sharp VC analyst running a YC-style pitch interview. The founder is answering five pitch dimensions: what they do, who has the problem, why now, team advantage, and business model.

Read the conversation so far and identify the WEAKEST or most incomplete answer. Ask ONE sharp probing question about that specific point.

Rules:
- Never ask a question already answered clearly
- If an answer is vague, push for specifics: real numbers, names, timelines
- If they said "hey" or gave a non-answer, acknowledge it briefly and ask the first open question about what their company does
- Do not explain what you're doing — just ask the question
- 1–2 sentences max
- Do NOT use phrases like "Great answer" or "I'd be happy to"`,
        },
        { role: 'user', content: `Pitch conversation:\n${conversationText}\n\nWrite your follow-up question:` },
      ], { maxTokens: 120 })

      const fallback = "Walk me through what your company does — one sentence, as if you're explaining it to a smart friend who's never heard of it."
      return streamReply({
        meta: {
          extractedFields,
          mergedFields: { ...(existingExtracted ?? {}), ...extractedFields },
          confidenceMap: existingConfidenceMap ?? {},
          completionScore: Object.keys(extractedFields).length >= 4 ? 80 : 40,
          missingFields: [],
        },
        source: pitchStream,
        fallback,
      })
    }

    const sectionPrompt = EXTRACTION_PROMPTS[section as number]
    if (!sectionPrompt) return NextResponse.json({ error: 'Invalid section' }, { status: 400 })

    // Section compaction: long conversations are summarised before extraction.
    let effectiveConversation = conversationText
    if (conversationText.length > 4000) {
      try {
        effectiveConversation = await routedText('summarisation', [
          {
            role: 'system',
            content: 'You are a precise summariser. Condense the following founder Q&A conversation into a 150–200 word factual summary. Preserve all specific numbers, dates, names, and concrete claims. Do not add interpretation.',
          },
          { role: 'user', content: conversationText },
        ])
      } catch {
        effectiveConversation = conversationText
      }
    }

    let userMessage = `Founder's answer:\n\n${effectiveConversation}`
    if (uploadedDocumentText) {
      userMessage += `\n\n---\nUploaded document text:\n\n${uploadedDocumentText.slice(0, 4000)}`
    }

    let raw = ''
    try {
      raw = await routedText('extraction', [
        { role: 'system', content: sectionPrompt },
        { role: 'user', content: userMessage },
      ])
    } catch (llmErr) {
      log.warn('[extract] LLM call failed — returning empty extraction', llmErr instanceof Error ? llmErr.message : llmErr)
      return NextResponse.json({ mergedFields: existingExtracted ?? {}, confidenceMap: existingConfidenceMap ?? {}, completionScore: 0, followUpQuestion: null })
    }

    let extractedFields: Record<string, unknown> = {}
    let newConfidenceMap: Record<string, number> = {}
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        const { confidence: rawConf, ...rest } = parsed
        extractedFields = rest
        newConfidenceMap = rawConf ? flattenConfidence(rawConf as Record<string, unknown>) : {}
      } catch { /* Return empty if parse fails */ }
    }

    // Merge with existing extracted fields (do not overwrite non-null with null).
    // Arrays are UNIONED (deduplicated) rather than replaced.
    const ARRAY_MERGE_FIELDS = new Set([
      'teamCoverage', 'advantages', 'customerList', 'channelsTried',
      'competitorNames', 'certifications', 'integrations',
    ])
    const merged: Record<string, unknown> = { ...(existingExtracted ?? {}) }
    const mergeDeep = (target: Record<string, unknown>, source: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(source)) {
        if (v === null || v === undefined) continue
        if (Array.isArray(v) && ARRAY_MERGE_FIELDS.has(k)) {
          const existing = Array.isArray(target[k]) ? (target[k] as unknown[]) : []
          target[k] = [...new Set([...existing, ...v])]
        } else if (typeof v === 'object' && !Array.isArray(v) && typeof target[k] === 'object' && target[k] !== null) {
          mergeDeep(target[k] as Record<string, unknown>, v as Record<string, unknown>)
        } else {
          target[k] = v
        }
      }
    }
    mergeDeep(merged, extractedFields)

    // Auto-derive p3.buildComplexity from replicationTimeMonths if not already set
    if (section === 3) {
      const p3 = merged.p3 as Record<string, unknown> | undefined
      if (p3 && p3.replicationTimeMonths != null && !p3.buildComplexity) {
        const months = Number(p3.replicationTimeMonths)
        p3.buildComplexity =
          months < 1 ? '<1 month' :
          months <= 3 ? '1-3 months' :
          months <= 6 ? '3-6 months' :
          months <= 12 ? '6-12 months' : '12+ months'
      }
    }

    const confidenceMap: Record<string, number> = { ...(existingConfidenceMap ?? {}), ...newConfidenceMap }
    const stage = founderProfile?.stage ?? 'pre-product'
    const completionScore = getSectionCompletionPct(merged, section, stage, confidenceMap)
    const missingFields = getMissingFields(merged, section, stage, confidenceMap)

    const fieldSource: Record<string, 'conversation' | 'inferred'> = {}
    const flatTag = (obj: Record<string, unknown>, prefix = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k
        if (v !== null && v !== undefined) {
          if (typeof v === 'object' && !Array.isArray(v)) flatTag(v as Record<string, unknown>, key)
          else fieldSource[key] = k === 'buildComplexity' ? 'inferred' : 'conversation'
        }
      }
    }
    flatTag(extractedFields)

    const meta = { extractedFields, mergedFields: merged, confidenceMap, completionScore, missingFields, fieldSource }

    // ── Decide which prompt (if any) generates the next thing the founder reads ──
    // Same three-way choice the route always made — follow-up / minimal / "what else"
    // — just now driving a stream instead of a single blocking call each.
    const sectionNum = section as number

    if (missingFields.length > 0 && founderProfile) {
      const followUpPrompt = FOLLOW_UP_PROMPT
        .replace('{section}', String(section))
        .replace('{stage}', founderProfile.stage ?? 'unknown')
        .replace('{industry}', founderProfile.industry ?? 'general')
        .replace('{revenueStatus}', founderProfile.revenueStatus ?? 'unknown')
        .replace('{conversationSoFar}', effectiveConversation)
        .replace('{extractedSoFar}', flatSummaryOf(merged))
        .replace('{missingFields}', missingFields.join(', '))

      // Section 3 safety net: if the model comes back with SECTION_COMPLETE (or empty)
      // while replicationTimeMonths is still genuinely unaddressed, force the question —
      // "no patents" does not answer "how long to replicate."
      const section3Fallback = (() => {
        if (sectionNum !== 3 || !missingFields.includes('p3.replicationTimeMonths')) return null
        const conv = effectiveConversation.toLowerCase()
        const hasTimeEstimate = /\b(\d+\s*month|\d+\s*year|\d+\s*week|how long|replicat|timeline|time.*build|build.*time)\b/.test(conv)
        return hasTimeEstimate ? null
          : "Got it — and roughly how many months would it take a well-funded competitor to replicate what you've built technically?"
      })()

      return streamReply({
        meta,
        source: routedStream('generation', [
          { role: 'system', content: followUpPrompt },
          { role: 'user', content: 'Write your reply.' },
        ], { maxTokens: 300 }),
        fallback: section3Fallback,
        // SECTION_COMPLETE means "nothing more to ask" — the client reads a null
        // followUpQuestion as "section done," never as a dropped connection.
        completeSentinel: 'SECTION_COMPLETE',
        sentinelFallback: section3Fallback,
      })
    }

    if (!founderProfile && missingFields.length > 0) {
      return streamReply({
        meta,
        source: routedStream('generation', [
          {
            role: 'system',
            content: `You are a sharp startup advisor. Based on this conversation, write ONE short follow-up question (1-2 sentences) that asks about the most important detail still missing. Acknowledge what was just said. Be specific, not generic.`,
          },
          { role: 'user', content: `Section: ${sectionNum}\nConversation:\n${effectiveConversation}\nWrite your follow-up:` },
        ], { maxTokens: 120 }),
        fallback: null,
      })
    }

    if (founderProfile && completionScore >= 60) {
      const whatElsePrompt = WHAT_ELSE_PROMPT
        .replace('{section}', String(section))
        .replace('{stage}', founderProfile.stage ?? 'unknown')
        .replace('{industry}', founderProfile.industry ?? 'general')
        .replace('{extractedSoFar}', flatSummaryOf(merged))

      return streamReply({
        meta,
        source: routedStream('generation', [
          { role: 'system', content: whatElsePrompt },
          { role: 'user', content: 'Write your reply.' },
        ], { maxTokens: 200 }),
        fallback: null,
      })
    }

    // Nothing to ask and nothing to say — send meta only, no reply stream.
    return streamReply({ meta, source: null, fallback: null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('[profile-builder/extract]', msg)
    return NextResponse.json({ error: 'Extraction failed', detail: msg }, { status: 500 })
  }
}

/** Flat key→value summary instead of raw JSON — avoids sending truncated/invalid JSON to the model. */
function flatSummaryOf(merged: Record<string, unknown>): string {
  const flat: Record<string, unknown> = {}
  const flatten = (obj: Record<string, unknown>, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k
      if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) flatten(v as Record<string, unknown>, key)
      else if (v !== null && v !== undefined) flat[key] = v
    }
  }
  flatten(merged)
  return JSON.stringify(flat).slice(0, 1200)
}

/**
 * Stream `meta` first, then the reply as it's generated, then [DONE].
 *
 * @param source an in-flight routedStream() generator, or null to send meta only.
 * @param fallback shown if the model produced nothing (empty stream, or every chunk failed).
 * @param completeSentinel if the model's full reply equals this exactly, the client gets
 *   followUpQuestion: null (section complete) instead of the sentinel text itself.
 * @param sentinelFallback overrides completeSentinel when a safety net (e.g. Section 3's
 *   replication-time check) means "complete" isn't actually true yet.
 */
function streamReply(opts: {
  meta: Record<string, unknown>
  source: AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; toolCall: unknown }> | null
  fallback: string | null
  completeSentinel?: string
  sentinelFallback?: string | null
}): Response {
  const { meta, source, fallback, completeSentinel, sentinelFallback } = opts

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(sseEncode({ type: 'meta', ...meta }))

      if (!source) {
        controller.enqueue(sseEncode({ type: 'done', followUpQuestion: null }))
        controller.close()
        return
      }

      let full = ''
      try {
        for await (const event of source) {
          if (event.type === 'delta') {
            full += event.text
            controller.enqueue(sseEncode({ type: 'delta', text: event.text }))
          }
        }
      } catch (e) {
        log.warn('[extract] stream generation failed', e instanceof Error ? e.message : e)
      }

      full = full.trim()

      if (completeSentinel && full.toUpperCase() === completeSentinel) {
        // The model said this section is done. A safety-net fallback (e.g. Section 3's
        // replication-time check) can still override that — deliberately checked AFTER
        // the model's own answer, not instead of it.
        if (sentinelFallback) {
          controller.enqueue(sseEncode({ type: 'delta', text: sentinelFallback }))
          controller.enqueue(sseEncode({ type: 'done', followUpQuestion: sentinelFallback }))
        } else {
          controller.enqueue(sseEncode({ type: 'done', followUpQuestion: null }))
        }
      } else if (!full && fallback) {
        controller.enqueue(sseEncode({ type: 'delta', text: fallback }))
        controller.enqueue(sseEncode({ type: 'done', followUpQuestion: fallback }))
      } else {
        controller.enqueue(sseEncode({ type: 'done', followUpQuestion: full || null }))
      }

      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
