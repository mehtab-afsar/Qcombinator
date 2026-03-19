/**
 * Knowledge Library
 *
 * Queries curated resources from the knowledge_library table.
 * Used in two places:
 * 1. Agent RAG injection — top 2 resources per conversation injected into system prompt
 * 2. Public /library page — browsable by function / topic / stage
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface KnowledgeResource {
  id: string;
  title: string;
  type: string;
  source: string;
  author: string | null;
  function_owner: string;
  topic_cluster: string;
  stage_relevance: string[];
  format: string;
  access_level: string;
  url: string | null;
  summary: string;
  tags: string[];
}

/**
 * Fetch top N resources for an agent based on relevance to the current conversation.
 *
 * Strategy:
 * 1. Try full-text search on the user's message against title + summary
 * 2. Fall back to top resources for the agent's function_owner when no FTS matches
 *
 * Returns at most `limit` resources — typically 2-3 to stay within system prompt token budget.
 */
export async function getRelevantResources(
  supabase: SupabaseClient,
  agentId: string,
  userMessage: string,
  limit = 2
): Promise<KnowledgeResource[]> {
  try {
    // Clean message to a safe tsquery — take first 5 meaningful words
    const tsQuery = userMessage
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5)
      .join(' & ');

    if (tsQuery) {
      const { data: ftsResults } = await supabase
        .from('knowledge_library')
        .select('id, title, type, source, author, function_owner, topic_cluster, stage_relevance, format, access_level, url, summary, tags')
        .eq('function_owner', agentId)
        .textSearch('title', tsQuery, { type: 'websearch', config: 'english' })
        .limit(limit);

      if (ftsResults && ftsResults.length > 0) {
        return ftsResults as KnowledgeResource[];
      }
    }

    // Fallback: return top resources for this agent (ordered by created_at = curation order)
    const { data: fallback } = await supabase
      .from('knowledge_library')
      .select('id, title, type, source, author, function_owner, topic_cluster, stage_relevance, format, access_level, url, summary, tags')
      .eq('function_owner', agentId)
      .limit(limit);

    return (fallback ?? []) as KnowledgeResource[];
  } catch {
    // Library lookup is non-critical — never block agent response
    return [];
  }
}

/**
 * Format resources for system prompt injection.
 * Kept very compact to minimise token usage.
 */
export function formatResourcesForPrompt(resources: KnowledgeResource[]): string {
  if (resources.length === 0) return '';

  const lines = resources.map(r => {
    const link = r.url ? ` (${r.url})` : '';
    return `- **${r.title}** — ${r.source}${r.author ? ` by ${r.author}` : ''}${link}\n  ${r.summary}`;
  });

  return `\n\nRELEVANT FRAMEWORKS & RESOURCES:\n${lines.join('\n\n')}\n(Reference these when relevant — cite the source and key principle, don't just summarise.)`;
}

/**
 * Fetch all resources for the public library page.
 * Supports optional filters: functionOwner, topicCluster, stage.
 */
export async function getAllResources(
  supabase: SupabaseClient,
  opts: {
    functionOwner?: string;
    topicCluster?: string;
    stage?: string;
    search?: string;
    limit?: number;
  } = {}
): Promise<KnowledgeResource[]> {
  try {
    let query = supabase
      .from('knowledge_library')
      .select('id, title, type, source, author, function_owner, topic_cluster, stage_relevance, format, access_level, url, summary, tags')
      .eq('access_level', 'public')
      .order('function_owner')
      .order('topic_cluster');

    if (opts.functionOwner) query = query.eq('function_owner', opts.functionOwner);
    if (opts.topicCluster) query = query.eq('topic_cluster', opts.topicCluster);
    if (opts.stage) query = query.contains('stage_relevance', [opts.stage]);
    if (opts.search) {
      query = query.textSearch('title', opts.search.replace(/[^a-z0-9\s]/gi, ' '), {
        type: 'websearch',
        config: 'english',
      });
    }
    if (opts.limit) query = query.limit(opts.limit);

    const { data } = await query;
    return (data ?? []) as KnowledgeResource[];
  } catch {
    return [];
  }
}
