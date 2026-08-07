import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseDocument } from '@/lib/profile-builder/document-parser'
import { routedText } from '@/lib/llm/router'
import { composeAdhocPrompt } from '@/lib/prompts/compose'
import { log } from '@/lib/logger'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const THESIS_INSTRUCTIONS = `You are a VC research assistant. Extract the following fields from the investment thesis document provided as data.
Return ONLY valid JSON. No explanation, no markdown, just the raw JSON object.

Required JSON shape:
{
  "thesis": "2-3 sentence summary of the core investment philosophy",
  "sectors": ["sector1", "sector2"],
  "stages": ["Pre-Seed", "Seed"],
  "checkSize": "$500K–$2M",
  "portfolioCompanies": ["company1", "company2"]
}

Rules:
- thesis: summarise the fund's investment thesis in 2-3 sentences. If not clear, write a best guess from context.
- sectors: list up to 6 focus sectors mentioned. Use common labels: SaaS, AI/ML, FinTech, HealthTech, CleanTech, EdTech, Deep Tech, Consumer, Marketplace, Developer Tools, etc.
- stages: list stages mentioned. Use: Pre-Seed, Seed, Series A, Series B+
- checkSize: typical check size range as a string, or "" if not mentioned
- portfolioCompanies: list company names mentioned as portfolio or investments. Up to 10. Empty array if none.`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    // Store in private uploads bucket (reuse existing)
    const storagePath = `investor-thesis/${user.id}/${Date.now()}-${file.name}`
    await supabase.storage.from('uploads').upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    }).catch(e => log.warn('Thesis storage upload (non-blocking):', e?.message))

    // Parse document text
    const parsed = await parseDocument(buffer, file.name, 'application/pdf')
    const docText = parsed.text.slice(0, 8000)

    let extractedData: {
      thesis: string
      sectors: string[]
      stages: string[]
      checkSize: string
      portfolioCompanies: string[]
    } = { thesis: '', sectors: [], stages: [], checkSize: '', portfolioCompanies: [] }

    const isScannedPDF = docText.length < 50
    // Tracks "we couldn't even attempt extraction" (missing key, thrown error) as distinct from
    // "we tried and the document genuinely had nothing to extract" — the old version returned
    // 200 with all-blank fields in both cases, so an investor whose upload failed outright saw
    // the same silent, empty result as one whose thesis PDF just had no useful text in it.
    let extractionFailed = false

    if (isScannedPDF) {
      // Vision path: send the raw PDF bytes to the router — its provider layer detects the
      // 'document' content block and automatically switches to the PDF beta endpoint.
      try {
        const base64 = buffer.toString('base64')
        const messages = composeAdhocPrompt({
          sourceRef: 'investor/thesis-upload:vision',
          instructions: THESIS_INSTRUCTIONS,
          data: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }],
        })
        const raw = await routedText('extraction', messages, { maxTokens: 800 })
        const m = raw.match(/\{[\s\S]*\}/)
        if (m) extractedData = { ...extractedData, ...JSON.parse(m[0]) }
        else extractionFailed = true
      } catch (e) {
        log.warn('Vision thesis extraction failed:', e)
        extractionFailed = true
      }
    } else {
      // Text path
      try {
        const messages = composeAdhocPrompt({
          sourceRef: 'investor/thesis-upload:text',
          instructions: THESIS_INSTRUCTIONS,
          data: docText,
        })
        const raw = await routedText('extraction', messages, { maxTokens: 800 })
        const m = raw.match(/\{[\s\S]*\}/)
        if (m) extractedData = { ...extractedData, ...JSON.parse(m[0]) }
        else extractionFailed = true
      } catch (e) {
        log.warn('Text thesis extraction failed:', e)
        extractionFailed = true
      }
    }

    // Normalise arrays (ensure they are arrays, not strings)
    if (!Array.isArray(extractedData.sectors)) extractedData.sectors = []
    if (!Array.isArray(extractedData.stages))  extractedData.stages  = []
    if (!Array.isArray(extractedData.portfolioCompanies)) extractedData.portfolioCompanies = []

    // Cap lengths
    extractedData.sectors           = extractedData.sectors.slice(0, 8)
    extractedData.stages            = extractedData.stages.slice(0, 4)
    extractedData.portfolioCompanies = extractedData.portfolioCompanies.slice(0, 12)

    if (extractionFailed) {
      return NextResponse.json({ error: 'Could not extract data from this document', extractedData }, { status: 502 })
    }
    return NextResponse.json({ extractedData })
  } catch (err) {
    log.error('Thesis upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
