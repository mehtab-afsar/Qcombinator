import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EXTRACTION_PROMPTS, PITCH_EXTRACTION_PROMPT, FOLLOW_UP_PROMPT, WHAT_ELSE_PROMPT } from '@/lib/profile-builder/extraction-prompts'
import { getSectionCompletionPct, getMissingFields, FounderProfile } from '@/lib/profile-builder/question-engine'
import { routedText } from '@/lib/llm/router'
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

    // Pitch section: extract pitch quality + generate adaptive follow-up
    if (section === 'pitch') {
      const pitchConversation = conversationText
      let followUpQuestion: string | null = null
      let extractedFields: Record<string, unknown> = {}

      try {
        const raw = await routedText('extraction', [
          { role: 'system', content: PITCH_EXTRACTION_PROMPT },
          { role: 'user', content: `Conversation:\n${pitchConversation}` },
        ])
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try { extractedFields = JSON.parse(jsonMatch[0]) } catch { /* ignore */ }
        }
      } catch { /* non-blocking */ }

      // Always generate an adaptive follow-up for pitch
      try {
        const followUpRaw = await routedText('generation', [
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
          { role: 'user', content: `Pitch conversation:\n${pitchConversation}\n\nWrite your follow-up question:` },
        ], { maxTokens: 120 })
        followUpQuestion = followUpRaw.trim() || null
      } catch { /* non-blocking */ }

      // Hard fallback — only if LLM entirely failed
      if (!followUpQuestion) {
        followUpQuestion = "Walk me through what your company does — one sentence, as if you're explaining it to a smart friend who's never heard of it."
      }

      return NextResponse.json({
        extractedFields,
        mergedFields: { ...(existingExtracted ?? {}), ...extractedFields },
        confidenceMap: existingConfidenceMap ?? {},
        completionScore: Object.keys(extractedFields).length >= 4 ? 80 : 40,
        missingFields: [],
        followUpQuestion,
      })
    }

    const sectionPrompt = EXTRACTION_PROMPTS[section as number]
    if (!sectionPrompt) return NextResponse.json({ error: 'Invalid section' }, { status: 400 })

    // Section compaction: long conversations are summarised before extraction.
    // Keeps the extraction model focused on signal, not transcript noise.
    // Threshold: 4000 chars (~1000 tokens) → compact to ~200-token summary.
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
        // On error keep the original — extraction still works, just costs more tokens
        effectiveConversation = conversationText
      }
    }

    // Build the user message: combine conversation + any document text
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
      // Return graceful empty rather than 500 so the UI can still advance
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
      } catch {
        // Return empty if parse fails
      }
    }

    // Merge with existing extracted fields (do not overwrite non-null with null)
    // Arrays are UNIONED (deduplicated) rather than replaced — prevents e.g.
    // teamCoverage: ["tech","product"] being wiped by a later ["sales"] extraction.
    const ARRAY_MERGE_FIELDS = new Set([
      'teamCoverage', 'advantages', 'customerList', 'channelsTried',
      'competitorNames', 'certifications', 'integrations',
    ])
    const merged: Record<string, unknown> = { ...(existingExtracted ?? {}) }
    const mergeDeep = (target: Record<string, unknown>, source: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(source)) {
        if (v === null || v === undefined) continue
        // Array union: merge + deduplicate string arrays instead of overwriting
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

    // Merge confidence: existing PDF confidence is baseline; new conversation confidence overwrites
    const confidenceMap: Record<string, number> = { ...(existingConfidenceMap ?? {}), ...newConfidenceMap }

    const stage = founderProfile?.stage ?? 'pre-product'
    const completionScore = getSectionCompletionPct(merged, section, stage, confidenceMap)
    const missingFields = getMissingFields(merged, section, stage, confidenceMap)

    // Generate follow-up question for missing fields
    // Use effectiveConversation (already summarised if >4000 chars) so the model
    // sees the full context without the 1500-char truncation that caused re-asks.
    let followUpQuestion: string | null = null
    const sectionNum = section as number
    if (missingFields.length > 0 && founderProfile) {
      const followUpPrompt = FOLLOW_UP_PROMPT
        .replace('{section}', String(section))
        .replace('{stage}', founderProfile.stage ?? 'unknown')
        .replace('{industry}', founderProfile.industry ?? 'general')
        .replace('{revenueStatus}', founderProfile.revenueStatus ?? 'unknown')
        .replace('{conversationSoFar}', effectiveConversation)   // full summarised history
        .replace('{extractedSoFar}', (() => {
          // Build a flat key→value summary instead of raw JSON truncation.
          // Raw JSON sliced mid-object sends invalid JSON to the LLM.
          const flat: Record<string, unknown> = {}
          const flatten = (obj: Record<string, unknown>, prefix = '') => {
            for (const [k, v] of Object.entries(obj)) {
              const key = prefix ? `${prefix}.${k}` : k
              if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) {
                flatten(v as Record<string, unknown>, key)
              } else if (v !== null && v !== undefined) {
                flat[key] = v
              }
            }
          }
          flatten(merged)
          return JSON.stringify(flat).slice(0, 1200)
        })())
        .replace('{missingFields}', missingFields.join(', '))

      try {
        // Use generation (70B) instead of classification (8B) — needs real conversational reasoning
        const followUpRaw = await routedText('generation', [
          { role: 'system', content: followUpPrompt },
          { role: 'user', content: 'Write your reply.' },
        ], { maxTokens: 300 })
        followUpQuestion = followUpRaw.trim().toUpperCase() === 'SECTION_COMPLETE' ? null : followUpRaw.trim()
      } catch {
        // non-blocking
      }

      // Section 3 safety net: if replicationTimeMonths is missing and LLM returned null,
      // force-ask the replication time question — "no patents" does NOT answer this.
      if (section === 3 && followUpQuestion === null && missingFields.includes('p3.replicationTimeMonths')) {
        const conv = effectiveConversation.toLowerCase()
        const hasTimeEstimate = /\b(\d+\s*month|\d+\s*year|\d+\s*week|how long|replicat|timeline|time.*build|build.*time)\b/.test(conv)
        if (!hasTimeEstimate) {
          followUpQuestion = "Got it — and roughly how many months would it take a well-funded competitor to replicate what you've built technically?"
        }
      }
    } else if (!founderProfile && missingFields.length > 0) {
      // founderProfile not provided — still generate an adaptive follow-up
      try {
        const minimalFollowUp = await routedText('generation', [
          {
            role: 'system',
            content: `You are a sharp startup advisor. Based on this conversation, write ONE short follow-up question (1-2 sentences) that asks about the most important detail still missing. Acknowledge what was just said. Be specific, not generic.`,
          },
          { role: 'user', content: `Section: ${sectionNum}\nConversation:\n${effectiveConversation}\nWrite your follow-up:` },
        ], { maxTokens: 120 })
        followUpQuestion = minimalFollowUp.trim() || null
      } catch { /* non-blocking */ }
    } else if (founderProfile && completionScore >= 60) {
      // Section is complete — ask for more specific depth rather than returning null
      const flatSummary = (() => {
        const flat: Record<string, unknown> = {}
        const flatten = (obj: Record<string, unknown>, prefix = '') => {
          for (const [k, v] of Object.entries(obj)) {
            const key = prefix ? `${prefix}.${k}` : k
            if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) {
              flatten(v as Record<string, unknown>, key)
            } else if (v !== null && v !== undefined) {
              flat[key] = v
            }
          }
        }
        flatten(merged)
        return JSON.stringify(flat).slice(0, 1200)
      })()

      const whatElsePrompt = WHAT_ELSE_PROMPT
        .replace('{section}', String(section))
        .replace('{stage}', founderProfile.stage ?? 'unknown')
        .replace('{industry}', founderProfile.industry ?? 'general')
        .replace('{extractedSoFar}', flatSummary)

      try {
        const whatElseRaw = await routedText('generation', [
          { role: 'system', content: whatElsePrompt },
          { role: 'user', content: 'Write your reply.' },
        ], { maxTokens: 200 })
        followUpQuestion = whatElseRaw.trim() || null
      } catch {
        // non-blocking — null is fine
      }
    }

    // Build per-field source attribution for this extraction pass
    // All fields newly extracted from conversation are 'conversation'; inferred ones are 'inferred'
    const fieldSource: Record<string, 'conversation' | 'inferred'> = {}
    const flatTag = (obj: Record<string, unknown>, prefix = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k
        if (v !== null && v !== undefined) {
          if (typeof v === 'object' && !Array.isArray(v)) {
            flatTag(v as Record<string, unknown>, key)
          } else {
            fieldSource[key] = k === 'buildComplexity' ? 'inferred' : 'conversation'
          }
        }
      }
    }
    flatTag(extractedFields)

    return NextResponse.json({
      extractedFields,
      mergedFields: merged,
      confidenceMap,        // merged (existing PDF + new conversation confidence)
      completionScore,
      missingFields,
      followUpQuestion,
      fieldSource,          // 'conversation' | 'inferred' per newly extracted field
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('[profile-builder/extract]', msg)
    return NextResponse.json({ error: 'Extraction failed', detail: msg }, { status: 500 })
  }
}
