/**
 * One-time backfill: replay profile-builder write-back for founders who
 * submitted before the data-mapping fix (step 16b/16c of submit route).
 *
 * POST /api/admin/backfill-profile-data
 * Authorization: Bearer <CRON_SECRET>
 *
 * Optional body: { userId: string }  — to run for a single founder.
 * If omitted, runs for all founders who have profile_builder_data.
 *
 * Idempotent: only fills empty fields in startup_profile_data (never overwrites).
 * AI enrichment fires only when enough narrative data exists (same guard as submit).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { mergeToAssessmentData } from '@/lib/profile-builder/data-merger'
import { deriveInvestorFields } from '@/lib/profile-builder/ai-enrichment'
import { log } from '@/lib/logger'
import type { SectionData } from '@/lib/profile-builder/data-merger'

export async function POST(req: NextRequest) {
  // Auth
  const secret = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { userId?: string }
  const admin = createAdminClient()

  // Collect user IDs to process
  let userIds: string[]
  if (body.userId) {
    userIds = [body.userId]
  } else {
    const { data: rows, error } = await admin
      .from('profile_builder_data')
      .select('user_id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userIds = [...new Set((rows ?? []).map(r => r.user_id as string))]
  }

  let processed = 0
  let skipped   = 0
  let failed    = 0
  const errors: string[] = []

  for (const userId of userIds) {
    try {
      // Load all sections for this user
      const { data: rows } = await admin
        .from('profile_builder_data')
        .select('section, extracted_fields, confidence_map')
        .eq('user_id', userId)

      if (!rows || rows.length === 0) { skipped++; continue }

      const sections: Partial<Record<number, SectionData>> = {}
      for (const row of rows) {
        sections[row.section as number] = {
          extractedFields: (row.extracted_fields ?? {}) as Record<string, unknown>,
          confidenceMap:   (row.confidence_map   ?? {}) as Record<string, number>,
        }
      }

      const { assessmentData } = mergeToAssessmentData(sections)

      const fin = assessmentData.financial as Record<string, number> | undefined
      const p2  = assessmentData.p2        as Record<string, unknown> | undefined
      const p4  = assessmentData.p4        as Record<string, unknown> | undefined

      const writeBack: Record<string, string> = {}
      if (fin?.mrr)         writeBack.mrr              = String(fin.mrr)
      if (fin?.arr)         writeBack.arr               = String(fin.arr)
      else if (fin?.mrr)    writeBack.arr               = String(Math.round(fin.mrr * 12))
      if (fin?.monthlyBurn) writeBack.burnRate          = String(fin.monthlyBurn)
      if (fin?.runway)      writeBack.runwayRemaining   = String(fin.runway)
      if (p2?.tamDescription)           writeBack.tamSize        = p2.tamDescription as string
      if (p2?.marketUrgency)            writeBack.whyNow         = p2.marketUrgency as string
      if (p2?.competitorDensityContext) writeBack.differentiation = p2.competitorDensityContext as string
      if (p2?.valuePool)                writeBack.uniquePosition = p2.valuePool as string
      if (p4?.founderMarketFit)         writeBack.founderMarketFit = p4.founderMarketFit as string

      if (Object.keys(writeBack).length === 0) { skipped++; continue }

      const { data: fpCurrent } = await admin
        .from('founder_profiles')
        .select('startup_profile_data, stage, industry')
        .eq('user_id', userId)
        .single()

      const existing = ((fpCurrent?.startup_profile_data ?? {}) as Record<string, unknown>)
      const merged: Record<string, unknown> = { ...existing }
      for (const [key, val] of Object.entries(writeBack)) {
        if (!existing[key] || existing[key] === '') merged[key] = val
      }

      await admin
        .from('founder_profiles')
        .update({ startup_profile_data: merged })
        .eq('user_id', userId)

      // Fire-and-forget AI narrative derivation
      const p3 = assessmentData.p3 as Record<string, unknown> | undefined
      void deriveInvestorFields({
        userId,
        problemStory:             (assessmentData.problemStory            as string | undefined),
        advantages:               (assessmentData.advantages              as string[] | undefined),
        founderMarketFit:         (p4?.founderMarketFit                   as string | undefined),
        knowHowDensity:           (p3?.knowHowDensity                     as string | undefined),
        technicalDepth:           (p3?.technicalDepth                     as string | undefined),
        patentDescription:        (p3?.patentDescription                  as string | undefined),
        buildComplexity:          (p3?.buildComplexity                    as string | undefined),
        marketUrgency:            (p2?.marketUrgency                      as string | undefined),
        valuePool:                (p2?.valuePool                          as string | undefined),
        competitorDensityContext: (p2?.competitorDensityContext           as string | undefined),
        targetCustomers:          (p2?.targetCustomers                    as string | undefined),
        tamDescription:           (p2?.tamDescription                     as string | undefined),
        mrr:                      fin?.mrr,
        monthlyBurn:              fin?.monthlyBurn,
        runway:                   fin?.runway,
        stage:                    fpCurrent?.stage  ?? undefined,
        sector:                   fpCurrent?.industry ?? undefined,
      }).catch(() => {})

      processed++
    } catch (err) {
      failed++
      errors.push(`${userId}: ${String(err)}`)
      log.error('backfill-profile-data', { userId, err })
    }
  }

  return NextResponse.json({ processed, skipped, failed, errors })
}
