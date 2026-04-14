import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { parseDocument } from '@/lib/profile-builder/document-parser'
import { EXTRACTION_PROMPTS } from '@/lib/profile-builder/extraction-prompts'
import { routedText } from '@/lib/llm/router'
import { getSectionCompletionPct, getMissingFields } from '@/lib/profile-builder/question-engine'
import { flattenConfidence } from '@/lib/profile-builder/utils'

// ── Vision extraction for image-based / scanned PDFs ─────────────────────────
// When pdf-parse yields < 50 chars (scanned doc, password protected, image-only),
// send the raw PDF bytes to a vision-capable model.
//
// Priority:
//   1. Anthropic SDK directly (ANTHROPIC_API_KEY) — PDF beta, most reliable
//   2. OpenRouter + Gemini Flash (OPENROUTER_API_KEY) — accepts PDFs via standard image_url data URI
//   3. null → falls through to existing regex fallback / clear error message
async function extractFieldsFromImagePDF(
  buffer: Buffer,
): Promise<{ fields: Record<string, unknown>; conf: Record<string, number> } | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY

  if (!anthropicKey && !openrouterKey) return null

  const base64 = buffer.toString('base64')

  // ── Shared extractor: takes a function that calls one section prompt ──────
  async function runSections(
    callOne: (sec: number) => Promise<string>
  ): Promise<{ fields: Record<string, unknown>; conf: Record<string, number> }> {
    const results = await Promise.allSettled(
      [1, 2, 3, 4, 5].map(sec =>
        callOne(sec).then(raw => {
          const m = raw.match(/\{[\s\S]*\}/)
          if (!m) return { fields: {} as Record<string, unknown>, conf: {} as Record<string, number> }
          const parsed = JSON.parse(m[0])
          const { confidence: conf, ...rest } = parsed
          return { fields: rest as Record<string, unknown>, conf: (conf ?? {}) as Record<string, number> }
        })
      )
    )
    const mergedFields: Record<string, unknown> = {}
    const mergedConf: Record<string, number> = {}
    for (const r of results) {
      if (r.status === 'fulfilled') {
        Object.assign(mergedFields, r.value.fields)
        Object.assign(mergedConf, flattenConfidence(r.value.conf as Record<string, unknown>))
      }
    }
    return { fields: mergedFields, conf: mergedConf }
  }

  // ── Path 1: Anthropic SDK (direct) ───────────────────────────────────────
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey })
      return await runSections(sec =>
        client.beta.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          betas: ['pdfs-2024-09-25'],
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as Anthropic.DocumentBlockParam,
              { type: 'text', text: EXTRACTION_PROMPTS[sec] },
            ],
          }],
        }).then(res =>
          res.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('')
        )
      )
    } catch (e) {
      console.warn('[upload] Anthropic vision failed:', e instanceof Error ? e.message : e)
    }
  }

  // ── Path 2: OpenRouter + Gemini Flash ────────────────────────────────────
  // Claude's `document` block type is Anthropic-native and doesn't pass through
  // OpenRouter's OpenAI-compat layer. Gemini Flash accepts PDFs directly via the
  // standard `image_url` field with a `data:application/pdf;base64,...` data URI —
  // fully supported in OpenAI-compat format, no special headers needed.
  if (openrouterKey) {
    try {
      return await runSections(async sec => {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'EdgeAlpha ProfileBuilder',
          },
          body: JSON.stringify({
            model: 'google/gemini-flash-1.5',
            max_tokens: 800,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:application/pdf;base64,${base64}` },
                },
                { type: 'text', text: EXTRACTION_PROMPTS[sec] },
              ],
            }],
          }),
        })
        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`OpenRouter ${res.status}: ${errText}`)
        }
        const data = await res.json()
        // content may be string (OpenAI format) or array (some providers return arrays)
        const content = data.choices?.[0]?.message?.content
        if (Array.isArray(content)) {
          return content.filter((b: {type:string}) => b.type === 'text').map((b: {text:string}) => b.text).join('')
        }
        return (content ?? '') as string
      })
    } catch (e) {
      console.warn('[upload] OpenRouter Gemini vision failed:', e instanceof Error ? e.message : e)
    }
  }

  return null
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
]
const ALLOWED_EXTS = ['.pdf', '.pptx', '.docx', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.webp']

const SECTION_LABELS: Record<number, string> = {
  1: 'Market Validation',
  2: 'Market & Competition',
  3: 'IP & Technology',
  4: 'Team',
  5: 'Financials & Impact',
}

// Human-readable labels for field paths shown in extraction summary
const FIELD_LABELS: Record<string, string> = {
  customerCommitment: 'Customer commitment',
  conversationCount: 'Conversation count',
  hasPayingCustomers: 'Paying customers',
  payingCustomerDetail: 'Customer details',
  salesCycleLength: 'Sales cycle',
  hasRetention: 'Retention data',
  retentionDetail: 'Retention details',
  largestContractUsd: 'Largest contract',
  'p2.tamDescription': 'TAM description',
  'p2.marketUrgency': 'Market urgency',
  'p2.valuePool': 'Value pool',
  'p2.competitorCount': 'Competitor count',
  'p2.competitorDensityContext': 'Competitive context',
  'p3.hasPatent': 'Patent status',
  'p3.buildComplexity': 'Build complexity',
  'p3.technicalDepth': 'Technical depth',
  'p3.knowHowDensity': 'Know-how density',
  'p3.replicationCostUsd': 'Replication cost',
  'p4.domainYears': 'Domain experience',
  'p4.founderMarketFit': 'Founder-market fit',
  'p4.teamCoverage': 'Team coverage',
  'p4.priorExits': 'Prior exits',
  'p4.teamCohesionMonths': 'Team cohesion',
  'financial.mrr': 'MRR',
  'financial.arr': 'ARR',
  'financial.monthlyBurn': 'Monthly burn',
  'financial.runway': 'Runway',
  'financial.grossMargin': 'Gross margin',
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  customerCommitment: 'Customer commitments',
  conversationCount: 'Customer conversation count',
  hasPayingCustomers: 'Paying customers',
  hasRetention: 'Retention / NDR',
  salesCycleLength: 'Sales cycle length',
  'p2.tamDescription': 'TAM / market size',
  'p2.marketUrgency': '"Why now?" catalyst',
  'p2.competitorDensityContext': 'Competitive differentiation',
  'p3.hasPatent': 'Patents / trade secrets',
  'p3.buildComplexity': 'Replication difficulty',
  'p3.technicalDepth': 'Technical complexity',
  'p4.domainYears': 'Years of domain experience',
  'p4.founderMarketFit': 'Founder-market fit narrative',
  'p4.teamCoverage': 'Team function coverage',
  'financial.mrr': 'Monthly revenue (MRR)',
  'financial.monthlyBurn': 'Monthly burn rate',
  'financial.runway': 'Runway (months)',
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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

// Slice only fields relevant to a given section from the full extracted object
function getSectionRelevantFields(all: Record<string, unknown>, section: number): Record<string, unknown> {
  const picks: Record<number, string[]> = {
    1: ['customerCommitment', 'conversationCount', 'hasPayingCustomers', 'payingCustomerDetail', 'salesCycleLength', 'hasRetention', 'retentionDetail', 'largestContractUsd'],
    2: ['p2', 'targetCustomers', 'lifetimeValue'],
    3: ['p3'],
    4: ['p4', 'problemStory', 'advantages', 'hardshipStory'],
    5: ['financial', 'p5'],
  }
  return Object.fromEntries(
    (picks[section] ?? []).filter(k => k in all).map(k => [k, all[k]])
  )
}

// Get a human-readable snippet value for extracted field preview
function snippetValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  if (Array.isArray(value)) return value.slice(0, 3).join(', ')
  if (typeof value === 'string') return value.slice(0, 60) + (value.length > 60 ? '…' : '')
  return String(value).slice(0, 60)
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const section = parseInt(formData.get('section') as string ?? '0', 10)

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })

    const mimeType = file.type
    const filename = file.name
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
    const isAllowedType = ALLOWED_TYPES.includes(mimeType) || ALLOWED_EXTS.includes(ext)
    if (!isAllowedType) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseDocument(buffer, filename, mimeType)

    // Store file in Supabase Storage — ensure bucket exists first
    const supabase = getSupabase()
    await supabase.storage.createBucket('uploads', { public: false }).catch(() => {
      // Bucket likely already exists — ignore
    })
    const storagePath = `profile-builder/${userId}/${Date.now()}-${filename}`
    const { error: storageErr } = await supabase.storage.from('uploads').upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    })
    if (storageErr) console.warn('Storage upload failed (non-blocking):', storageErr.message)

    // Read founder stage for completion scoring
    const { data: fp } = await supabase
      .from('founder_profiles')
      .select('stage')
      .eq('user_id', userId)
      .single()
    const founderStage: string = fp?.stage ?? 'pre-product'

    let extractedFields: Record<string, unknown> = {}
    let confidenceMap: Record<string, number> = {}
    let extractionError: string | null = null

    function mergeDeepFields(target: Record<string, unknown>, source: Record<string, unknown>) {
      for (const [k, v] of Object.entries(source)) {
        if (v === null || v === undefined) continue
        if (typeof v === 'object' && !Array.isArray(v) && typeof target[k] === 'object' && target[k] !== null) {
          mergeDeepFields(target[k] as Record<string, unknown>, v as Record<string, unknown>)
        } else {
          target[k] = v
        }
      }
    }

    const DOC_CHAR_LIMIT = 6000
    const isPDF = filename.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf'
    const isImagePDF = section === 0 && parsed.text.length <= 50 && isPDF

    // Image-based / scanned PDF: send raw bytes to Claude vision instead of text
    if (isImagePDF) {
      console.log('[upload] image-based PDF detected — attempting vision extraction for', filename)
      const visionResult = await extractFieldsFromImagePDF(buffer)
      if (visionResult && Object.keys(visionResult.fields).length > 0) {
        mergeDeepFields(extractedFields, visionResult.fields)
        const flatConf = flattenConfidence(visionResult.conf as Record<string, unknown>)
        for (const [k, v] of Object.entries(flatConf)) {
          if (!(k in confidenceMap)) confidenceMap[k] = v
        }
        // Lower confidence baseline — vision is good but less reliable than clean text
        if (Object.keys(confidenceMap).length === 0) {
          for (const k of Object.keys(extractedFields)) confidenceMap[k] = 0.65
        }
      } else {
        extractionError = `This PDF appears to be image-based or scanned — vision extraction also failed. Try uploading a text-based PDF or PPTX, or answer the follow-up questions manually.`
        console.warn('[upload] image PDF vision fallback failed for', filename)
      }
    }

    if (section === 0 && parsed.text.length > 50) {
      // Run all 5 section prompts in parallel so every sidebar section gets populated
      const docUserMsg = `Document text:\n\n${parsed.text.slice(0, DOC_CHAR_LIMIT)}`
      const results = await Promise.allSettled(
        [1, 2, 3, 4, 5].map(sec =>
          routedText('extraction',
            [{ role: 'system', content: EXTRACTION_PROMPTS[sec] },
             { role: 'user', content: docUserMsg }],
            { maxTokens: 800 }
          ).then(raw => {
            const m = raw.match(/\{[\s\S]*\}/)
            if (!m) return { fields: {}, conf: {} }
            const parsed2 = JSON.parse(m[0])
            const { confidence: conf, ...rest } = parsed2
            return { fields: rest as Record<string, unknown>, conf: (conf ?? {}) as Record<string, number> }
          })
        )
      )
      let anySucceeded = false
      for (const result of results) {
        if (result.status === 'fulfilled') {
          anySucceeded = true
          // Skip if LLM flagged this as a non-startup document
          if (result.value.fields['startup_document'] === false) continue
          delete result.value.fields['startup_document']
          mergeDeepFields(extractedFields, result.value.fields)
          const flatConf = flattenConfidence(result.value.conf as Record<string, unknown>)
          for (const [k, v] of Object.entries(flatConf)) {
            if (!(k in confidenceMap)) confidenceMap[k] = v
          }
        } else {
          console.error('[upload] LLM extraction promise rejected:', result.reason)
        }
      }
      if (!anySucceeded) {
        const firstRejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
        extractionError = `LLM extraction failed: ${firstRejection?.reason?.message ?? 'unknown error'}. Check that GROQ_API_KEY is set in your environment.`
      }
    // Auto-derive p3.buildComplexity from replicationTimeMonths if LLM missed it
    if (extractedFields.p3) {
      const p3 = extractedFields.p3 as Record<string, unknown>
      if (p3.replicationTimeMonths != null && !p3.buildComplexity) {
        const months = Number(p3.replicationTimeMonths)
        p3.buildComplexity =
          months < 1 ? '<1 month' :
          months <= 3 ? '1-3 months' :
          months <= 6 ? '3-6 months' :
          months <= 12 ? '6-12 months' : '12+ months'
      }
    }

    } else if (parsed.text.length > 50) {
      // Per-section upload: run only that section's prompt
      const sectionPrompt = EXTRACTION_PROMPTS[section]
      if (sectionPrompt) {
        try {
          const raw = await routedText('extraction', [
            { role: 'system', content: sectionPrompt },
            { role: 'user', content: `Document text:\n\n${parsed.text}` },
          ], { maxTokens: 1200 })
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed2 = JSON.parse(jsonMatch[0])
            const { confidence: rawConf, ...rest } = parsed2
            extractedFields = rest
            confidenceMap = rawConf ? flattenConfidence(rawConf as Record<string, unknown>) : {}
          }
        } catch (e) {
          console.warn('LLM extraction failed for upload:', e)
        }
      }
    }

    // ── Regex fallback: run when LLM extraction produced nothing (e.g. no API key on Vercel) ──
    // Guarantees every text-bearing document contributes at least a few fields to the score.
    if (section === 0 && parsed.text.length > 50 && Object.keys(extractedFields).length === 0) {
      const t = parsed.text
      const regexFields: Record<string, unknown> = {}

      // Financial
      const mrrMatch = t.match(/(?:mrr|monthly recurring revenue)[^\d$]*[$]?\s*([0-9,.]+)\s*[kKmM]?/i)
      if (mrrMatch) {
        const raw = parseFloat(mrrMatch[1].replace(/,/g, ''))
        const mult = /k/i.test(mrrMatch[0]) ? 1000 : /m/i.test(mrrMatch[0]) ? 1_000_000 : 1
        regexFields.financial = { mrr: Math.round(raw * mult) }
      }
      const arrMatch = t.match(/(?:arr|annual recurring revenue)[^\d$]*[$]?\s*([0-9,.]+)\s*[kKmM]?/i)
      if (arrMatch) {
        const raw = parseFloat(arrMatch[1].replace(/,/g, ''))
        const mult = /k/i.test(arrMatch[0]) ? 1000 : /m/i.test(arrMatch[0]) ? 1_000_000 : 1
        const fin = (regexFields.financial as Record<string, unknown>) ?? {}
        regexFields.financial = { ...fin, arr: Math.round(raw * mult) }
      }
      const burnMatch = t.match(/(?:burn rate|monthly burn|cash burn)[^\d$]*[$]?\s*([0-9,.]+)\s*[kKmM]?/i)
      if (burnMatch) {
        const raw = parseFloat(burnMatch[1].replace(/,/g, ''))
        const mult = /k/i.test(burnMatch[0]) ? 1000 : /m/i.test(burnMatch[0]) ? 1_000_000 : 1
        const fin = (regexFields.financial as Record<string, unknown>) ?? {}
        regexFields.financial = { ...fin, monthlyBurn: Math.round(raw * mult) }
      }
      const runwayMatch = t.match(/(\d{1,2})\s*(?:months?|mo\.?)\s*(?:of\s*)?runway/i)
      if (runwayMatch) {
        const fin = (regexFields.financial as Record<string, unknown>) ?? {}
        regexFields.financial = { ...fin, runway: parseInt(runwayMatch[1]) }
      }

      // Market validation
      const custMatch = t.match(/(\d[\d,]*)\s*(?:paying\s*)?customers?/i)
      if (custMatch) regexFields.hasPayingCustomers = true
      const convMatch = t.match(/(\d[\d,]*)\s*(?:customer\s*)?(?:conversations?|interviews?|calls?)/i)
      if (convMatch) regexFields.conversationCount = parseInt(convMatch[1].replace(/,/g, ''))

      // Market
      const tamMatch = t.match(/(?:tam|total addressable market)[^\d$]*[$]?\s*([0-9,.]+)\s*[bBmMkK](?:illion|n)?/i)
      if (tamMatch) {
        const raw = parseFloat(tamMatch[1].replace(/,/g, ''))
        const mult = /b/i.test(tamMatch[0].slice(-5)) ? 1_000_000_000 : /m/i.test(tamMatch[0].slice(-5)) ? 1_000_000 : 1000
        regexFields.p2 = { tamDescription: `$${(raw * mult / 1_000_000_000).toFixed(1)}B TAM` }
      }

      // Team
      const teamMatch = t.match(/(?:team of|team:\s*)(\d+)\s*(?:people|members?|employees?)?/i)
      const founderMatch = t.match(/(\d+)\s*(?:co-?)?founders?/i)
      if (teamMatch || founderMatch) {
        const years = t.match(/(\d+)\s*years?\s*(?:of\s*)?(?:experience|in the industry|in)/i)
        regexFields.p4 = { domainYears: years ? parseInt(years[1]) : undefined }
      }

      if (Object.keys(regexFields).length > 0) {
        console.log('[upload] LLM unavailable — regex fallback extracted', Object.keys(regexFields).length, 'top-level fields')
        mergeDeepFields(extractedFields, regexFields)
        // Low confidence since this is pattern-matched, not LLM-verified
        for (const k of Object.keys(regexFields)) confidenceMap[k] = 0.5
        extractionError = null  // fields found — don't surface as error
      }
    }

    // If XLSX had structuredData, merge it
    if (parsed.structuredData) {
      Object.assign(extractedFields, { financial: { ...(extractedFields.financial as object ?? {}), ...parsed.structuredData } })
    }

    // Idempotency: skip insert if same file was uploaded within the last 60 seconds
    const { data: recentUpload } = await supabase
      .from('profile_builder_uploads')
      .select('id')
      .eq('user_id', userId)
      .eq('section', section)
      .eq('filename', filename)
      .gte('uploaded_at', new Date(Date.now() - 60_000).toISOString())
      .maybeSingle()

    if (recentUpload) {
      // Duplicate detected — return success silently so the UI doesn't show an error
      return NextResponse.json({
        message: 'Already processed',
        extractedPreview: [],
        parsedText: parsed.text,
        extractedFields,
        sectionSummaries: [],
      })
    }

    // Save upload record
    const { data: uploadRecord } = await supabase
      .from('profile_builder_uploads')
      .insert({
        user_id: userId,
        section,
        filename,
        file_type: mimeType,
        storage_path: storagePath,
        extracted_text: parsed.text.slice(0, 8000),
        parsed_data: extractedFields,
        confidence: parsed.confidence,
      })
      .select('id')
      .single()

    const uploadId = uploadRecord?.id ?? null

    // ── Step-0: auto-save extracted fields into profile_builder_data per section ──
    type SectionSummary = {
      sectionKey: string
      label: string
      completionPct: number
      extractedCount: number
      extractedSnippets: Array<{ label: string; value: string; fieldKey: string }>
      missingLabels: string[]
    }

    const sectionSummaries: SectionSummary[] = []

    if (section === 0 && Object.keys(extractedFields).length > 0) {
      for (const secNum of [1, 2, 3, 4, 5] as const) {
        const sectionFields = getSectionRelevantFields(extractedFields, secNum)
        const completionScore = getSectionCompletionPct(sectionFields, secNum, founderStage, confidenceMap)
        const missing = getMissingFields(sectionFields, secNum, founderStage)

        // Build human-readable snippets for the UI
        const snippets: Array<{ label: string; value: string; fieldKey: string }> = []
        const flatField = (obj: Record<string, unknown>, prefix = '') => {
          for (const [k, v] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${k}` : k
            if (v !== null && v !== undefined) {
              if (typeof v === 'object' && !Array.isArray(v)) {
                flatField(v as Record<string, unknown>, fullKey)
              } else {
                const label = FIELD_LABELS[fullKey] ?? fullKey
                snippets.push({ label, value: snippetValue(v), fieldKey: fullKey })
              }
            }
          }
        }
        flatField(sectionFields)

        sectionSummaries.push({
          sectionKey: String(secNum),
          label: SECTION_LABELS[secNum],
          completionPct: completionScore,
          extractedCount: snippets.length,
          extractedSnippets: snippets.slice(0, 5),
          missingLabels: missing.map(f => MISSING_FIELD_LABELS[f] ?? f),
        })

        // Upsert into profile_builder_data so submission can count it
        if (Object.keys(sectionFields).length > 0) {
          const { error: upsertErr } = await supabase.from('profile_builder_data').upsert({
            user_id: userId,
            section: secNum,
            raw_conversation: '',
            extracted_fields: sectionFields,
            confidence_map: confidenceMap,
            completion_score: completionScore,
            uploaded_documents: [{ uploadId, filename, fields: snippets.length }],
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,section' })
          if (upsertErr) {
            console.error(`[upload] upsert section ${secNum} failed:`, upsertErr)
            return NextResponse.json({
              error: `Failed to save extracted data (section ${secNum}): ${upsertErr.message}`,
            }, { status: 500 })
          }
        }
      }
    }

    // Build extraction preview for UI + source attribution map
    const preview: Array<{ field: string; value: unknown; confidence: number }> = []
    const fieldSource: Record<string, 'document' | 'inferred'> = {}
    const flattenPreview = (obj: unknown, prefix = '') => {
      if (typeof obj !== 'object' || obj === null) return
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        const fullKey = prefix ? `${prefix}.${k}` : k
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          flattenPreview(v, fullKey)
        } else if (v !== null && v !== undefined) {
          preview.push({ field: fullKey, value: v, confidence: (confidenceMap[k] ?? parsed.confidence) })
          // buildComplexity is auto-derived from replicationTimeMonths — mark as inferred
          fieldSource[fullKey] = k === 'buildComplexity' ? 'inferred' : 'document'
        }
      }
    }
    flattenPreview(extractedFields)

    const totalDocLength = parsed.text.length
    const docTruncated = section === 0 && totalDocLength > DOC_CHAR_LIMIT

    return NextResponse.json({
      uploadId,
      extractedPreview: preview.slice(0, 20),
      extractedFields,
      confidenceMap,
      fieldSource,                           // per-field source attribution: 'document' | 'inferred'
      parsedText: parsed.text.slice(0, 500),
      parsedTextLength: totalDocLength,
      docTruncated,                          // true when doc was cut for extraction
      truncatedAt: docTruncated ? DOC_CHAR_LIMIT : totalDocLength,
      summary: `Extracted ${preview.length} fields from ${filename}`,
      sectionSummaries,  // populated only for step-0 uploads
      extractionError,   // non-null when extraction failed — surfaces the reason to the UI
    })
  } catch (err) {
    console.error('[profile-builder/upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
