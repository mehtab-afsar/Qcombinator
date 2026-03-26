import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EXTRACTION_PROMPTS, FOLLOW_UP_PROMPT } from '@/lib/profile-builder/extraction-prompts'
import { getSectionCompletionPct, getMissingFields, FounderProfile } from '@/lib/profile-builder/question-engine'
import { callOpenRouter } from '@/lib/openrouter'

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
    }: {
      section: number
      conversationText: string
      uploadedDocumentText?: string
      founderProfile?: FounderProfile
      existingExtracted?: Record<string, unknown>
    } = body

    if (!section || !conversationText) {
      return NextResponse.json({ error: 'section and conversationText required' }, { status: 400 })
    }

    const sectionPrompt = EXTRACTION_PROMPTS[section]
    if (!sectionPrompt) return NextResponse.json({ error: 'Invalid section' }, { status: 400 })

    // Build the user message: combine conversation + any document text
    let userMessage = `Founder's answer:\n\n${conversationText}`
    if (uploadedDocumentText) {
      userMessage += `\n\n---\nUploaded document text:\n\n${uploadedDocumentText.slice(0, 4000)}`
    }

    const raw = await callOpenRouter([
      { role: 'system', content: sectionPrompt },
      { role: 'user', content: userMessage },
    ], { maxTokens: 1500, temperature: 0.1 })

    let extractedFields: Record<string, unknown> = {}
    let confidenceMap: Record<string, number> = {}

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        const { confidence: conf, ...rest } = parsed
        extractedFields = rest
        confidenceMap = conf ?? {}
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

    const stage = founderProfile?.stage ?? 'pre-product'
    const completionScore = getSectionCompletionPct(merged, section, stage)
    const missingFields = getMissingFields(merged, section, stage)

    // Generate follow-up question for missing fields
    let followUpQuestion: string | null = null
    if (missingFields.length > 0 && founderProfile) {
      const followUpPrompt = FOLLOW_UP_PROMPT
        .replace('{section}', String(section))
        .replace('{stage}', founderProfile.stage ?? 'unknown')
        .replace('{industry}', founderProfile.industry ?? 'general')
        .replace('{revenueStatus}', founderProfile.revenueStatus ?? 'unknown')
        .replace('{extractedSoFar}', JSON.stringify(merged, null, 2).slice(0, 1000))
        .replace('{missingFields}', missingFields.join(', '))

      try {
        const followUpRaw = await callOpenRouter([
          { role: 'system', content: followUpPrompt },
          { role: 'user', content: 'Generate the next question.' },
        ], { maxTokens: 200, temperature: 0.4 })
        followUpQuestion = followUpRaw.trim() === 'SECTION_COMPLETE' ? null : followUpRaw.trim()
      } catch {
        // non-blocking
      }
    }

    return NextResponse.json({
      extractedFields,
      mergedFields: merged,
      confidenceMap,
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
