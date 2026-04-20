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
import { createClient } from '@supabase/supabase-js'
import { getArtifactPrompt } from '@/features/agents/patel/prompts/artifact-prompts'
import { applyAgentScoreSignal } from '@/features/qscore/services/agent-signal'
import { routedText } from '@/lib/llm/router'
import { critiqueArtifact, patchArtifact } from '@/lib/agents/critique'
import { FF_ARTIFACT_SELF_CRITIQUE } from '@/lib/feature-flags'
import { ARTIFACT_TYPES, ALL_ARTIFACT_TYPES, type ArtifactType } from '@/lib/constants/artifact-types'
import { DIMENSIONS } from '@/lib/constants/dimensions'
import { isCircuitOpen, withCircuitBreaker } from '@/lib/circuit-breaker'
import { getStartupState, updateStartupState, extractStateFromArtifact } from '@/lib/agents/startup-state'
import { upsertAgentGoal } from '@/lib/agents/agent-goals'
import { triggerProactiveDelegations } from '@/lib/agents/delegation'

const ARTIFACT_DIMENSION: Record<ArtifactType, string> = {
  // Existing
  [ARTIFACT_TYPES.ICP_DOCUMENT]:              DIMENSIONS.GTM,
  [ARTIFACT_TYPES.OUTREACH_SEQUENCE]:         DIMENSIONS.GTM,
  [ARTIFACT_TYPES.BATTLE_CARD]:               DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.GTM_PLAYBOOK]:              DIMENSIONS.GTM,
  [ARTIFACT_TYPES.SALES_SCRIPT]:              DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.BRAND_MESSAGING]:           DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.FINANCIAL_SUMMARY]:         DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.LEGAL_CHECKLIST]:           DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.HIRING_PLAN]:               DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.PMF_SURVEY]:                DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.INTERVIEW_NOTES]:           DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.COMPETITIVE_MATRIX]:        DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.STRATEGIC_PLAN]:            DIMENSIONS.MARKET,
  // Patel
  [ARTIFACT_TYPES.LEAD_LIST]:                 DIMENSIONS.GTM,
  [ARTIFACT_TYPES.CAMPAIGN_REPORT]:           DIMENSIONS.GTM,
  [ARTIFACT_TYPES.AB_TEST_RESULT]:            DIMENSIONS.GTM,
  // Susi
  [ARTIFACT_TYPES.CALL_PLAYBOOK]:             DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.PIPELINE_REPORT]:           DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.PROPOSAL]:                  DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.WIN_LOSS_ANALYSIS]:         DIMENSIONS.TRACTION,
  // Maya
  [ARTIFACT_TYPES.CONTENT_CALENDAR]:          DIMENSIONS.GTM,
  [ARTIFACT_TYPES.SEO_AUDIT]:                 DIMENSIONS.GTM,
  [ARTIFACT_TYPES.PRESS_KIT]:                 DIMENSIONS.GTM,
  [ARTIFACT_TYPES.NEWSLETTER_ISSUE]:          DIMENSIONS.GTM,
  [ARTIFACT_TYPES.BRAND_HEALTH_REPORT]:       DIMENSIONS.MARKET,
  // Felix
  [ARTIFACT_TYPES.FINANCIAL_MODEL]:           DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.INVESTOR_UPDATE]:           DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.BOARD_DECK]:               DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.CAP_TABLE_SUMMARY]:         DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.FUNDRAISING_NARRATIVE]:     DIMENSIONS.FINANCIAL,
  // Leo
  [ARTIFACT_TYPES.NDA]:                       DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.SAFE_NOTE]:                 DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.CONTRACTOR_AGREEMENT]:      DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.PRIVACY_POLICY]:            DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.IP_AUDIT_REPORT]:           DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.TERM_SHEET_REDLINE]:        DIMENSIONS.FINANCIAL,
  // Harper
  [ARTIFACT_TYPES.JOB_DESCRIPTION]:           DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.INTERVIEW_SCORECARD]:       DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.OFFER_LETTER]:              DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.ONBOARDING_PLAN]:           DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.COMP_BENCHMARK]:            DIMENSIONS.TEAM,
  // Nova
  [ARTIFACT_TYPES.RETENTION_REPORT]:          DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.PRODUCT_INSIGHT]:           DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.EXPERIMENT_DESIGN]:         DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.ROADMAP]:                   DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.USER_PERSONA]:              DIMENSIONS.PRODUCT,
  // Atlas
  [ARTIFACT_TYPES.COMPETITOR_WEEKLY]:         DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.MARKET_MAP]:                DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.REVIEW_INTELLIGENCE]:       DIMENSIONS.MARKET,
  // Sage
  [ARTIFACT_TYPES.INVESTOR_READINESS_REPORT]: DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.CONTRADICTION_REPORT]:      DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.OKR_HEALTH_REPORT]:         DIMENSIONS.GTM,
  [ARTIFACT_TYPES.CRISIS_PLAYBOOK]:           DIMENSIONS.GTM,
  // Carter
  [ARTIFACT_TYPES.CUSTOMER_HEALTH_REPORT]:    DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.CHURN_ANALYSIS]:            DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.QBR_DECK]:                  DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.EXPANSION_PLAYBOOK]:        DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.CS_PLAYBOOK]:               DIMENSIONS.TRACTION,
  // Riley
  [ARTIFACT_TYPES.GROWTH_MODEL]:              DIMENSIONS.GTM,
  [ARTIFACT_TYPES.PAID_CAMPAIGN]:             DIMENSIONS.GTM,
  [ARTIFACT_TYPES.REFERRAL_PROGRAM]:          DIMENSIONS.GTM,
  [ARTIFACT_TYPES.LAUNCH_PLAYBOOK]:           DIMENSIONS.GTM,
  [ARTIFACT_TYPES.GROWTH_REPORT]:             DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.EXPERIMENT_RESULTS]:        DIMENSIONS.PRODUCT,
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

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  // Validate internal secret
  const secret = req.headers.get('x-run-secret')
  if (!secret || secret !== process.env.INTERNAL_RUN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getAdmin()
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
    const artifactPrompt = getArtifactPrompt(artifactType, context, null)
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

      // RAG embedding
      if (artifactId && !isCircuitOpen('openai_embeddings')) {
        import('@/features/qscore/rag/embeddings/embedding-pipeline')
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
    console.error('[generate/run]', err)
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
