/**
 * Smart Cross-Agent Context Loader
 *
 * Replaces the raw Supabase queries in app/api/agents/chat/route.ts with a
 * registry-driven loader that:
 *   1. Fetches the agent's own recent artifacts (memory window)
 *   2. Fetches high-relevance agents' artifacts unconditionally
 *   3. Fetches medium-relevance agents' artifacts only when topic matches
 *   4. Fetches recent cross-agent activity events
 *   5. Skips low-relevance (unregistered) agents entirely
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAgent } from '@/lib/edgealpha.config';
import { compressContext } from './context-compressor';
import { FF_AGENT_CONTEXT_COMPRESSION } from '@/lib/feature-flags';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Artifact {
  id: string;
  agent_id: string;
  artifact_type: string;
  title: string;
  created_at: string;
  content?: Record<string, unknown>;
  key_fields?: Record<string, string>;
}

export interface ActivityEvent {
  agent_id: string;
  action_type: string;
  description: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface AgentContext {
  ownArtifacts: Artifact[];
  crossAgentArtifacts: Artifact[];
  activity: ActivityEvent[];
}

// ─── Domain keyword map ───────────────────────────────────────────────────────
// Used for medium-relevance topic matching: include the cross-agent artifact
// only when the current conversation topic overlaps with the agent's domain.

const AGENT_DOMAIN_KEYWORDS: Record<string, string[]> = {
  patel:  ['icp', 'customer', 'gtm', 'go-to-market', 'segment', 'acquisition', 'channel'],
  susi:   ['sales', 'deal', 'pipeline', 'close', 'outreach', 'crm', 'prospect'],
  maya:   ['brand', 'content', 'marketing', 'messaging', 'social', 'copy'],
  felix:  ['financial', 'mrr', 'arr', 'burn', 'runway', 'unit economics', 'fundrais'],
  leo:    ['legal', 'contract', 'ip', 'compliance', 'equity', 'incorporation'],
  harper: ['hire', 'team', 'recruit', 'compensation', 'culture', 'headcount'],
  nova:   ['product', 'pmf', 'feedback', 'survey', 'retention', 'nps', 'roadmap'],
  atlas:  ['competitor', 'market', 'competitive', 'positioning', 'differentiat'],
  sage:   ['strategy', 'okr', 'roadmap', 'vision', 'fundrais', 'milestone'],
};

function topicMatchesDomain(topic: string | undefined, agentId: string): boolean {
  if (!topic) return false;
  const keywords = AGENT_DOMAIN_KEYWORDS[agentId] ?? [];
  const lower = topic.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

// ─── Main loader ──────────────────────────────────────────────────────────────

export async function getAgentContext(
  agentId: string,
  userId: string,
  supabase: SupabaseClient,
  topic?: string,
): Promise<AgentContext> {
  let agentConfig;
  try {
    agentConfig = getAgent(agentId);
  } catch {
    // Unknown agent — return empty context
    return { ownArtifacts: [], crossAgentArtifacts: [], activity: [] };
  }

  const { memory, highRelevanceAgents, mediumRelevanceAgents } = agentConfig;

  // Determine which cross-agent IDs to fetch
  const crossAgentIds: string[] = [
    ...highRelevanceAgents,
    ...mediumRelevanceAgents.filter(id => topicMatchesDomain(topic, id)),
  ];

  // Build queries in parallel
  const [ownResult, crossResult, activityResult] = await Promise.all([
    // 1. Own artifacts
    supabase
      .from('agent_artifacts')
      .select('id, agent_id, artifact_type, title, created_at, key_fields')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(memory.ownArtifacts),

    // 2. Cross-agent artifacts (high + matched medium)
    crossAgentIds.length > 0
      ? supabase
          .from('agent_artifacts')
          .select('id, agent_id, artifact_type, title, created_at, key_fields')
          .eq('user_id', userId)
          .in('agent_id', crossAgentIds)
          .order('created_at', { ascending: false })
          .limit(memory.otherArtifacts)
      : Promise.resolve({ data: [] as Artifact[] }),

    // 3. Activity events (exclude own agent to avoid repetition)
    supabase
      .from('agent_activity')
      .select('agent_id, action_type, description, created_at, metadata')
      .eq('user_id', userId)
      .neq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(memory.activityEvents),
  ]);

  const raw = {
    ownArtifacts:        (ownResult.data      as Artifact[]      ?? []),
    crossAgentArtifacts: (crossResult.data    as Artifact[]      ?? []),
    activity:            (activityResult.data as ActivityEvent[] ?? []),
  };

  // Compress context to stay within token budget (gated by feature flag)
  if (FF_AGENT_CONTEXT_COMPRESSION) {
    const compressed = compressContext(
      raw.ownArtifacts,
      raw.crossAgentArtifacts,
      raw.activity,
      agentId,
      topic,
    );
    return {
      ownArtifacts:        compressed.ownArtifacts,
      crossAgentArtifacts: compressed.crossAgentArtifacts,
      activity:            compressed.activity,
    };
  }

  return raw;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function dayAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`;
}

/**
 * Formats an AgentContext into the MEMORY and FOUNDER CONTEXT prompt sections
 * used by the chat route.
 */
export function formatContextForPrompt(ctx: AgentContext): string {
  let addition = '';

  if (ctx.ownArtifacts.length > 0) {
    const lines = ctx.ownArtifacts
      .map(a => `- ${a.artifact_type.replace(/_/g, ' ')} (${dayAgo(a.created_at)}): "${a.title}"`)
      .join('\n');
    addition += `\n\nMEMORY — What you have previously built together with this founder:\n${lines}\nReference these when relevant. Build on them, don't restart from scratch.`;
  }

  if (ctx.crossAgentArtifacts.length > 0) {
    const lines = ctx.crossAgentArtifacts
      .map(a => `- ${a.artifact_type.replace(/_/g, ' ')} by ${a.agent_id} (${dayAgo(a.created_at)}): "${a.title}"`)
      .join('\n');
    addition += `\n\nFOUNDER CONTEXT — Other advisers have already built these for this founder:\n${lines}\nUse this context to avoid re-asking what's already known. Reference these outputs to give more tailored advice.`;
  }

  if (ctx.activity.length > 0) {
    const lines = ctx.activity
      .map(a => `- [${a.agent_id}] ${a.description} (${dayAgo(a.created_at)})`)
      .join('\n');
    addition += `\n\nCROSS-AGENT ACTIVITY — What your fellow advisers did recently:\n${lines}\nUse this to give contextually-aware advice.`;
  }

  return addition;
}
