import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

function getAdminClient() {
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { linkedinUrl } = await req.json()
    if (!linkedinUrl) return NextResponse.json({ skipped: true, reason: 'No LinkedIn URL' })

    // Ask LLM to infer likely profile data from the URL alone (no scraping)
    const raw = await callOpenRouter([
      {
        role: 'system',
        content: `You are a LinkedIn profile analyst. Given a LinkedIn URL, infer what you can about the person's professional background.
Return ONLY valid JSON:
{
  "domainYears": number | null,
  "founderMarketFit": "string describing why this person for this type of startup" | null,
  "priorExits": number,
  "teamCoverage": ["string"] — likely functions: tech, sales, product, marketing
}
If you cannot confidently infer from the URL alone, return nulls. Never invent specific company names.`,
      },
      { role: 'user', content: `LinkedIn URL: ${linkedinUrl}` },
    ], { maxTokens: 300, temperature: 0.2 })

    let enrichedFields: Record<string, unknown> = {}
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        enrichedFields = JSON.parse(jsonMatch[0])
      } catch {
        return NextResponse.json({ skipped: true, reason: 'Parse failed' })
      }
    }

    // Pre-populate section 4 (team) data — only if fields are non-null
    const supabase = getAdminClient()
    const p4Fields: Record<string, unknown> = {}
    if (enrichedFields.domainYears !== null) p4Fields['p4.domainYears'] = enrichedFields.domainYears
    if (enrichedFields.founderMarketFit !== null) p4Fields['p4.founderMarketFit'] = enrichedFields.founderMarketFit
    if (enrichedFields.priorExits !== null) p4Fields['p4.priorExits'] = enrichedFields.priorExits

    if (Object.keys(p4Fields).length > 0) {
      const { data: existing } = await supabase
        .from('profile_builder_data')
        .select('extracted_fields')
        .eq('user_id', userId)
        .eq('section', 4)
        .single()

      const currentFields = (existing?.extracted_fields ?? {}) as Record<string, unknown>
      const p4Current = (currentFields.p4 ?? {}) as Record<string, unknown>

      await supabase
        .from('profile_builder_data')
        .upsert({
          user_id: userId,
          section: 4,
          extracted_fields: {
            ...currentFields,
            p4: {
              ...p4Current,
              ...(enrichedFields.domainYears !== null && { domainYears: enrichedFields.domainYears }),
              ...(enrichedFields.founderMarketFit !== null && { founderMarketFit: enrichedFields.founderMarketFit }),
              ...(enrichedFields.priorExits !== null && { priorExits: enrichedFields.priorExits }),
            },
          },
          confidence_map: { 'p4.domainYears': 0.45, 'p4.founderMarketFit': 0.45 },
          completion_score: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,section' })
    }

    return NextResponse.json({ enriched: true, fields: Object.keys(p4Fields) })
  } catch (err) {
    console.error('[linkedin-enrich]', err)
    // Always return 200 — this is a background, non-blocking call
    return NextResponse.json({ skipped: true, reason: 'Error' })
  }
}
