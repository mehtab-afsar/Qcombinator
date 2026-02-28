import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getArtifactPrompt } from '@/features/agents/patel/prompts/artifact-prompts';
import { applyAgentScoreSignal } from '@/features/qscore/services/agent-signal';
import { callOpenRouter } from '@/lib/openrouter';

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

const VALID_ARTIFACT_TYPES = [
  'icp_document', 'outreach_sequence', 'battle_card', 'gtm_playbook',
  'sales_script', 'brand_messaging', 'financial_summary', 'legal_checklist',
  'hiring_plan', 'pmf_survey', 'competitive_matrix', 'strategic_plan',
];

// Which Q-Score dimension each artifact type improves
const ARTIFACT_DIMENSION: Record<string, string> = {
  icp_document:       'goToMarket',
  outreach_sequence:  'traction',
  battle_card:        'market',
  gtm_playbook:       'goToMarket',
  sales_script:       'traction',
  brand_messaging:    'goToMarket',
  financial_summary:  'financial',
  legal_checklist:    'financial',
  hiring_plan:        'team',
  pmf_survey:         'product',
  competitive_matrix: 'market',
  strategic_plan:     'product',
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

  const raw = await callOpenRouter(
    [
      { role: 'system', content: extractionPrompt },
      { role: 'user', content: 'Extract all relevant facts from the conversation above.' },
    ],
    { maxTokens: 800, temperature: 0.2 },
  );

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
    const { agentId, conversationHistory, artifactType, userId, conversationId } = await request.json();

    if (!agentId || !artifactType) {
      return NextResponse.json({ error: 'agentId and artifactType are required' }, { status: 400 });
    }

    if (!VALID_ARTIFACT_TYPES.includes(artifactType)) {
      return NextResponse.json({ error: `Invalid artifactType: ${artifactType}` }, { status: 400 });
    }

    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return NextResponse.json({ error: 'conversationHistory is required' }, { status: 400 });
    }

    // ── Pass 1: Extract context from conversation ──────────────────────────
    const context = await extractContext(conversationHistory, artifactType);

    // ── Pass 2: Generate artifact ──────────────────────────────────────────
    const artifactPrompt = getArtifactPrompt(artifactType, context, null);
    const artifactRaw = await callOpenRouter(
      [
        { role: 'system', content: artifactPrompt },
        { role: 'user', content: 'Generate the deliverable now. Return ONLY valid JSON, no markdown fences, no explanation text.' },
      ],
      { maxTokens: 3000, temperature: 0.4 },
    );

    const cleanJson = artifactRaw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(cleanJson);
    } catch {
      // Attempt regex extraction before giving up
      const match = cleanJson.match(/\{[\s\S]*\}/);
      try {
        parsedContent = match ? JSON.parse(match[0]) : (() => { throw new Error(); })();
      } catch {
        return NextResponse.json(
          { error: 'LLM returned malformed JSON — please try again.' },
          { status: 500 },
        );
      }
    }
    const artifactTitle = (parsedContent.title as string | undefined) || artifactType.replace(/_/g, ' ');

    // ── Persist to DB ──────────────────────────────────────────────────────
    let artifactId: string | null = null;
    let scoreSignal: { boosted: boolean; pointsAdded?: number; dimensionLabel?: string } = { boosted: false };

    if (userId) {
      const { data: saved } = await supabaseAdmin
        .from('agent_artifacts')
        .insert({
          conversation_id: conversationId ?? null,
          user_id: userId,
          agent_id: agentId,
          artifact_type: artifactType,
          title: artifactTitle,
          content: parsedContent,
        })
        .select('id')
        .single();
      artifactId = saved?.id ?? null;

      // ── Score signal: nudge the relevant dimension for this artifact type ──
      scoreSignal = await applyAgentScoreSignal(supabaseAdmin, userId, artifactType);

      // ── Auto-create score evidence: agent-generated artifacts count as verified proof ──
      const evidenceDim    = ARTIFACT_DIMENSION[artifactType];
      const evidencePoints = ARTIFACT_EVIDENCE_POINTS[artifactType] ?? 4;
      const evidenceLabel  = ARTIFACT_LABEL[artifactType] ?? artifactType;
      if (evidenceDim) {
        // Only insert if evidence doesn't already exist for this artifact type + user
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

    return NextResponse.json({
      artifact: {
        id: artifactId,
        type: artifactType,
        title: artifactTitle,
        content: parsedContent,
      },
      scoreSignal,
    });

  } catch (error) {
    console.error('Agent generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate deliverable. Please try again.' },
      { status: 500 },
    );
  }
}
