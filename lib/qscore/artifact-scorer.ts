/**
 * Artifact-to-Score Feedback Loop
 *
 * When an agent generates a structured artifact (financial_summary, icp_document, etc.)
 * this module extracts assessment-relevant fields and:
 *   1. Patches profile_builder_data only where values are currently absent
 *   2. Re-runs calculateIQScore and inserts a new qscore_history row with
 *      data_source = 'agent_artifact' — closing the agent → score feedback loop.
 *
 * INVARIANT: Never overwrites founder-provided data (non-null fields in profile_builder_data).
 * Only fills gaps. confidence is set to 0.60 (agent estimate, self-reported equivalent).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeToAssessmentData } from '../profile-builder/data-merger'
import { calculateIQScore, inferStage, normalizeSector } from '../../features/qscore/calculators/iq-score-calculator'
import { calculateGrade } from '../../features/qscore/types/qscore.types'
import { getCachedSectorWeights } from '../cache/qscore-cache'
import type { SectionData } from '../profile-builder/data-merger'
import { log } from '@/lib/logger'

// ── Artifact field extractors ─────────────────────────────────────────────────

type PatchMap = Partial<Record<string, unknown>>

/**
 * Extract patchable assessment fields from an artifact's content.
 * Returns a sparse map: section number → field name → value.
 * Only numeric / boolean / string scalars are extracted (no nested objects).
 */
function extractPatchFields(
  artifactType: string,
  content: Record<string, unknown>
): { section: number; fields: PatchMap } | null {
  function safeNum(v: unknown): number | undefined {
    const n = Number(v)
    return isFinite(n) && n > 0 ? n : undefined
  }
  function safeStr(v: unknown): string | undefined {
    return typeof v === 'string' && v.trim().length > 3 ? v.trim() : undefined
  }

  switch (artifactType) {
    case 'financial_summary': {
      // Felix's financial model — maps to Section 5 financial fields
      const km = content.keyMetrics as Record<string, unknown> | undefined
      const br = content.burnAndRunway as Record<string, unknown> | undefined
      const ue = content.unitEconomics as Record<string, unknown> | undefined

      const fields: PatchMap = {}
      const mrr = safeNum(km?.mrr ?? km?.MRR)
      if (mrr)  fields['financial.mrr']  = mrr
      const arr = safeNum(km?.arr ?? km?.ARR)
      if (arr)  fields['financial.arr']  = arr
      const burn = safeNum(br?.monthlyBurn ?? br?.burn ?? km?.monthlyBurn)
      if (burn) fields['financial.monthlyBurn'] = burn
      const runway = safeNum(br?.runway ?? br?.runwayMonths)
      if (runway) fields['financial.runway'] = runway
      const ads = safeNum(ue?.averageDealSize ?? ue?.avgDealSize)
      if (ads) fields['financial.averageDealSize'] = ads

      return Object.keys(fields).length > 0 ? { section: 5, fields } : null
    }

    case 'icp_document': {
      // Patel's ICP — maps to Section 1 customer signals
      const bp = content.buyerPersona as Record<string, unknown> | undefined
      const fm = content.firmographics as Record<string, unknown> | undefined

      const fields: PatchMap = {}
      const ct = safeStr(bp?.title ?? bp?.jobTitle ?? fm?.companyType ?? content.customerSegment)
      if (ct) fields['customerType'] = ct
      // ICP frustrations → customer quote signal
      const pain = Array.isArray(bp?.frustrations)
        ? (bp!.frustrations as string[]).join('; ')
        : safeStr(bp?.mainPain ?? content.primaryPain)
      if (pain) fields['customerQuote'] = pain

      return Object.keys(fields).length > 0 ? { section: 1, fields } : null
    }

    case 'gtm_playbook': {
      // Patel's GTM playbook — Section 1 GTM signals
      const channels = content.channels as string[] | string | undefined
      const fields: PatchMap = {}
      if (Array.isArray(channels) && channels.length > 0) {
        fields['channelsTried'] = channels
      } else if (typeof channels === 'string' && channels.trim()) {
        fields['channelsTried'] = channels.split(',').map(s => s.trim()).filter(Boolean)
      }
      const cac = safeNum((content.budget as Record<string, unknown>)?.cacTarget ?? content.cacTarget)
      if (cac) fields['cac'] = cac

      return Object.keys(fields).length > 0 ? { section: 1, fields } : null
    }

    case 'competitive_matrix': {
      // Atlas's competitive matrix — Section 2 market fields
      const competitors = content.competitors
      let count: number | undefined
      if (Array.isArray(competitors)) count = competitors.length
      else count = safeNum(content.competitorCount)

      const fields: PatchMap = {}
      if (count) fields['p2.competitorCount'] = count
      const ctx = safeStr(content.competitiveContext ?? content.ourPosition)
      if (ctx) fields['p2.competitorDensityContext'] = ctx

      return Object.keys(fields).length > 0 ? { section: 2, fields } : null
    }

    default:
      return null
  }
}

// ── Apply patch to profile_builder_data (gap-fill only) ──────────────────────

async function patchProfileSection(
  supabase: SupabaseClient,
  userId: string,
  section: number,
  newFields: PatchMap
): Promise<boolean> {
  // Fetch current section data
  const { data: row } = await supabase
    .from('profile_builder_data')
    .select('extracted_fields, confidence_map')
    .eq('user_id', userId)
    .eq('section', section)
    .single()

  const existing = (row?.extracted_fields ?? {}) as Record<string, unknown>
  const existingConf = (row?.confidence_map ?? {}) as Record<string, number>

  // Gap-fill: only write fields that are currently absent/null
  const patch: Record<string, unknown> = {}
  const confPatch: Record<string, number> = {}

  for (const [key, value] of Object.entries(newFields)) {
    // Support dot-notation keys like "financial.mrr"
    const topKey = key.split('.')[0]
    const nestedKey = key.includes('.') ? key.split('.').slice(1).join('.') : null

    if (nestedKey) {
      const existingNested = existing[topKey] as Record<string, unknown> | undefined
      if (!existingNested?.[nestedKey]) {
        patch[topKey] = { ...(existingNested ?? {}), [nestedKey]: value }
        confPatch[key] = 0.60
      }
    } else {
      if (existing[key] === undefined || existing[key] === null) {
        patch[key] = value
        confPatch[key] = 0.60
      }
    }
  }

  if (Object.keys(patch).length === 0) return false  // nothing new to write

  const upsertPayload = {
    user_id: userId,
    section,
    extracted_fields: { ...existing, ...patch },
    confidence_map: { ...existingConf, ...confPatch },
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('profile_builder_data')
    .upsert(upsertPayload, { onConflict: 'user_id,section' })

  if (error) {
    log.warn('[artifact-scorer] patch upsert failed:', error.message)
    return false
  }

  return true
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function scoreFromArtifact(
  userId: string,
  artifactType: string,
  content: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<void> {
  // 1. Extract patchable fields from artifact
  const patch = extractPatchFields(artifactType, content)
  if (!patch) return  // artifact type doesn't contribute to scoring

  // 2. Apply gap-fill patch to profile_builder_data
  const didPatch = await patchProfileSection(supabase, userId, patch.section, patch.fields)
  if (!didPatch) return  // nothing changed, no need to rescore

  // 3. Reload all sections and rescore
  const { data: rows } = await supabase
    .from('profile_builder_data')
    .select('section, extracted_fields, confidence_map')
    .eq('user_id', userId)

  if (!rows || rows.length === 0) return

  const sections: Partial<Record<number, SectionData>> = {}
  for (const row of rows) {
    sections[row.section as number] = {
      extractedFields: (row.extracted_fields ?? {}) as Record<string, unknown>,
      confidenceMap: (row.confidence_map ?? {}) as Record<string, number>,
    }
  }

  const { assessmentData } = mergeToAssessmentData(sections)

  // 4. Load founder profile for sector/stage/track
  const { data: fp } = await supabase
    .from('founder_profiles')
    .select('industry, stage, is_impact_focused')
    .eq('user_id', userId)
    .single()

  const sector = normalizeSector(fp?.industry ?? 'default')
  const stage = inferStage(fp?.stage ?? 'mid')
  const isImpactFocused = fp?.is_impact_focused ?? false

  // 5. Get sector weights (cache-first)
  let customWeights: number[] | undefined
  const cachedWeights = getCachedSectorWeights<number[]>(sector, stage)
  if (cachedWeights) {
    customWeights = cachedWeights
  } else {
    const { data: weightRow } = await supabase
      .from('sector_weight_profiles')
      .select('p1_weight, p2_weight, p3_weight, p4_weight, p5_weight, p6_weight')
      .eq('sector', sector)
      .single()
    if (weightRow) {
      customWeights = [
        weightRow.p1_weight, weightRow.p2_weight, weightRow.p3_weight,
        weightRow.p4_weight, weightRow.p5_weight, weightRow.p6_weight,
      ]
    }
  }

  // 6. Calculate updated IQ score
  const iqResult = calculateIQScore(
    assessmentData,
    stage,
    sector,
    isImpactFocused ? 'impact' : 'commercial',
    customWeights
  )

  const finalScore = Math.max(1, Math.min(100, Math.round(iqResult.finalIQ)))
  const grade = calculateGrade(finalScore)

  // 7. Get previous score for chain
  const { data: prevScore } = await supabase
    .from('qscore_history')
    .select('id, overall_score')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  // 8. Insert new qscore_history row with data_source = 'agent_artifact'
  const paramMap = Object.fromEntries(iqResult.parameters.map(p => [p.id, p]))
  const { error: insertErr } = await supabase
    .from('qscore_history')
    .insert({
      user_id: userId,
      overall_score: finalScore,
      market_score:   Math.round((paramMap['p1']?.averageScore ?? 0) * 20),
      product_score:  Math.round((paramMap['p3']?.averageScore ?? 0) * 20),
      gtm_score:      Math.round((paramMap['p2']?.averageScore ?? 0) * 20),
      financial_score:Math.round((paramMap['p6']?.averageScore ?? 0) * 20),
      team_score:     Math.round((paramMap['p4']?.averageScore ?? 0) * 20),
      traction_score: Math.round((paramMap['p1']?.averageScore ?? 0) * 20),
      grade,
      data_source: 'agent_artifact',
      source_artifact_type: artifactType,
      assessment_data: { ...assessmentData, scoreVersion: 'v2_iq' },
      previous_score_id: (prevScore as { id: string } | null)?.id ?? null,
      score_version: 'v2_iq',
      iq_breakdown: iqResult,
      available_iq: iqResult.availableIQ,
      track: iqResult.track,
      reconciliation_flags: [],
      validation_warnings: [],
    })

  if (insertErr) {
    log.warn('[artifact-scorer] qscore insert failed:', insertErr.message)
  }
}
