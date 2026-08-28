/**
 * POST /api/leverage-check/submit — public, anonymous. Scores the 8-question Founder Leverage
 * Check, generates the short result + full report (LLM with a local fallback), stores the
 * submission, and returns everything the results page needs in one response — no separate GET
 * route exists, the browser never re-fetches this by id.
 *
 * NOT the Q-Score. Fully independent scoring engine and table (see the migration's own header).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { parseBody } from '@/lib/api/validate'
import { leverageCheckAnswersSchema } from '@/features/leverage-check/scoring/validate'
import { calculateLeverageCheck } from '@/features/leverage-check/scoring/calculate'
import { generateLeverageCheckReport } from '@/features/leverage-check/report/generate'
import { log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, leverageCheckAnswersSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const result = calculateLeverageCheck(parsed.data)
    const report = await generateLeverageCheckReport(result, parsed.data)

    const admin = getAdminClient()
    const { data, error } = await admin
      .from('leverage_check_submissions')
      .insert({
        answers: parsed.data,
        dependency_score: result.dimensionScores.dependency,
        decision_score: result.dimensionScores.decision,
        execution_score: result.dimensionScores.execution,
        growth_score: result.dimensionScores.growth,
        management_score: result.dimensionScores.management,
        multiple: result.multiple,
        archetype: result.archetype,
        strongest_dimension: result.strongestDimension,
        weakest_dimension: result.weakestDimension,
        short_result: report.shortResult,
        full_report: report.fullReport,
        ai_generated: report.aiGenerated,
      })
      .select('id')
      .single()

    // The DB insert failing is a hard failure (unlike the LLM step above) — without a stored
    // row there's no id to link a later signup back to.
    if (error || !data) {
      log.error('leverage-check submit: insert failed', { error })
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    return NextResponse.json(
      {
        id: data.id,
        multiple: result.multiple,
        archetype: result.archetype,
        dimensionScores: result.dimensionScores,
        strongestDimension: result.strongestDimension,
        weakestDimension: result.weakestDimension,
        shortResult: report.shortResult,
        fullReport: report.fullReport,
      },
      { status: 201 },
    )
  } catch (err) {
    log.error('leverage-check submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
