/**
 * Agent Context Compressor
 *
 * Enforces a token budget on context injection so agents never receive
 * more than ~4,000 tokens of historical context, regardless of how many
 * artifacts the founder has accumulated.
 *
 * Strategy (applied in order):
 *   1. Recency window — keep only the N most recent own artifacts (default 3)
 *   2. Semantic selection — prefer artifacts whose title/type matches the current topic
 *   3. Summarise overflow — when > TOKEN_BUDGET chars remain, truncate + add "... (older entries omitted)"
 *
 * Special handling for accumulative agents (Susi/Atlas):
 *   These agents produce many small artifacts. They get a tighter recency window
 *   and their cross-agent quota is proportionally smaller.
 */

import type { Artifact, ActivityEvent } from './context';

// ── Key field extraction (for relevance scoring without full content fetch) ──

/**
 * Extracts a flat list of salient strings from an artifact's content.
 * Called at artifact-save time; stored as `key_fields` JSONB.
 * Used by scoreArtifactRelevance for richer topic matching.
 */
export function extractKeyFields(
  artifactType: string,
  content: Record<string, unknown>
): Record<string, string> {
  function str(v: unknown): string | undefined {
    return typeof v === 'string' && v.trim().length > 2 ? v.trim().slice(0, 120) : undefined
  }
  function arr(v: unknown): string | undefined {
    if (Array.isArray(v)) return v.slice(0, 5).join(', ').slice(0, 120)
    return str(v)
  }

  const fields: Record<string, string> = {}
  const put = (k: string, v: unknown) => { const s = str(v); if (s) fields[k] = s }
  const putArr = (k: string, v: unknown) => { const s = arr(v); if (s) fields[k] = s }

  switch (artifactType) {
    case 'icp_document': {
      const bp = content.buyerPersona as Record<string, unknown> | undefined
      const fm = content.firmographics as Record<string, unknown> | undefined
      put('segment', bp?.title ?? bp?.jobTitle ?? fm?.companyType ?? content.customerSegment)
      put('pain', bp?.mainPain ?? bp?.frustrations)
      put('channels', arr(content.channels))
      break
    }
    case 'gtm_playbook': {
      putArr('channels', content.channels)
      put('market', (content.targetMarket as Record<string,unknown>)?.description ?? content.targetMarket)
      put('summary', content.executiveSummary)
      break
    }
    case 'financial_summary': {
      const km = content.keyMetrics as Record<string, unknown> | undefined
      put('mrr',  km?.mrr)
      put('arr',  km?.arr)
      put('burn', (content.burnAndRunway as Record<string,unknown>)?.monthlyBurn)
      put('model', content.revenueModel)
      break
    }
    case 'competitive_matrix': {
      const comps = content.competitors
      if (Array.isArray(comps)) fields['competitors'] = comps.slice(0, 4).join(', ').slice(0, 120)
      put('position', content.ourPosition)
      break
    }
    case 'battle_card': {
      put('competitor', content.competitor)
      putArr('advantages', content.ourAdvantages)
      break
    }
    case 'strategic_plan': {
      put('vision', content.vision)
      putArr('milestones', content.milestones)
      break
    }
    case 'hiring_plan': {
      putArr('roles', content.roles)
      break
    }
    case 'pmf_survey': {
      put('hypothesis', content.hypothesis)
      break
    }
    default:
      put('summary', content.summary ?? content.executiveSummary)
  }

  return fields
}

// ~4 chars per token — conservative estimate for mixed content
const TOKEN_BUDGET_CHARS = 16_000;

// Agents that accumulate many artifacts and need tighter windows
const ACCUMULATIVE_AGENTS = new Set(['susi', 'atlas']);

interface CompressedContext {
  ownArtifacts: Artifact[];
  crossAgentArtifacts: Artifact[];
  activity: ActivityEvent[];
  compressionApplied: boolean;
}

function estimateChars(artifacts: Artifact[]): number {
  return artifacts.reduce((sum, a) => sum + a.artifact_type.length + a.title.length + 60, 0);
}

function scoreArtifactRelevance(artifact: Artifact, topic: string): number {
  if (!topic) return 0;
  const lower = topic.toLowerCase();
  const typeWords = artifact.artifact_type.replace(/_/g, ' ');
  const titleWords = artifact.title.toLowerCase();
  let score = 0;
  if (lower.includes(typeWords)) score += 3;
  if (titleWords.split(' ').some(w => w.length > 3 && lower.includes(w))) score += 2;

  // Richer scoring from key_fields stored at artifact-save time
  if (artifact.key_fields) {
    for (const v of Object.values(artifact.key_fields)) {
      const words = (v as string).toLowerCase().split(/\W+/).filter((w: string) => w.length > 3);
      if (words.some((w: string) => lower.includes(w))) score += 1;
    }
  }

  return score;
}

export function compressContext(
  ownArtifacts: Artifact[],
  crossAgentArtifacts: Artifact[],
  activity: ActivityEvent[],
  agentId: string,
  topic?: string,
): CompressedContext {
  const isAccumulative = ACCUMULATIVE_AGENTS.has(agentId);

  // Own artifacts: keep 3 most recent (2 for accumulative agents)
  const ownLimit = isAccumulative ? 2 : 3;
  let compressedOwn = ownArtifacts.slice(0, ownLimit);

  // Cross-agent: prefer topic-relevant, then most recent; cap at 4 (2 for accumulative)
  const crossLimit = isAccumulative ? 2 : 4;
  let compressedCross = topic
    ? [...crossAgentArtifacts]
        .sort((a, b) => scoreArtifactRelevance(b, topic) - scoreArtifactRelevance(a, topic))
        .slice(0, crossLimit)
    : crossAgentArtifacts.slice(0, crossLimit);

  // Activity: always cap at 5 events
  const compressedActivity = activity.slice(0, 5);

  // Budget check: if still over limit, drop least-relevant cross-agent artifacts
  const totalChars = estimateChars(compressedOwn) + estimateChars(compressedCross);
  let compressionApplied = (
    ownArtifacts.length > ownLimit ||
    crossAgentArtifacts.length > crossLimit ||
    activity.length > 5
  );

  if (totalChars > TOKEN_BUDGET_CHARS) {
    // Drop cross-agent artifacts from the end until under budget
    while (compressedCross.length > 1 && estimateChars(compressedOwn) + estimateChars(compressedCross) > TOKEN_BUDGET_CHARS) {
      compressedCross = compressedCross.slice(0, -1);
    }
    // If still over, drop own artifacts beyond the most recent 1
    if (estimateChars(compressedOwn) + estimateChars(compressedCross) > TOKEN_BUDGET_CHARS) {
      compressedOwn = compressedOwn.slice(0, 1);
    }
    compressionApplied = true;
  }

  return {
    ownArtifacts: compressedOwn,
    crossAgentArtifacts: compressedCross,
    activity: compressedActivity,
    compressionApplied,
  };
}
