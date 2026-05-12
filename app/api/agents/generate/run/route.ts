/**
 * Background artifact generation runner
 *
 * POST /api/agents/generate/run
 * Body: { jobId, agentId, conversationHistory, artifactType, conversationId, userId }
 *
 * This endpoint is called internally by /api/agents/generate to execute the
 * actual LLM work without blocking the original response cycle.
 *
 * Uses Node.js runtime (not Edge) — 300s timeout, not 10s.
 * Protected by INTERNAL_RUN_SECRET (header X-Run-Secret must match).
 */

export const runtime = 'nodejs'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { getArtifactPrompt } from '@/features/agents/patel/prompts/artifact-prompts'
import { applyAgentScoreSignal } from '@/features/qscore/services/agent-signal'
import { routedText } from '@/lib/llm/router'
import { critiqueArtifact, patchArtifact } from '@/lib/agents/critique'
import { FF_ARTIFACT_SELF_CRITIQUE } from '@/lib/feature-flags'
import { ARTIFACT_TYPES, ALL_ARTIFACT_TYPES, type ArtifactType } from '@/lib/constants/artifact-types'
import { PARAMS } from '@/lib/constants/dimensions'
import { isCircuitOpen, withCircuitBreaker } from '@/lib/circuit-breaker'
import { getStartupState, updateStartupState, extractStateFromArtifact } from '@/lib/agents/startup-state'
import { upsertAgentGoal } from '@/lib/agents/agent-goals'
import { triggerProactiveDelegations } from '@/lib/agents/delegation'
import { updatePatelIndicatorsFromArtifact } from '@/lib/agents/patel-indicator-updater'
import { log } from '@/lib/logger'
import type { PatelScores, PatelConfidence } from '@/lib/constants/patel-indicators'

const ARTIFACT_DIMENSION: Record<ArtifactType, string> = {
  // Existing
  [ARTIFACT_TYPES.ICP_DOCUMENT]:              PARAMS.P2,
  [ARTIFACT_TYPES.OUTREACH_SEQUENCE]:         PARAMS.P1,
  [ARTIFACT_TYPES.BATTLE_CARD]:               PARAMS.P2,
  [ARTIFACT_TYPES.GTM_PLAYBOOK]:              PARAMS.P1,
  [ARTIFACT_TYPES.SALES_SCRIPT]:              PARAMS.P1,
  [ARTIFACT_TYPES.BRAND_MESSAGING]:           PARAMS.P2,
  [ARTIFACT_TYPES.FINANCIAL_SUMMARY]:         PARAMS.P6,
  [ARTIFACT_TYPES.LEGAL_CHECKLIST]:           PARAMS.P3,
  [ARTIFACT_TYPES.HIRING_PLAN]:               PARAMS.P4,
  [ARTIFACT_TYPES.PMF_SURVEY]:                PARAMS.P1,
  [ARTIFACT_TYPES.INTERVIEW_NOTES]:           PARAMS.P1,
  [ARTIFACT_TYPES.COMPETITIVE_MATRIX]:        PARAMS.P2,
  [ARTIFACT_TYPES.STRATEGIC_PLAN]:            PARAMS.P2,
  [ARTIFACT_TYPES.PAINS_GAINS_TRIGGERS]:      PARAMS.P1,
  [ARTIFACT_TYPES.BUYER_JOURNEY]:             PARAMS.P1,
  [ARTIFACT_TYPES.POSITIONING_MESSAGING]:     PARAMS.P1,
  // Patel
  [ARTIFACT_TYPES.LEAD_LIST]:                 PARAMS.P1,
  [ARTIFACT_TYPES.CAMPAIGN_REPORT]:           PARAMS.P1,
  [ARTIFACT_TYPES.AB_TEST_RESULT]:            PARAMS.P1,
  // Susi
  [ARTIFACT_TYPES.CALL_PLAYBOOK]:             PARAMS.P1,
  [ARTIFACT_TYPES.PIPELINE_REPORT]:           PARAMS.P1,
  [ARTIFACT_TYPES.PROPOSAL]:                  PARAMS.P1,
  [ARTIFACT_TYPES.WIN_LOSS_ANALYSIS]:         PARAMS.P1,
  // Maya
  [ARTIFACT_TYPES.CONTENT_CALENDAR]:          PARAMS.P2,
  [ARTIFACT_TYPES.SEO_AUDIT]:                 PARAMS.P2,
  [ARTIFACT_TYPES.PRESS_KIT]:                 PARAMS.P2,
  [ARTIFACT_TYPES.NEWSLETTER_ISSUE]:          PARAMS.P2,
  [ARTIFACT_TYPES.BRAND_HEALTH_REPORT]:       PARAMS.P2,
  // Felix
  [ARTIFACT_TYPES.FINANCIAL_MODEL]:           PARAMS.P6,
  [ARTIFACT_TYPES.INVESTOR_UPDATE]:           PARAMS.P6,
  [ARTIFACT_TYPES.BOARD_DECK]:                PARAMS.P6,
  [ARTIFACT_TYPES.CAP_TABLE_SUMMARY]:         PARAMS.P6,
  [ARTIFACT_TYPES.FUNDRAISING_NARRATIVE]:     PARAMS.P6,
  // Leo
  [ARTIFACT_TYPES.NDA]:                       PARAMS.P3,
  [ARTIFACT_TYPES.SAFE_NOTE]:                 PARAMS.P6,
  [ARTIFACT_TYPES.CONTRACTOR_AGREEMENT]:      PARAMS.P4,
  [ARTIFACT_TYPES.PRIVACY_POLICY]:            PARAMS.P3,
  [ARTIFACT_TYPES.IP_AUDIT_REPORT]:           PARAMS.P3,
  [ARTIFACT_TYPES.TERM_SHEET_REDLINE]:        PARAMS.P6,
  // Harper
  [ARTIFACT_TYPES.JOB_DESCRIPTION]:           PARAMS.P4,
  [ARTIFACT_TYPES.INTERVIEW_SCORECARD]:       PARAMS.P4,
  [ARTIFACT_TYPES.OFFER_LETTER]:              PARAMS.P4,
  [ARTIFACT_TYPES.ONBOARDING_PLAN]:           PARAMS.P4,
  [ARTIFACT_TYPES.COMP_BENCHMARK]:            PARAMS.P4,
  // Nova
  [ARTIFACT_TYPES.RETENTION_REPORT]:          PARAMS.P1,
  [ARTIFACT_TYPES.PRODUCT_INSIGHT]:           PARAMS.P1,
  [ARTIFACT_TYPES.EXPERIMENT_DESIGN]:         PARAMS.P1,
  [ARTIFACT_TYPES.ROADMAP]:                   PARAMS.P5,
  [ARTIFACT_TYPES.USER_PERSONA]:              PARAMS.P1,
  // Atlas
  [ARTIFACT_TYPES.COMPETITOR_WEEKLY]:         PARAMS.P2,
  [ARTIFACT_TYPES.MARKET_MAP]:                PARAMS.P2,
  [ARTIFACT_TYPES.REVIEW_INTELLIGENCE]:       PARAMS.P2,
  // Sage
  [ARTIFACT_TYPES.INVESTOR_READINESS_REPORT]: PARAMS.P5,
  [ARTIFACT_TYPES.CONTRADICTION_REPORT]:      PARAMS.P5,
  [ARTIFACT_TYPES.OKR_HEALTH_REPORT]:         PARAMS.P5,
  [ARTIFACT_TYPES.CRISIS_PLAYBOOK]:           PARAMS.P5,
  // Carter
  [ARTIFACT_TYPES.CUSTOMER_HEALTH_REPORT]:    PARAMS.P1,
  [ARTIFACT_TYPES.CHURN_ANALYSIS]:            PARAMS.P1,
  [ARTIFACT_TYPES.QBR_DECK]:                  PARAMS.P1,
  [ARTIFACT_TYPES.EXPANSION_PLAYBOOK]:        PARAMS.P6,
  [ARTIFACT_TYPES.CS_PLAYBOOK]:               PARAMS.P1,
  // Riley
  [ARTIFACT_TYPES.GROWTH_MODEL]:              PARAMS.P2,
  [ARTIFACT_TYPES.PAID_CAMPAIGN]:             PARAMS.P2,
  [ARTIFACT_TYPES.REFERRAL_PROGRAM]:          PARAMS.P1,
  [ARTIFACT_TYPES.LAUNCH_PLAYBOOK]:           PARAMS.P1,
  [ARTIFACT_TYPES.GROWTH_REPORT]:             PARAMS.P1,
  [ARTIFACT_TYPES.EXPERIMENT_RESULTS]:        PARAMS.P1,
}

const ARTIFACT_EVIDENCE_POINTS: Record<string, number> = {
  icp_document: 5, outreach_sequence: 4, battle_card: 4, gtm_playbook: 6,
  sales_script: 4, brand_messaging: 4, financial_summary: 6,
  legal_checklist: 3, hiring_plan: 5, pmf_survey: 5,
  competitive_matrix: 5, strategic_plan: 4,
}

const ARTIFACT_LABEL: Record<string, string> = {
  icp_document: 'ICP Document', outreach_sequence: 'Outreach Sequence',
  battle_card: 'Battle Card', gtm_playbook: 'GTM Playbook',
  sales_script: 'Sales Script', brand_messaging: 'Brand Messaging',
  financial_summary: 'Financial Summary', legal_checklist: 'Legal Checklist',
  hiring_plan: 'Hiring Plan', pmf_survey: 'PMF Survey',
  competitive_matrix: 'Competitive Analysis', strategic_plan: 'Strategic Plan',
}

export async function POST(req: NextRequest) {
  // Validate internal secret
  const secret = req.headers.get('x-run-secret')
  if (!secret || secret !== process.env.INTERNAL_RUN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getAdminClient()
  const { jobId, agentId, conversationHistory, artifactType, conversationId, userId } = await req.json()

  if (!ALL_ARTIFACT_TYPES.includes(artifactType)) {
    return NextResponse.json({ error: 'Invalid artifact type' }, { status: 400 })
  }

  try {
    // Mark job as running
    await supabase.from('artifact_jobs').update({
      status: 'running',
      started_at: new Date().toISOString(),
    }).eq('id', jobId)

    // ── Pass 1: Extract context ────────────────────────────────────────────
    const conversationText = conversationHistory
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Founder' : 'Agent'}: ${m.content}`)
      .join('\n\n')

    const extractionPrompt = `Extract all relevant startup facts from this conversation for generating a ${artifactType.replace(/_/g, ' ')}.
Return a JSON object with descriptive key-value pairs. Only include information explicitly mentioned.
Return ONLY valid JSON.

Conversation:
${conversationText.slice(0, 4000)}`

    const extractRaw = await routedText('extraction', [
      { role: 'system', content: extractionPrompt },
      { role: 'user', content: 'Extract all relevant facts.' },
    ])

    let context: Record<string, unknown> = {}
    try {
      const cleaned = extractRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      context = JSON.parse(cleaned)
    } catch {
      context = { conversationSummary: conversationText.slice(0, 2000) }
    }

    // ── Pass 2: Generate artifact ──────────────────────────────────────────
    // Fetch Patel diagnostic scores for grounding (Patel sessions only)
    let artifactPatelScores: PatelScores | undefined
    let artifactPatelConfidence: PatelConfidence | undefined
    if (agentId === 'patel' && userId) {
      const { data: pds } = await supabase.from('patel_diagnostic_scores').select('scores, confidence').eq('user_id', userId).single()
      if (pds) { artifactPatelScores = pds.scores as PatelScores; artifactPatelConfidence = pds.confidence as PatelConfidence }
    }
    const artifactPrompt = getArtifactPrompt(artifactType, context, null, artifactPatelScores, artifactPatelConfidence)
    const artifactRaw = await routedText('generation', [
      { role: 'system', content: artifactPrompt },
      { role: 'user', content: 'Generate the deliverable now. Return ONLY valid JSON, no markdown.' },
    ])

    const cleanJson = artifactRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsedContent: Record<string, unknown>
    try {
      parsedContent = JSON.parse(cleanJson)
    } catch {
      const match = cleanJson.match(/\{[\s\S]*\}/)
      parsedContent = match ? JSON.parse(match[0]) : { error: 'parse_failed' }
    }

    // ── Pass 3 (optional): Self-critique + patch ────────────────────────────
    let critiqueMetadata = null
    if (FF_ARTIFACT_SELF_CRITIQUE) {
      try {
        const critique = await critiqueArtifact(artifactType, parsedContent)
        critiqueMetadata = critique
        if (critique.needsPatch) {
          const patched = await patchArtifact(artifactType, parsedContent, critique)
          parsedContent = patched
        }
      } catch {
        // self-critique failed — proceed with original
      }
    }

    const artifactTitle = (parsedContent.title as string | undefined) || artifactType.replace(/_/g, ' ')

    // ── Save to agent_artifacts ────────────────────────────────────────────
    let artifactId: string | null = null
    let scoreSignal: { boosted: boolean; pointsAdded?: number; dimensionLabel?: string } = { boosted: false }

    if (userId) {
      const { data: saved } = await supabase
        .from('agent_artifacts')
        .insert({
          conversation_id: conversationId ?? null,
          user_id: userId,
          agent_id: agentId,
          artifact_type: artifactType,
          title: artifactTitle,
          content: parsedContent,
          critique_metadata: critiqueMetadata,
        })
        .select('id')
        .single()
      artifactId = saved?.id ?? null

      // Write extracted facts to shared startup state + trigger proactive delegations
      const stateUpdates = extractStateFromArtifact(agentId, artifactType, parsedContent)
      if (Object.keys(stateUpdates).length > 0) {
        const prevState = await getStartupState(userId, supabase)
        await updateStartupState(userId, stateUpdates, agentId, supabase)
        // Refresh goal status for this agent
        const freshState = await getStartupState(userId, supabase)
        if (freshState) void upsertAgentGoal(agentId, userId, freshState, supabase)
        // Fire proactive delegations (Felix→Harper on runway drop, Nova→Maya on PMF update, etc.)
        void triggerProactiveDelegations(agentId, userId, prevState, stateUpdates, supabase)
      }

      // Patel 20-indicator score inference from deliverable content
      const PATEL_DELIVERABLES = ['icp_document', 'pains_gains_triggers', 'buyer_journey', 'positioning_messaging']
      if (agentId === 'patel' && PATEL_DELIVERABLES.includes(artifactType)) {
        void updatePatelIndicatorsFromArtifact(userId, artifactType, parsedContent, supabase).catch(() => { /* fire-and-forget: indicator sync is non-critical */ })
      }

      // RAG embedding
      if (artifactId && !isCircuitOpen('openai_embeddings')) {
        import('@/features/qscore/scoring/embeddings/embedding-pipeline')
          .then(({ embedArtifact }) =>
            withCircuitBreaker('openai_embeddings', () =>
              embedArtifact({ id: artifactId!, user_id: userId, artifact_type: artifactType, content: parsedContent })
            )
          )
          .catch(() => {/* non-blocking */})
      }

      // Score signal
      scoreSignal = await applyAgentScoreSignal(supabase, userId, artifactType, 'full')

      // Auto-create score evidence
      const evidenceDim = ARTIFACT_DIMENSION[artifactType as ArtifactType]
      const evidencePoints = ARTIFACT_EVIDENCE_POINTS[artifactType] ?? 4
      const evidenceLabel = ARTIFACT_LABEL[artifactType] ?? artifactType
      if (evidenceDim) {
        const { count } = await supabase
          .from('score_evidence')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('evidence_type', 'agent_artifact')
          .eq('data_value', artifactType)
        if ((count ?? 0) === 0) {
          await supabase.from('score_evidence').insert({
            user_id: userId, dimension: evidenceDim, evidence_type: 'agent_artifact',
            title: `${evidenceLabel} built with AI advisor`,
            description: `Auto-verified: generated a ${evidenceLabel} using the Edge Alpha agent network.`,
            data_value: artifactType, status: 'verified', points_awarded: evidencePoints,
            reviewed_at: new Date().toISOString(),
          })
        }
      }
    }

    const result = {
      artifact: { id: artifactId, type: artifactType, title: artifactTitle, content: parsedContent },
      scoreSignal,
    }

    // Mark job completed
    await supabase.from('artifact_jobs').update({
      status: 'completed',
      result,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('[generate/run]', err)
    try {
      await supabase.from('artifact_jobs').update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      }).eq('id', jobId)
    } catch { /* ignore */ }
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
