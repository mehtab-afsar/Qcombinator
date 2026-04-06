import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EXTRACTION_PROMPTS, FOLLOW_UP_PROMPT } from '@/lib/profile-builder/extraction-prompts'
import { getSectionCompletionPct, getMissingFields, FounderProfile } from '@/lib/profile-builder/question-engine'
import { routedText } from '@/lib/llm/router'
import { flattenConfidence } from '@/lib/profile-builder/utils'

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
      section: number
      conversationText: string
      uploadedDocumentText?: string
      founderProfile?: FounderProfile
      existingExtracted?: Record<string, unknown>
      existingConfidenceMap?: Record<string, number>
    } = body

    if (!section || !conversationText) {
      return NextResponse.json({ error: 'section and conversationText required' }, { status: 400 })
    }

    const sectionPrompt = EXTRACTION_PROMPTS[section]
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

    const raw = await routedText('extraction', [
      { role: 'system', content: sectionPrompt },
      { role: 'user', content: userMessage },
    ])

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
    const merged: Record<string, unknown> = { ...(existingExtracted ?? {}) }
    const mergeDeep = (target: Record<string, unknown>, source: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(source)) {
        if (v === null || v === undefined) continue
        if (typeof v === 'object' && !Array.isArray(v) && typeof target[k] === 'object' && target[k] !== null) {
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
    let followUpQuestion: string | null = null
    if (missingFields.length > 0 && founderProfile) {
      const followUpPrompt = FOLLOW_UP_PROMPT
        .replace('{section}', String(section))
        .replace('{stage}', founderProfile.stage ?? 'unknown')
        .replace('{industry}', founderProfile.industry ?? 'general')
        .replace('{revenueStatus}', founderProfile.revenueStatus ?? 'unknown')
        .replace('{conversationSoFar}', conversationText.slice(-1500))
        .replace('{extractedSoFar}', JSON.stringify(merged, null, 2).slice(0, 1000))
        .replace('{missingFields}', missingFields.join(', '))

      try {
        const followUpRaw = await routedText('classification', [
          { role: 'system', content: followUpPrompt },
          { role: 'user', content: 'Generate the next question.' },
        ])
        followUpQuestion = followUpRaw.trim() === 'SECTION_COMPLETE' ? null : followUpRaw.trim()
      } catch {
        // non-blocking
      }
    }

    return NextResponse.json({
      extractedFields,
      mergedFields: merged,
      confidenceMap,        // merged (existing PDF + new conversation confidence)
      completionScore,
      missingFields,
      followUpQuestion,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[profile-builder/extract]', msg)
    return NextResponse.json({ error: 'Extraction failed', detail: msg }, { status: 500 })
  }
}
