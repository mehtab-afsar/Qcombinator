/**
 * Agent Goals — persistent per-agent objectives evaluated against the shared world model.
 *
 * Each agent has one goal per founder. Goals survive between sessions.
 * The proactive engine evaluates all goals daily; if a goal moves to at_risk or blocked
 * the platform surfaces it and may trigger automated actions.
 *
 * Schema: agent_goals table (see migrations/20260417000001_agent_goals.sql)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StartupState } from './startup-state';
import { log } from '@/lib/logger'

// ── Types ──────────────────────────────────────────────────────────────────────

export type GoalStatus = 'on_track' | 'at_risk' | 'blocked' | 'achieved';

export interface AgentGoal {
  id?: string;
  userId: string;
  agentId: string;
  goal: string;
  successCondition: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: GoalStatus;
  reason: string;
  suggestedAction?: string | null;
  lastEvaluated?: string;
}

type EvalResult = { status: GoalStatus; reason: string; suggestedAction?: string };

// ── Per-agent evaluators ───────────────────────────────────────────────────────

const EVALUATORS: Record<string, (s: StartupState) => EvalResult> = {
  felix: (s) => {
    if (!s.runway_months) return { status: 'blocked', reason: 'No financial data yet' };
    if (s.runway_months < 6) return {
      status: 'at_risk',
      reason: `Runway ${s.runway_months}mo — critical`,
      suggestedAction: 'Build emergency cut scenarios immediately',
    };
    if (s.runway_months < 12) return {
      status: 'at_risk',
      reason: `Runway ${s.runway_months}mo — below 12mo target`,
      suggestedAction: 'Begin fundraising preparation now',
    };
    return { status: 'on_track', reason: `Runway ${s.runway_months}mo — healthy` };
  },

  patel: (s) => {
    const staleDays = s.last_icp_updated_at
      ? Math.floor((Date.now() - new Date(s.last_icp_updated_at).getTime()) / 86_400_000)
      : 999;
    if (staleDays > 90) return {
      status: 'at_risk',
      reason: `ICP not updated in ${staleDays} days — may be targeting the wrong buyers`,
      suggestedAction: 'Refresh ICP document with current customer data',
    };
    if ((s.outreach_reply_rate ?? 10) < 5) return {
      status: 'at_risk',
      reason: `Outreach reply rate ${s.outreach_reply_rate ?? 0}% — messaging not landing`,
      suggestedAction: 'Rewrite outreach angle based on latest ICP insights',
    };
    if (s.open_deals_count != null && s.open_deals_count < 3) return {
      status: 'at_risk',
      reason: `Only ${s.open_deals_count} open deal(s) — pipeline thin`,
      suggestedAction: 'Build outreach sequence for your target ICP',
    };
    if (s.open_deals_count == null) return {
      status: 'blocked',
      reason: 'No pipeline data',
      suggestedAction: 'Run lead enrichment to build initial pipeline',
    };
    return { status: 'on_track', reason: `${s.open_deals_count} deals in pipeline` };
  },

  susi: (s) => {
    if (s.open_deals_count == null) return { status: 'blocked', reason: 'No pipeline visibility' };
    if (s.open_deals_count < 3) return {
      status: 'at_risk',
      reason: 'Pipeline too thin',
      suggestedAction: 'Request ICP refresh from Patel',
    };
    return { status: 'on_track', reason: `${s.open_deals_count} active deals` };
  },

  nova: (s) => {
    if (!s.pmf_score) return {
      status: 'blocked',
      reason: 'No survey data yet',
      suggestedAction: 'Launch PMF survey — target 40+ responses',
    };
    if (s.pmf_score < 40) return {
      status: 'at_risk',
      reason: `PMF ${s.pmf_score}/100 — below 40% threshold`,
      suggestedAction: 'Analyse low-score responses to find the real job-to-be-done',
    };
    return { status: 'on_track', reason: `PMF ${s.pmf_score}/100` };
  },

  harper: (s) => {
    if (!s.monthly_burn) return {
      status: 'blocked',
      reason: 'No financial data to derive headcount budget',
    };
    return { status: 'on_track', reason: `Hiring plan in sync with $${s.monthly_burn.toLocaleString()}/mo burn` };
  },

  atlas: (s) => {
    if (!s.last_competitor_scan) return {
      status: 'blocked',
      reason: 'No competitive scan yet',
      suggestedAction: 'Run competitive matrix',
    };
    const daysSince = (Date.now() - new Date(s.last_competitor_scan).getTime()) / 86_400_000;
    if (daysSince > 14) return {
      status: 'at_risk',
      reason: `Last scan ${Math.round(daysSince)} days ago — stale`,
      suggestedAction: 'Run weekly competitive scan',
    };
    return { status: 'on_track', reason: `Last scanned ${Math.round(daysSince)} days ago` };
  },

  sage: (s) => {
    if (!s.investor_readiness_score) return { status: 'blocked', reason: 'No readiness score yet' };
    if (s.investor_readiness_score < 50) return {
      status: 'at_risk',
      reason: `Readiness ${s.investor_readiness_score}/100 — below 50`,
      suggestedAction: 'Run investor readiness workflow',
    };
    return { status: 'on_track', reason: `Readiness ${s.investor_readiness_score}/100` };
  },

  maya: (s) => {
    const staleDays = s.last_brand_updated_at
      ? Math.floor((Date.now() - new Date(s.last_brand_updated_at).getTime()) / 86_400_000)
      : 999;
    if (staleDays > 90) return {
      status: 'at_risk',
      reason: `Brand messaging stale — ${staleDays} days since last update`,
      suggestedAction: 'Generate fresh brand messaging aligned with current ICP',
    };
    return { status: 'on_track', reason: 'Brand messaging current' };
  },

  leo: (s) => {
    const unresolved = s.legal_risk_unresolved ?? 0;
    if (unresolved > 2) return {
      status: 'at_risk',
      reason: `${unresolved} unresolved legal risks flagged`,
      suggestedAction: 'Address highest-severity legal risks and update checklist',
    };
    return { status: 'on_track', reason: unresolved > 0 ? `${unresolved} minor risks tracked` : 'Legal clear' };
  },

  carter: (s) => {
    if (s.churn_rate != null && s.churn_rate > 5) return {
      status: 'at_risk',
      reason: `Churn ${s.churn_rate}%/mo — high`,
      suggestedAction: 'Run churn analysis and build retention playbook',
    };
    return {
      status: 'on_track',
      reason: s.churn_rate != null ? `Churn ${s.churn_rate}%/mo` : 'No churn data yet',
    };
  },

  riley: (s) => {
    if (!s.monthly_growth_rate) return {
      status: 'blocked',
      reason: 'No growth data',
      suggestedAction: 'Connect analytics to track growth rate',
    };
    if (s.monthly_growth_rate < 5) return {
      status: 'at_risk',
      reason: `Growth ${s.monthly_growth_rate}% MoM — below 5% target`,
      suggestedAction: 'Run growth experiment design',
    };
    return { status: 'on_track', reason: `Growth ${s.monthly_growth_rate}% MoM` };
  },
};

// ── Goal definitions ──────────────────────────────────────────────────────────

const GOAL_DEFS: Record<string, { goal: string; successCondition: string; priority: AgentGoal['priority'] }> = {
  felix:  { goal: 'Maintain healthy runway and financial visibility',           successCondition: 'runway_months >= 12',                          priority: 'critical' },
  patel:  { goal: 'Build and maintain a healthy outreach pipeline',             successCondition: 'open_deals_count >= 3',                        priority: 'high'     },
  susi:   { goal: 'Keep pipeline active with no stale deals',                   successCondition: 'open_deals_count >= 3',                        priority: 'high'     },
  nova:   { goal: 'Maintain PMF signal above 40%',                             successCondition: 'pmf_score >= 40',                              priority: 'high'     },
  harper: { goal: 'Keep hiring plan aligned with financial constraints',         successCondition: 'hiring_plan aligned with current burn rate',   priority: 'medium'   },
  atlas:  { goal: 'Maintain current competitive intelligence (< 14 days old)',  successCondition: 'last_competitor_scan within 14 days',          priority: 'medium'   },
  sage:   { goal: 'Keep startup investor-ready and strategy coherent',          successCondition: 'investor_readiness_score >= 65',               priority: 'critical' },
  maya:   { goal: 'Keep brand messaging aligned with latest PMF signal',        successCondition: 'brand_messaging post-dates latest pmf_survey', priority: 'medium'   },
  leo:    { goal: 'Keep legal checklist current for current stage',             successCondition: 'legal_checklist up to date',                   priority: 'low'      },
  carter: { goal: 'Keep monthly churn below 5%',                               successCondition: 'churn_rate < 5',                               priority: 'high'     },
  riley:  { goal: 'Maintain monthly growth rate above 5%',                     successCondition: 'monthly_growth_rate >= 5',                     priority: 'high'     },
};

// ── Evaluate ──────────────────────────────────────────────────────────────────

export function evaluateGoalFromState(agentId: string, state: StartupState): EvalResult {
  const evaluator = EVALUATORS[agentId];
  if (!evaluator) return { status: 'on_track', reason: 'No evaluator defined' };
  return evaluator(state);
}

// ── DB operations ─────────────────────────────────────────────────────────────

export async function getAgentGoal(
  agentId: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<AgentGoal | null> {
  try {
    const { data } = await supabase
      .from('agent_goals')
      .select('*')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .maybeSingle();
    return data ? dbRowToGoal(data) : null;
  } catch {
    return null;
  }
}

export async function upsertAgentGoal(
  agentId: string,
  userId: string,
  state: StartupState,
  supabase: SupabaseClient,
): Promise<AgentGoal | null> {
  const def = GOAL_DEFS[agentId];
  if (!def) return null;

  const evalResult = evaluateGoalFromState(agentId, state);

  try {
    const { data, error } = await supabase
      .from('agent_goals')
      .upsert({
        user_id:           userId,
        agent_id:          agentId,
        goal:              def.goal,
        success_condition: def.successCondition,
        priority:          def.priority,
        status:            evalResult.status,
        reason:            evalResult.reason,
        suggested_action:  evalResult.suggestedAction ?? null,
        last_evaluated:    new Date().toISOString(),
      }, { onConflict: 'user_id,agent_id' })
      .select()
      .single();

    if (error) { log.warn('[agent-goals] upsert error:', error.message); return null; }
    return dbRowToGoal(data);
  } catch (e) {
    log.warn('[agent-goals] unexpected error:', e);
    return null;
  }
}

export async function getAllAgentGoals(
  userId: string,
  supabase: SupabaseClient,
): Promise<AgentGoal[]> {
  try {
    const { data } = await supabase
      .from('agent_goals')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true });
    return (data ?? []).map(dbRowToGoal);
  } catch {
    return [];
  }
}

// ── Prompt injection ──────────────────────────────────────────────────────────

export function formatGoalForPrompt(goal: AgentGoal | null): string {
  if (!goal) return '';
  const icon = { on_track: '✅', at_risk: '⚠️', blocked: '🚫', achieved: '🏆' }[goal.status] ?? '•';
  const lines = [
    `YOUR CURRENT GOAL: ${goal.goal}`,
    `Status: ${icon} ${goal.status.replace('_', ' ')} — ${goal.reason}`,
  ];
  if (goal.suggestedAction) lines.push(`Suggested focus: ${goal.suggestedAction}`);
  return `\n\n${lines.join('\n')}`;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function dbRowToGoal(row: Record<string, unknown>): AgentGoal {
  return {
    id:               row.id as string,
    userId:           row.user_id as string,
    agentId:          row.agent_id as string,
    goal:             row.goal as string,
    successCondition: row.success_condition as string,
    priority:         row.priority as AgentGoal['priority'],
    status:           row.status as GoalStatus,
    reason:           row.reason as string,
    suggestedAction:  row.suggested_action as string | null,
    lastEvaluated:    row.last_evaluated as string,
  };
}
