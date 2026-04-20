/**
 * Behavioural Scoring
 *
 * Scores founder behaviours that cannot be gamed — derived from activity logs,
 * not form answers.
 *
 * Three signals:
 * 1. Iteration Speed       — median days between agent sessions / assessment retakes
 *                            Fast founders score higher (< 7 days = excellent)
 * 2. ICP Refinement        — how many ICP artifact versions exist + specificity improvement
 *                            "B2B SaaS" → "VP Sales at 50-200 employee SaaS" scores higher
 * 3. Contradiction Engagement — did the founder respond to Atlas finding an unknown competitor?
 *                            Measured by: Atlas session → founder sent follow-up message within same session
 *
 * Combined into a single 0-100 behavioural_score, persisted on founder_profiles.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ARTIFACT_TYPES } from '@/lib/constants/artifact-types';
import { AGENT_IDS } from '@/lib/constants/agent-ids';
import { log } from '@/lib/logger'

// ── Iteration speed ───────────────────────────────────────────────────────────

function scoreIterationSpeed(medianDays: number | null): number {
  if (medianDays === null) return 40; // unknown
  if (medianDays <= 3)  return 100;
  if (medianDays <= 7)  return 85;
  if (medianDays <= 14) return 65;
  if (medianDays <= 30) return 45;
  return 20;
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ── ICP specificity heuristic ─────────────────────────────────────────────────

function measureICPSpecificity(content: unknown): number {
  if (!content) return 0;
  const text = JSON.stringify(content).toLowerCase();
  let score = 0;
  // Persona specificity: named job title
  if (/\b(vp|director|head of|manager|cto|cfo|ceo|founder|analyst|engineer|developer|designer)\b/.test(text)) score += 20;
  // Company size: specific range
  if (/\b(\d+[-–]\d+\s*(employees?|people|headcount)|<\s*\d+\s*employees?|smb|mid.?market|enterprise|series [a-d])\b/.test(text)) score += 20;
  // Trigger: buying event
  if (/\b(trigger|when they|after|following|caused by|prompted by|pain point|urgency|budget|renewal)\b/.test(text)) score += 20;
  // Exclusion: who is NOT the ICP
  if (/\b(not|exclude|avoid|wrong fit|bad fit|don't serve|too small|too large|out of scope)\b/.test(text)) score += 20;
  // Example: named company or person
  if (/\b(example|such as|e\.g\.|for instance|[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd))\b/.test(JSON.stringify(content))) score += 20;
  return score; // 0-100
}

// ── Main scoring function ─────────────────────────────────────────────────────

export async function computeBehaviouralScore(
  supabase: SupabaseClient,
  userId: string
): Promise<{ behaviouralScore: number; signals: Record<string, number> }> {
  try {
    // ── Signal 1: Iteration speed ────────────────────────────────────────────
    const [{ data: conversations }, { data: assessments }] = await Promise.all([
      supabase
        .from('agent_conversations')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('qscore_history')
        .select('calculated_at')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: true }),
    ]);

    const allEvents = [
      ...(conversations ?? []).map((r: { created_at: string }) => new Date(r.created_at).getTime()),
      ...(assessments ?? []).map((r: { calculated_at: string }) => new Date(r.calculated_at).getTime()),
    ].sort((a, b) => a - b);

    const gaps: number[] = [];
    for (let i = 1; i < allEvents.length; i++) {
      const dayGap = (allEvents[i] - allEvents[i - 1]) / (1000 * 60 * 60 * 24);
      if (dayGap <= 90) gaps.push(dayGap); // ignore gaps > 90 days (dormant periods)
    }

    const medianGap = median(gaps);
    const iterationScore = scoreIterationSpeed(medianGap);

    // ── Signal 2: ICP refinement trajectory ─────────────────────────────────
    const { data: icpArtifacts } = await supabase
      .from('agent_artifacts')
      .select('content, created_at')
      .eq('user_id', userId)
      .eq('artifact_type', ARTIFACT_TYPES.ICP_DOCUMENT)
      .order('created_at', { ascending: true });

    let icpRefinementScore = 40; // neutral default
    if (icpArtifacts && icpArtifacts.length >= 2) {
      const scores = (icpArtifacts as Array<{ content: unknown }>)
        .map(a => measureICPSpecificity(a.content));
      const first = scores[0];
      const last = scores[scores.length - 1];
      const delta = last - first;
      const versions = icpArtifacts.length;
      // More versions + higher specificity improvement = better score
      if (delta >= 40 && versions >= 3) icpRefinementScore = 100;
      else if (delta >= 20 && versions >= 2) icpRefinementScore = 80;
      else if (delta >= 10) icpRefinementScore = 65;
      else if (last >= 60) icpRefinementScore = 55; // already specific, no room to improve
      else icpRefinementScore = 35;
    } else if (icpArtifacts && icpArtifacts.length === 1) {
      icpRefinementScore = measureICPSpecificity((icpArtifacts[0] as { content: unknown }).content) * 0.6;
    }

    // ── Signal 3: Contradiction engagement ───────────────────────────────────
    // Did the founder ask a follow-up in an Atlas session after a "competitor" message?
    const { data: atlasConvs } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('agent_id', AGENT_IDS.ATLAS);

    let contradictionScore = 50; // neutral default (unknown)
    if (atlasConvs && atlasConvs.length > 0) {
      const atlasIds = (atlasConvs as Array<{ id: string }>).map(c => c.id);
      const { data: atlasMessages } = await supabase
        .from('agent_messages')
        .select('conversation_id, role, content')
        .in('conversation_id', atlasIds)
        .order('created_at', { ascending: true });

      if (atlasMessages && atlasMessages.length > 0) {
        type Msg = { conversation_id: string; role: string; content: string };
        const msgs = atlasMessages as Msg[];
        let contradictionsFound = 0;
        let contradictionsEngaged = 0;

        // Group by conversation
        const byConv = new Map<string, Msg[]>();
        for (const m of msgs) {
          if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, []);
          byConv.get(m.conversation_id)?.push(m);
        }

        for (const [, convMsgs] of byConv) {
          for (let i = 0; i < convMsgs.length - 1; i++) {
            const msg = convMsgs[i];
            if (msg.role !== 'assistant') continue;
            // Look for Atlas discovering a competitor the founder hadn't mentioned
            const isContradiction = /found\s+\d+|discovered|unaware|you\s+didn't\s+mention|competitor\s+you\s+may\s+not|actually\s+compete/i.test(msg.content);
            if (!isContradiction) continue;

            contradictionsFound++;
            // Check if founder sent a follow-up (next user message in same conv)
            const nextUserMsg = convMsgs.slice(i + 1).find(m => m.role === 'user');
            if (nextUserMsg && nextUserMsg.content.length >= 20) {
              contradictionsEngaged++;
            }
          }
        }

        if (contradictionsFound > 0) {
          const engagementRate = contradictionsEngaged / contradictionsFound;
          contradictionScore = Math.round(engagementRate * 100);
        }
      }
    }

    // ── Composite score (weighted average) ─────────────────────────────────
    const behaviouralScore = Math.round(
      iterationScore * 0.40 +
      icpRefinementScore * 0.35 +
      contradictionScore * 0.25
    );

    const signals = {
      iterationSpeed:          Math.round(iterationScore),
      icpRefinement:           Math.round(icpRefinementScore),
      contradictionEngagement: Math.round(contradictionScore),
    };

    // Persist composite score
    await supabase
      .from('founder_profiles')
      .update({ behavioural_score: Math.max(0, Math.min(100, behaviouralScore)) })
      .eq('user_id', userId);

    return { behaviouralScore: Math.max(0, Math.min(100, behaviouralScore)), signals };
  } catch (err) {
    log.warn('[Behavioural] Scoring failed:', err);
    return { behaviouralScore: 50, signals: {} };
  }
}
