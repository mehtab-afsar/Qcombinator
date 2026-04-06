import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createUserClient } from '@/lib/supabase/server';
import { getArtifactPrompt } from '@/features/agents/patel/prompts/artifact-prompts';
import { applyAgentScoreSignal } from '@/features/qscore/services/agent-signal';
import { checkArtifactConsistency } from '@/features/qscore/services/consistency-checker';
import { routedText } from '@/lib/llm/router';
import { critiqueArtifact, patchArtifact } from '@/lib/agents/critique';
import { FF_ASYNC_ARTIFACT_GENERATION, FF_ARTIFACT_SELF_CRITIQUE } from '@/lib/feature-flags';
import { ARTIFACT_TYPES, ALL_ARTIFACT_TYPES, type ArtifactType } from '@/lib/constants/artifact-types';
import { DIMENSIONS } from '@/lib/constants/dimensions';
import { executeTool } from '@/lib/tools/executor';
import { isCircuitOpen, withCircuitBreaker } from '@/lib/circuit-breaker';

/**
 * Agent Artifact Generation API
 *
 * Generates a structured deliverable from conversation history.
 * Uses a 2-pass approach:
 *   Pass 1 — extract key context facts from the conversation
 *   Pass 2 — generate the artifact JSON using the extracted context
 *
 * Works for all agents (not just Patel).
 */

const VALID_ARTIFACT_TYPES: string[] = ALL_ARTIFACT_TYPES;

// Which Q-Score dimension each artifact type primarily improves
const ARTIFACT_DIMENSION: Record<ArtifactType, string> = {
  // Existing
  [ARTIFACT_TYPES.ICP_DOCUMENT]:            DIMENSIONS.GTM,
  [ARTIFACT_TYPES.OUTREACH_SEQUENCE]:       DIMENSIONS.GTM,
  [ARTIFACT_TYPES.BATTLE_CARD]:             DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.GTM_PLAYBOOK]:            DIMENSIONS.GTM,
  [ARTIFACT_TYPES.SALES_SCRIPT]:            DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.BRAND_MESSAGING]:         DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.FINANCIAL_SUMMARY]:       DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.LEGAL_CHECKLIST]:         DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.HIRING_PLAN]:             DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.PMF_SURVEY]:              DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.INTERVIEW_NOTES]:         DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.COMPETITIVE_MATRIX]:      DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.STRATEGIC_PLAN]:          DIMENSIONS.MARKET,
  // Patel
  [ARTIFACT_TYPES.LEAD_LIST]:               DIMENSIONS.GTM,
  [ARTIFACT_TYPES.CAMPAIGN_REPORT]:         DIMENSIONS.GTM,
  [ARTIFACT_TYPES.AB_TEST_RESULT]:          DIMENSIONS.GTM,
  // Susi
  [ARTIFACT_TYPES.CALL_PLAYBOOK]:           DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.PIPELINE_REPORT]:         DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.PROPOSAL]:                DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.WIN_LOSS_ANALYSIS]:       DIMENSIONS.TRACTION,
  // Maya
  [ARTIFACT_TYPES.CONTENT_CALENDAR]:        DIMENSIONS.GTM,
  [ARTIFACT_TYPES.SEO_AUDIT]:               DIMENSIONS.GTM,
  [ARTIFACT_TYPES.PRESS_KIT]:               DIMENSIONS.GTM,
  [ARTIFACT_TYPES.NEWSLETTER_ISSUE]:        DIMENSIONS.GTM,
  [ARTIFACT_TYPES.BRAND_HEALTH_REPORT]:     DIMENSIONS.MARKET,
  // Felix
  [ARTIFACT_TYPES.FINANCIAL_MODEL]:         DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.INVESTOR_UPDATE]:         DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.BOARD_DECK]:              DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.CAP_TABLE_SUMMARY]:       DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.FUNDRAISING_NARRATIVE]:   DIMENSIONS.FINANCIAL,
  // Leo
  [ARTIFACT_TYPES.NDA]:                     DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.SAFE_NOTE]:               DIMENSIONS.FINANCIAL,
  [ARTIFACT_TYPES.CONTRACTOR_AGREEMENT]:    DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.PRIVACY_POLICY]:          DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.IP_AUDIT_REPORT]:         DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.TERM_SHEET_REDLINE]:      DIMENSIONS.FINANCIAL,
  // Harper
  [ARTIFACT_TYPES.JOB_DESCRIPTION]:         DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.INTERVIEW_SCORECARD]:     DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.OFFER_LETTER]:            DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.ONBOARDING_PLAN]:         DIMENSIONS.TEAM,
  [ARTIFACT_TYPES.COMP_BENCHMARK]:          DIMENSIONS.TEAM,
  // Nova
  [ARTIFACT_TYPES.RETENTION_REPORT]:        DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.PRODUCT_INSIGHT]:         DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.EXPERIMENT_DESIGN]:       DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.ROADMAP]:                 DIMENSIONS.PRODUCT,
  [ARTIFACT_TYPES.USER_PERSONA]:            DIMENSIONS.PRODUCT,
  // Atlas
  [ARTIFACT_TYPES.COMPETITOR_WEEKLY]:       DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.MARKET_MAP]:              DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.REVIEW_INTELLIGENCE]:     DIMENSIONS.MARKET,
  // Sage
  [ARTIFACT_TYPES.INVESTOR_READINESS_REPORT]: DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.CONTRADICTION_REPORT]:    DIMENSIONS.MARKET,
  [ARTIFACT_TYPES.OKR_HEALTH_REPORT]:       DIMENSIONS.GTM,
  [ARTIFACT_TYPES.CRISIS_PLAYBOOK]:         DIMENSIONS.GTM,
  // Carter
  [ARTIFACT_TYPES.CUSTOMER_HEALTH_REPORT]:  DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.CHURN_ANALYSIS]:          DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.QBR_DECK]:               DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.EXPANSION_PLAYBOOK]:      DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.CS_PLAYBOOK]:             DIMENSIONS.TRACTION,
  // Riley
  [ARTIFACT_TYPES.GROWTH_MODEL]:            DIMENSIONS.GTM,
  [ARTIFACT_TYPES.PAID_CAMPAIGN]:           DIMENSIONS.GTM,
  [ARTIFACT_TYPES.REFERRAL_PROGRAM]:        DIMENSIONS.GTM,
  [ARTIFACT_TYPES.LAUNCH_PLAYBOOK]:         DIMENSIONS.GTM,
  [ARTIFACT_TYPES.GROWTH_REPORT]:           DIMENSIONS.TRACTION,
  [ARTIFACT_TYPES.EXPERIMENT_RESULTS]:      DIMENSIONS.PRODUCT,
};

// Points awarded as auto-verified evidence
const ARTIFACT_EVIDENCE_POINTS: Record<string, number> = {
  icp_document:       5,
  outreach_sequence:  4,
  battle_card:        4,
  gtm_playbook:       6,
  sales_script:       4,
  brand_messaging:    4,
  financial_summary:  6,
  legal_checklist:    3,
  hiring_plan:        5,
  pmf_survey:         5,
  competitive_matrix: 5,
  strategic_plan:     4,
};

// Human-readable artifact labels for evidence titles
const ARTIFACT_LABEL: Record<string, string> = {
  icp_document:       'ICP Document',
  outreach_sequence:  'Outreach Sequence',
  battle_card:        'Battle Card',
  gtm_playbook:       'GTM Playbook',
  sales_script:       'Sales Script',
  brand_messaging:    'Brand Messaging',
  financial_summary:  'Financial Summary',
  legal_checklist:    'Legal Checklist',
  hiring_plan:        'Hiring Plan',
  pmf_survey:         'PMF Survey',
  competitive_matrix: 'Competitive Analysis',
  strategic_plan:     'Strategic Plan',
};

// Pass 1: Extract structured context from the conversation
async function extractContext(
  conversationHistory: Array<{ role: string; content: string }>,
  artifactType: string,
): Promise<Record<string, unknown>> {
  const CONTEXT_LABELS: Record<string, string> = {
    icp_document:       'ICP document (ideal customer profile)',
    outreach_sequence:  'cold outreach sequence',
    battle_card:        'competitor battle card',
    gtm_playbook:       'GTM playbook',
    sales_script:       'sales call script',
    brand_messaging:    'brand messaging framework',
    financial_summary:  'financial summary',
    legal_checklist:    'legal checklist',
    hiring_plan:        'hiring plan',
    pmf_survey:         'PMF research kit',
    competitive_matrix: 'competitive analysis',
    strategic_plan:     'strategic plan',
  };

  const label = CONTEXT_LABELS[artifactType] || artifactType;
  const conversationText = conversationHistory
    .map(m => `${m.role === 'user' ? 'Founder' : 'Agent'}: ${m.content}`)
    .join('\n\n');

  const extractionPrompt = `You are extracting structured context from a conversation between a startup founder and an AI advisor.
The goal is to extract all relevant facts needed to generate a ${label}.

Conversation:
${conversationText}

Extract every relevant fact mentioned — product description, target market, company stage, financials, team, customers, competitors, goals, challenges, etc.
Return a JSON object with key-value pairs. Use descriptive keys. Only include information explicitly mentioned in the conversation.
Return ONLY valid JSON. No markdown, no explanation.`;

  const raw = await routedText('extraction', [
    { role: 'system', content: extractionPrompt },
    { role: 'user', content: 'Extract all relevant facts from the conversation above.' },
  ]);

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // If extraction fails, return a basic context from the conversation
    return { conversationSummary: conversationText.slice(0, 2000) };
  }
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // ── Server-side auth: never trust userId from the client body ──────────
    const userClient = await createUserClient();
    const { data: { user: authedUser } } = await userClient.auth.getUser();
    const userId: string | undefined = authedUser?.id;

    const { agentId, conversationHistory, artifactType, conversationId } = await request.json();

    if (!agentId || !artifactType) {
      return NextResponse.json({ error: 'agentId and artifactType are required' }, { status: 400 });
    }

    if (!VALID_ARTIFACT_TYPES.includes(artifactType)) {
      return NextResponse.json({ error: `Invalid artifactType: ${artifactType}` }, { status: 400 });
    }

    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return NextResponse.json({ error: 'conversationHistory is required' }, { status: 400 });
    }

    // Create an artifact_jobs row for async status tracking
    let jobId: string | null = null
    if (userId) {
      const { data: jobRow } = await supabaseAdmin
        .from('artifact_jobs')
        .insert({
          user_id: userId,
          agent_id: agentId,
          artifact_type: artifactType,
          conversation_id: conversationId ?? null,
          status: FF_ASYNC_ARTIFACT_GENERATION ? 'pending' : 'running',
          started_at: FF_ASYNC_ARTIFACT_GENERATION ? null : new Date().toISOString(),
        })
        .select('id')
        .single()
      jobId = jobRow?.id ?? null
    }

    // When async flag is on: fire background run and return jobId immediately
    if (FF_ASYNC_ARTIFACT_GENERATION && jobId && userId) {
      const runSecret = process.env.INTERNAL_RUN_SECRET
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      void fetch(`${baseUrl}/api/agents/generate/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-run-secret': runSecret ?? '',
        },
        body: JSON.stringify({ jobId, agentId, conversationHistory, artifactType, conversationId, userId }),
      }).catch(err => console.error('[generate] async run trigger failed:', err))
      return NextResponse.json({ jobId, status: 'pending' })
    }

    // ── Wrap the 2-pass generation flow in the universal executor ─────────
    // Benefits: retry logic, rate limiting, unified tool_execution_logs entry.
    type ArtifactResult = {
      artifactId: string | null;
      artifactTitle: string;
      parsedContent: Record<string, unknown>;
      scoreSignal: { boosted: boolean; pointsAdded?: number; dimensionLabel?: string };
    };

    let generationResult: ArtifactResult;
    try {
      const { result } = await executeTool<ArtifactResult>(
        artifactType,
        { agentId, conversationHistory },
        userId ?? undefined,
        supabaseAdmin,
        async () => {
          // ── Pass 1: Extract context from conversation ──────────────────
          const context = await extractContext(conversationHistory, artifactType);

          // ── Pass 2: Generate artifact ──────────────────────────────────
          const artifactPrompt = getArtifactPrompt(artifactType, context, null);
          const artifactRaw = await routedText('generation', [
            { role: 'system', content: artifactPrompt },
            { role: 'user', content: 'Generate the deliverable now. Return ONLY valid JSON, no markdown fences, no explanation text.' },
          ]);

          const cleanJson = artifactRaw
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

          let parsedContent: Record<string, unknown>;
          try {
            parsedContent = JSON.parse(cleanJson);
          } catch {
            const match = cleanJson.match(/\{[\s\S]*\}/);
            parsedContent = match ? JSON.parse(match[0]) : (() => { throw new Error('Malformed JSON from LLM'); })();
          }
          const artifactTitle = (parsedContent.title as string | undefined) || artifactType.replace(/_/g, ' ');

          // ── Persist to DB ──────────────────────────────────────────────
          let artifactId: string | null = null;
          let scoreSignal: { boosted: boolean; pointsAdded?: number; dimensionLabel?: string } = { boosted: false };

          if (userId) {
            // ── Self-critique + patch (runs before save so final content is persisted)
            let critiqueMetadata = null;
            if (FF_ARTIFACT_SELF_CRITIQUE) {
              try {
                const critique = await critiqueArtifact(artifactType, parsedContent);
                critiqueMetadata = critique;
                if (critique.needsPatch) {
                  parsedContent = await patchArtifact(artifactType, parsedContent, critique);
                }
              } catch {
                // critique failed — proceed with original
              }
            }

            const { data: saved } = await supabaseAdmin
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
              .single();
            artifactId = saved?.id ?? null;

            // ── RAG: embed artifact (fire-and-forget, skipped if circuit open) ─
            if (artifactId && !isCircuitOpen('openai_embeddings')) {
              import('@/features/qscore/rag/embeddings/embedding-pipeline')
                .then(({ embedArtifact }) =>
                  withCircuitBreaker('openai_embeddings', () =>
                    embedArtifact({
                      id: artifactId!,
                      user_id: userId,
                      artifact_type: artifactType,
                      content: parsedContent,
                    })
                  )
                )
                .catch(err => console.warn('[RAG] Embedding failed (circuit may open):', err));
            }

            // ── LLM artifact quality evaluation ───────────────────────
            let artifactQuality: 'full' | 'partial' | 'minimal' = 'full';
            try {
              const qualityRaw = await routedText('reasoning', [
                {
                  role: 'system',
                  content: `You are evaluating the quality of a startup founder's ${artifactType.replace(/_/g, ' ')} document.
Score it on three dimensions (0–100 each):
- Completeness: Are all expected sections present and filled with real content?
- Specificity: Are there real names, numbers, dates, percentages — not generic placeholder text?
- Actionability: Could someone act on this tomorrow without needing more information?

Return ONLY valid JSON: { "score": <integer average 0-100>, "quality": "full" | "partial" | "minimal" }
Rules: score >= 70 → "full", score 40–69 → "partial", score < 40 → "minimal"`,
                },
                {
                  role: 'user',
                  content: `Evaluate this ${artifactType.replace(/_/g, ' ')}:\n${JSON.stringify(parsedContent).slice(0, 3000)}`,
                },
              ], { maxTokens: 80 });
              const qualityClean = qualityRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
              const qualityParsed = JSON.parse(qualityClean) as { score: number; quality: string };
              if (qualityParsed.quality === 'full' || qualityParsed.quality === 'partial' || qualityParsed.quality === 'minimal') {
                artifactQuality = qualityParsed.quality;
              }
            } catch {
              // LLM quality eval failed — default to 'full' (no penalty)
            }

            // ── Score signal ───────────────────────────────────────────
            scoreSignal = await applyAgentScoreSignal(supabaseAdmin, userId, artifactType, artifactQuality);

            // ── Cross-artifact consistency check (fire-and-forget) ─────
            void checkArtifactConsistency(supabaseAdmin, userId, artifactType, parsedContent);

            // ── Auto-create score evidence ─────────────────────────────
            const evidenceDim    = ARTIFACT_DIMENSION[artifactType as ArtifactType];
            const evidencePoints = ARTIFACT_EVIDENCE_POINTS[artifactType] ?? 4;
            const evidenceLabel  = ARTIFACT_LABEL[artifactType] ?? artifactType;
            if (evidenceDim) {
              const { count } = await supabaseAdmin
                .from('score_evidence')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('evidence_type', 'agent_artifact')
                .eq('data_value', artifactType);

              if ((count ?? 0) === 0) {
                await supabaseAdmin.from('score_evidence').insert({
                  user_id:        userId,
                  dimension:      evidenceDim,
                  evidence_type:  'agent_artifact',
                  title:          `${evidenceLabel} built with AI advisor`,
                  description:    `Auto-verified: you generated a ${evidenceLabel} using the Edge Alpha agent network.`,
                  data_value:     artifactType,
                  status:         'verified',
                  points_awarded: evidencePoints,
                  reviewed_at:    new Date().toISOString(),
                });
              }
            }
          }

          return { artifactId, artifactTitle, parsedContent, scoreSignal };
        },
        conversationId ?? undefined,
      );
      generationResult = result;
    } catch {
      // Mark job as failed
      if (jobId && userId) {
        await supabaseAdmin.from('artifact_jobs').update({
          status: 'failed',
          error: 'LLM returned malformed JSON',
          completed_at: new Date().toISOString(),
        }).eq('id', jobId)
      }
      return NextResponse.json(
        { error: 'LLM returned malformed JSON — please try again.' },
        { status: 500 },
      );
    }

    const { artifactId, artifactTitle, parsedContent, scoreSignal } = generationResult;

    const responsePayload = {
      artifact: {
        id: artifactId,
        type: artifactType,
        title: artifactTitle,
        content: parsedContent,
      },
      scoreSignal,
    }

    // Mark job as completed with result
    if (jobId && userId) {
      void supabaseAdmin.from('artifact_jobs').update({
        status: 'completed',
        result: responsePayload,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId)
    }

    return NextResponse.json({ ...responsePayload, jobId });

  } catch (error) {
    console.error('Agent generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate deliverable. Please try again.' },
      { status: 500 },
    );
  }
}
