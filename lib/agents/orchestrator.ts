/**
 * Cross-Agent Orchestration Layer
 *
 * Allows any primary agent to automatically pull context from other agents
 * without requiring the founder to visit each agent manually.
 *
 * Rules:
 *   - Sub-agent calls are capped at 300 tokens each (summaries, not full artifacts)
 *   - Maximum 2 sub-agent calls per primary request (prevents cascade latency)
 *   - Sub-calls only trigger when the artifact does NOT already exist for this user
 *   - Sub-call results are injected as context only — never saved as artifacts
 *
 * Dependency map: which agents provide high-value context for which primary agents.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { tieredText } from '@/lib/llm/router';

// ─── Agent dependency map ─────────────────────────────────────────────────────
// Each entry: primary agent → which agents' artifacts add the most value as context

const AGENT_DEPENDENCIES: Record<string, string[]> = {
  patel:  ['maya', 'atlas', 'felix'],   // GTM needs brand voice + competitive + CAC/LTV
  susi:   ['patel', 'atlas'],            // Sales needs ICP + competitive intel
  maya:   ['patel', 'atlas'],            // Brand needs ICP + market positioning
  felix:  ['sage', 'nova'],             // Finance needs strategic plan + PMF data
  leo:    ['felix', 'harper'],          // Legal needs financials + team structure
  harper: ['patel', 'felix'],           // Hiring needs GTM targets + comp budget
  nova:   ['patel', 'atlas'],           // Product needs ICP + competitive gaps
  atlas:  ['patel', 'nova'],            // Strategy needs ICP + product context
  sage:   ['felix', 'atlas', 'nova', 'patel', 'harper'],  // CEO advisor needs everything
};

// Artifact type to fetch for each agent (most representative deliverable)
const AGENT_PRIMARY_ARTIFACT: Record<string, string> = {
  patel:  'icp_document',
  susi:   'sales_script',
  maya:   'brand_messaging',
  felix:  'financial_summary',
  leo:    'legal_checklist',
  harper: 'hiring_plan',
  nova:   'pmf_survey',
  atlas:  'competitive_matrix',
  sage:   'strategic_plan',
};

// System prompts for sub-agent mini-briefs (when artifact doesn't exist)
const MINI_BRIEF_PROMPTS: Record<string, string> = {
  maya:   'You are a brand strategist. Given the founder context, write a 2-3 sentence brand voice summary including tone, key message, and target audience.',
  atlas:  'You are a competitive analyst. Given the founder context, write a 2-3 sentence competitive landscape summary including main competitors and key differentiators.',
  felix:  'You are a CFO. Given the founder context, write a 2-3 sentence financial context summary including stage, key metrics if known, and funding status.',
  patel:  'You are a GTM strategist. Given the founder context, write a 2-3 sentence ICP summary including buyer persona and primary channel.',
  nova:   'You are a CPO. Given the founder context, write a 2-3 sentence product status summary including PMF signal and key user feedback themes.',
  sage:   'You are a CEO advisor. Given the founder context, write a 2-3 sentence strategic position summary including key bets and immediate priorities.',
  harper: 'You are a CPO. Given the founder context, write a 2-3 sentence team summary including key roles and hiring gaps.',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubAgentResult {
  agentId: string;
  source: 'existing_artifact' | 'mini_brief';
  content: string;
}

export interface OrchestrationResult {
  subAgentResults: SubAgentResult[];
  contextInjection: string;
  subCallsUsed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function artifactToSummary(artifact: Record<string, unknown>, agentId: string): string {
  // Extract the most useful 2-3 fields from the artifact for injection
  const lines: string[] = [];

  if (agentId === 'patel' || artifact.buyerPersona || artifact.firmographics) {
    if (artifact.buyerPersona && typeof artifact.buyerPersona === 'object') {
      const bp = artifact.buyerPersona as Record<string, unknown>;
      if (bp.title) lines.push(`Buyer: ${bp.title}`);
      if (bp.frustrations && Array.isArray(bp.frustrations)) lines.push(`Pain: ${bp.frustrations.slice(0, 1).join('')}`);
    }
    if (artifact.recommendedChannels && Array.isArray(artifact.recommendedChannels)) {
      lines.push(`Channels: ${artifact.recommendedChannels.slice(0, 2).join(', ')}`);
    }
  }

  if (agentId === 'maya' || artifact.positioningStatement) {
    if (artifact.positioningStatement) lines.push(`Positioning: ${String(artifact.positioningStatement).slice(0, 100)}`);
    if (artifact.voiceGuide && typeof artifact.voiceGuide === 'object') {
      const vg = artifact.voiceGuide as Record<string, unknown>;
      if (vg.personality) lines.push(`Voice: ${vg.personality}`);
    }
  }

  if (agentId === 'atlas' || artifact.competitors) {
    if (Array.isArray(artifact.competitors)) {
      lines.push(`Competitors: ${artifact.competitors.slice(0, 3).map((c: unknown) => typeof c === 'object' && c !== null ? ((c as Record<string, unknown>).name ?? '') : c).join(', ')}`);
    }
    if (artifact.positioningStatement) lines.push(`Market position: ${String(artifact.positioningStatement).slice(0, 80)}`);
  }

  if (agentId === 'felix' || artifact.metrics) {
    const m = artifact.metrics as Record<string, unknown> | undefined;
    if (m?.mrr) lines.push(`MRR: $${m.mrr}`);
    if (m?.runway) lines.push(`Runway: ${m.runway} months`);
  }

  if (lines.length === 0) {
    // Generic fallback: first string value found
    const firstVal = Object.values(artifact).find(v => typeof v === 'string' && v.length > 10);
    if (firstVal) lines.push(String(firstVal).slice(0, 150));
  }

  return lines.join('\n');
}

// ─── Main orchestration function ──────────────────────────────────────────────

export async function orchestrate(
  primaryAgentId: string,
  userId: string,
  userMessage: string,
  supabase: SupabaseClient,
  maxSubCalls = 2,
): Promise<OrchestrationResult> {
  const deps = AGENT_DEPENDENCIES[primaryAgentId] ?? [];
  if (deps.length === 0) {
    return { subAgentResults: [], contextInjection: '', subCallsUsed: 0 };
  }

  // Check which dependencies already have artifacts
  const artifactTypesToCheck = deps
    .map(id => AGENT_PRIMARY_ARTIFACT[id])
    .filter(Boolean);

  const { data: existingArtifacts } = await supabase
    .from('agent_artifacts')
    .select('agent_id, artifact_type, content')
    .eq('user_id', userId)
    .in('agent_id', deps)
    .order('created_at', { ascending: false });

  const existingMap = new Map<string, Record<string, unknown>>();
  for (const row of existingArtifacts ?? []) {
    if (!existingMap.has(row.agent_id)) {
      existingMap.set(row.agent_id, row.content as Record<string, unknown>);
    }
  }
  void artifactTypesToCheck;

  const results: SubAgentResult[] = [];
  let subCallsUsed = 0;

  for (const depAgentId of deps.slice(0, 4)) {  // check up to 4 deps, fire up to 2 sub-calls
    if (existingMap.has(depAgentId)) {
      // Artifact exists — extract summary (no sub-call needed)
      const summary = artifactToSummary(existingMap.get(depAgentId)!, depAgentId);
      if (summary) {
        results.push({ agentId: depAgentId, source: 'existing_artifact', content: summary });
      }
    } else if (subCallsUsed < maxSubCalls && MINI_BRIEF_PROMPTS[depAgentId]) {
      // No artifact — run a mini-brief sub-call (max 2 total)
      subCallsUsed++;
      try {
        const miniPrompt = MINI_BRIEF_PROMPTS[depAgentId];
        const brief = await tieredText('economy', [
          { role: 'system', content: miniPrompt },
          { role: 'user', content: `Founder context: ${userMessage.slice(0, 400)}. Write the summary now.` },
        ], { maxTokens: 300 });
        if (brief.trim().length > 20) {
          results.push({ agentId: depAgentId, source: 'mini_brief', content: brief.trim() });
        }
      } catch {
        // Sub-call failed — skip this dependency (non-blocking)
      }
    }

    if (results.length >= 3) break;  // cap total injected context blocks
  }

  if (results.length === 0) {
    return { subAgentResults: [], contextInjection: '', subCallsUsed };
  }

  const contextInjection = results
    .map(r => `[${r.agentId.toUpperCase()} CONTEXT${r.source === 'mini_brief' ? ' — synthesised' : ''}]\n${r.content}`)
    .join('\n\n');

  return { subAgentResults: results, contextInjection, subCallsUsed };
}
