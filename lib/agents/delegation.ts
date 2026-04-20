/**
 * Agent Delegation — real async task delegation between agents.
 *
 * When one agent needs another to do real work (not just provide a summary),
 * it creates a delegation task. The task is picked up on the target agent's
 * next turn (or immediately by the proactive engine).
 *
 * This replaces the current text-injection orchestration (300-token snippets)
 * with actual typed task handoffs that carry structured payloads.
 *
 * Schema: delegation_tasks table (see migrations/20260417000002_delegation_tasks.sql)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DelegationStatus   = 'pending' | 'running' | 'complete' | 'failed' | 'expired';
export type DelegationPriority = 'immediate' | 'background';

export interface DelegationTask {
  id: string;
  fromAgent: string;
  toAgent: string;
  userId: string;
  instruction: string;
  payloadType: string;
  payloadData: Record<string, unknown>;
  priority: DelegationPriority;
  status: DelegationStatus;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
}

// ── Write operations ──────────────────────────────────────────────────────────

export async function delegateTo(
  fromAgent: string,
  toAgent: string,
  payloadType: string,
  payloadData: Record<string, unknown>,
  instruction: string,
  userId: string,
  supabase: SupabaseClient,
  priority: DelegationPriority = 'background',
): Promise<string | null> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from('delegation_tasks')
      .insert({
        from_agent:   fromAgent,
        to_agent:     toAgent,
        user_id:      userId,
        instruction,
        payload_type: payloadType,
        payload_data: payloadData,
        priority,
        status:       'pending',
        expires_at:   expiresAt,
      })
      .select('id')
      .single();

    if (error) { console.warn('[delegation] create error:', error.message); return null; }
    return data?.id ?? null;
  } catch (e) {
    console.warn('[delegation] unexpected error:', e);
    return null;
  }
}

export async function markDelegationRunning(taskId: string, supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.from('delegation_tasks').update({ status: 'running' }).eq('id', taskId);
  } catch { /* non-critical */ }
}

export async function completeDelegation(
  taskId: string,
  result: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<void> {
  try {
    await supabase
      .from('delegation_tasks')
      .update({ status: 'complete', result, completed_at: new Date().toISOString() })
      .eq('id', taskId);
  } catch { /* non-critical */ }
}

export async function failDelegation(taskId: string, error: string, supabase: SupabaseClient): Promise<void> {
  try {
    await supabase
      .from('delegation_tasks')
      .update({ status: 'failed', error, completed_at: new Date().toISOString() })
      .eq('id', taskId);
  } catch { /* non-critical */ }
}

// ── Read operations ───────────────────────────────────────────────────────────

export async function getPendingDelegations(
  agentId: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<DelegationTask[]> {
  try {
    const { data } = await supabase
      .from('delegation_tasks')
      .select('*')
      .eq('to_agent', agentId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('priority', { ascending: true })   // immediate first
      .order('created_at', { ascending: true })
      .limit(5);

    return (data ?? []).map(dbRowToTask);
  } catch {
    return [];
  }
}

// ── Prompt injection ──────────────────────────────────────────────────────────

export function formatDelegationsForPrompt(delegations: DelegationTask[]): string {
  if (delegations.length === 0) return '';

  const items = delegations.map((d, i) => {
    const lines = [`[Task ${i + 1} from ${d.fromAgent.toUpperCase()}]`, d.instruction];
    const p = d.payloadData;

    if (d.payloadType === 'financial_constraint_changed') {
      const fp = p as { newMonthlyBudget?: number; runway?: number; reason?: string };
      if (fp.newMonthlyBudget) lines.push(`New monthly budget: $${fp.newMonthlyBudget.toLocaleString()}`);
      if (fp.runway)           lines.push(`Current runway: ${fp.runway} months`);
      if (fp.reason)           lines.push(`Why: ${fp.reason}`);
    } else if (d.payloadType === 'competitive_landscape_changed') {
      const cp = p as { newCompetitors?: string[]; whiteSpaceOpportunities?: string[] };
      if (cp.newCompetitors?.length)            lines.push(`New competitors: ${cp.newCompetitors.join(', ')}`);
      if (cp.whiteSpaceOpportunities?.length)   lines.push(`Opportunities: ${cp.whiteSpaceOpportunities.join(', ')}`);
    } else if (d.payloadType === 'pmf_signal_updated') {
      const pp = p as { pmfScore?: number; topCustomerPhrases?: string[]; messagingImplication?: string };
      if (pp.pmfScore != null)              lines.push(`PMF score: ${pp.pmfScore}`);
      if (pp.topCustomerPhrases?.length)    lines.push(`Customer language: "${pp.topCustomerPhrases[0]}"`);
      if (pp.messagingImplication)          lines.push(`Implication: ${pp.messagingImplication}`);
    } else if (d.payloadType === 'icp_updated') {
      lines.push('ICP has been updated — re-qualify open deals against new criteria before responding.');
    }

    return lines.join('\n');
  });

  return `\n\nPENDING DELEGATIONS — complete these as part of your response:\n${items.join('\n\n')}`;
}

// ── Proactive delegation triggers ─────────────────────────────────────────────
// Called after artifact generation to check if state changes should trigger delegation.

export async function triggerProactiveDelegations(
  agentId: string,
  userId: string,
  previousState: { runway_months?: number | null; pmf_score?: number | null } | null,
  newStateUpdates: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<void> {
  const newRunway = typeof newStateUpdates.runway_months === 'number' ? newStateUpdates.runway_months : null;
  const newPmf    = typeof newStateUpdates.pmf_score    === 'number' ? newStateUpdates.pmf_score    : null;

  // Felix → Harper: runway dropped into warning zone
  if (agentId === 'felix' && newRunway != null) {
    const prevRunway = previousState?.runway_months ?? null;
    const worsened   = prevRunway == null || newRunway < prevRunway;

    if (worsened && newRunway < 12) {
      const monthlyBudget = typeof newStateUpdates.monthly_burn === 'number' ? newStateUpdates.monthly_burn : 0;
      const taskId = await delegateTo(
        'felix', 'harper',
        'financial_constraint_changed',
        { previousMonthlyBudget: monthlyBudget, newMonthlyBudget: monthlyBudget, runway: newRunway,
          reason: `Runway dropped to ${newRunway} months — rebuild hiring plan to fit current budget` },
        `Runway is now ${newRunway} months. Rebuild the hiring plan within the current budget of $${monthlyBudget.toLocaleString()}/mo. Deprioritise non-essential roles.`,
        userId, supabase,
        newRunway < 6 ? 'immediate' : 'background',
      );

      if (taskId) {
        void supabase.from('agent_activity').insert({
          user_id:     userId,
          agent_id:    'felix',
          action_type: 'delegation_created',
          description: `Delegated hiring plan update to Harper — runway ${newRunway}mo`,
          metadata:    { to_agent: 'harper', payload_type: 'financial_constraint_changed', runway: newRunway },
        });
      }
    }
  }

  // Nova → Maya: PMF score updated
  if (agentId === 'nova' && newPmf != null) {
    await delegateTo(
      'nova', 'maya',
      'pmf_signal_updated',
      { pmfScore: newPmf, topCustomerPhrases: [], mainJobToBeDone: '',
        messagingImplication: 'Update brand voice to match current PMF signal — use the language customers actually use.',
        beforeAfterStory: { before: '', after: '' } },
      `PMF score is now ${newPmf}/100. Refresh brand messaging to align with the latest product-market fit signal.`,
      userId, supabase, 'background',
    );
  }

  // Atlas → Patel: competitive scan completed
  if (agentId === 'atlas' && newStateUpdates.last_competitor_scan) {
    await delegateTo(
      'atlas', 'patel',
      'competitive_landscape_changed',
      { newCompetitors: [], positioningGapsChanged: true, whiteSpaceOpportunities: [], urgency: 'this_week' },
      'Atlas completed a competitive scan. Re-evaluate your positioning and outreach messaging against the updated landscape.',
      userId, supabase, 'background',
    );
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function dbRowToTask(row: Record<string, unknown>): DelegationTask {
  return {
    id:          row.id as string,
    fromAgent:   row.from_agent as string,
    toAgent:     row.to_agent as string,
    userId:      row.user_id as string,
    instruction: row.instruction as string,
    payloadType: row.payload_type as string,
    payloadData: (row.payload_data ?? {}) as Record<string, unknown>,
    priority:    row.priority as DelegationPriority,
    status:      row.status as DelegationStatus,
    result:      row.result as Record<string, unknown> | undefined,
    error:       row.error as string | undefined,
    createdAt:   row.created_at as string,
    completedAt: row.completed_at as string | undefined,
    expiresAt:   row.expires_at as string,
  };
}
