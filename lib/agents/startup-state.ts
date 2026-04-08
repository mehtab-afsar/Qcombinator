/**
 * Startup State — shared world model across all 11 agents.
 *
 * Every agent reads this at conversation start so they know what other agents
 * have already learned. Every agent writes back when they produce new facts
 * (Felix learns MRR → updates mrr; Nova learns retention → updates day30_retention).
 *
 * Schema mirrors the `startup_state` Supabase table (see migrations/startup_state.sql).
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StartupState {
  // Identity
  company_name:          string | null;
  industry:              string | null;
  stage:                 string | null;

  // Financial (Felix)
  mrr:                   number | null;
  arr:                   number | null;
  monthly_burn:          number | null;
  runway_months:         number | null;
  gross_margin:          number | null;

  // Traction (Susi / Patel)
  open_deals_count:      number | null;
  paying_customer_count: number | null;
  mrr_growth_rate:       number | null;   // % month-over-month

  // Product (Nova / Carter)
  pmf_score:             number | null;   // 0–100
  day30_retention:       number | null;   // % of users still active at day 30
  nps_score:             number | null;   // -100 to 100
  churn_rate:            number | null;   // % monthly

  // Competitive (Atlas)
  competitor_count:      number | null;
  last_competitor_scan:  string | null;   // ISO timestamp

  // Team (Harper)
  team_size:             number | null;
  open_roles_count:      number | null;

  // Fundraising (Sage / Felix)
  investor_readiness_score: number | null;  // 0–100
  fundraising_stage:     string | null;     // 'pre-seed' | 'seed' | 'series-a' | etc.

  // Growth (Riley / Patel)
  cac:                   number | null;
  monthly_growth_rate:   number | null;   // % month-over-month users/revenue

  // Meta
  updated_at:            string | null;
  last_updated_by:       string | null;   // agent id that last wrote
}

// Fields each agent is authoritative for — only these are written on their turns
export const AGENT_STATE_FIELDS: Record<string, (keyof StartupState)[]> = {
  felix:  ['mrr', 'arr', 'monthly_burn', 'runway_months', 'gross_margin', 'fundraising_stage', 'investor_readiness_score'],
  susi:   ['open_deals_count', 'paying_customer_count', 'mrr_growth_rate'],
  nova:   ['pmf_score', 'day30_retention', 'nps_score'],
  carter: ['churn_rate', 'nps_score'],
  atlas:  ['competitor_count', 'last_competitor_scan'],
  harper: ['team_size', 'open_roles_count'],
  sage:   ['investor_readiness_score'],
  riley:  ['cac', 'monthly_growth_rate'],
  patel:  ['open_deals_count'],
};

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getStartupState(
  userId: string,
  supabase: SupabaseClient,
): Promise<StartupState | null> {
  try {
    const { data, error } = await supabase
      .from('startup_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[startup-state] read error:', error.message);
      return null;
    }
    return data as StartupState | null;
  } catch (e) {
    console.warn('[startup-state] unexpected read error:', e);
    return null;
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function updateStartupState(
  userId: string,
  updates: Partial<StartupState>,
  agentId: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (Object.keys(updates).length === 0) return;

  // Strip undefined values
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return;

  try {
    const { error } = await supabase
      .from('startup_state')
      .upsert({
        user_id: userId,
        ...clean,
        last_updated_by: agentId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) console.warn('[startup-state] write error:', error.message);
  } catch (e) {
    console.warn('[startup-state] unexpected write error:', e);
  }
}

// ── Format for system prompt injection ───────────────────────────────────────

export function formatStartupStateForPrompt(state: StartupState | null): string {
  if (!state) return '';

  const lines: string[] = [];

  // Financial
  const financials: string[] = [];
  if (state.mrr != null)          financials.push(`MRR $${state.mrr.toLocaleString()}`);
  if (state.arr != null)          financials.push(`ARR $${state.arr.toLocaleString()}`);
  if (state.monthly_burn != null) financials.push(`Burn $${state.monthly_burn.toLocaleString()}/mo`);
  if (state.runway_months != null) financials.push(`Runway ${state.runway_months}mo`);
  if (state.gross_margin != null) financials.push(`Margin ${state.gross_margin}%`);
  if (financials.length) lines.push(`💰 Finance: ${financials.join(' · ')}`);

  // Traction
  const traction: string[] = [];
  if (state.paying_customer_count != null) traction.push(`${state.paying_customer_count} paying customers`);
  if (state.open_deals_count != null)      traction.push(`${state.open_deals_count} open deals`);
  if (state.mrr_growth_rate != null)       traction.push(`${state.mrr_growth_rate}% MoM growth`);
  if (traction.length) lines.push(`📈 Traction: ${traction.join(' · ')}`);

  // Product
  const product: string[] = [];
  if (state.pmf_score != null)      product.push(`PMF ${state.pmf_score}/100`);
  if (state.day30_retention != null) product.push(`D30 retention ${state.day30_retention}%`);
  if (state.nps_score != null)      product.push(`NPS ${state.nps_score}`);
  if (state.churn_rate != null)     product.push(`Churn ${state.churn_rate}%/mo`);
  if (product.length) lines.push(`🎯 Product: ${product.join(' · ')}`);

  // Team
  const team: string[] = [];
  if (state.team_size != null)       team.push(`${state.team_size} people`);
  if (state.open_roles_count != null) team.push(`${state.open_roles_count} open roles`);
  if (team.length) lines.push(`👥 Team: ${team.join(' · ')}`);

  // Growth
  const growth: string[] = [];
  if (state.cac != null)               growth.push(`CAC $${state.cac}`);
  if (state.monthly_growth_rate != null) growth.push(`${state.monthly_growth_rate}% MoM`);
  if (growth.length) lines.push(`🚀 Growth: ${growth.join(' · ')}`);

  // Competitive / Fundraising
  if (state.competitor_count != null)       lines.push(`🏆 Competitors tracked: ${state.competitor_count}`);
  if (state.investor_readiness_score != null) lines.push(`📊 Investor readiness: ${state.investor_readiness_score}/100`);
  if (state.fundraising_stage)              lines.push(`💼 Fundraising: ${state.fundraising_stage}`);

  if (lines.length === 0) return '';

  const age = state.updated_at
    ? ` (last updated ${new Date(state.updated_at).toLocaleDateString()})`
    : '';

  return `\n\nLIVE STARTUP STATE${age} — facts gathered by your co-advisers:\n${lines.join('\n')}\nUse this data when relevant. Do not fabricate numbers not listed here.`;
}

// ── Extract state updates from an artifact ───────────────────────────────────
// Each agent's artifacts contain specific fields that update the shared state.

export function extractStateFromArtifact(
  agentId: string,
  artifactType: string,
  artifactData: Record<string, unknown>,
): Partial<StartupState> {
  const updates: Partial<StartupState> = {};

  switch (agentId) {
    case 'felix': {
      const fin = (artifactData.financial ?? artifactData) as Record<string, unknown>;
      if (num(fin.mrr))          updates.mrr = fin.mrr as number;
      if (num(fin.arr))          updates.arr = fin.arr as number;
      if (num(fin.monthlyBurn))  updates.monthly_burn = fin.monthlyBurn as number;
      if (num(fin.runway))       updates.runway_months = fin.runway as number;
      if (num(fin.grossMargin))  updates.gross_margin = fin.grossMargin as number;
      if (str(artifactData.fundraisingStage)) updates.fundraising_stage = artifactData.fundraisingStage as string;
      if (num(artifactData.investorReadinessScore)) updates.investor_readiness_score = artifactData.investorReadinessScore as number;
      break;
    }
    case 'susi': {
      if (num(artifactData.openDealsCount))      updates.open_deals_count = artifactData.openDealsCount as number;
      if (num(artifactData.payingCustomerCount)) updates.paying_customer_count = artifactData.payingCustomerCount as number;
      if (num(artifactData.mrrGrowthRate))       updates.mrr_growth_rate = artifactData.mrrGrowthRate as number;
      break;
    }
    case 'nova': {
      if (num(artifactData.pmfScore))       updates.pmf_score = artifactData.pmfScore as number;
      if (num(artifactData.day30Retention)) updates.day30_retention = artifactData.day30Retention as number;
      if (num(artifactData.npsScore))       updates.nps_score = artifactData.npsScore as number;
      break;
    }
    case 'carter': {
      if (num(artifactData.churnRate))  updates.churn_rate = artifactData.churnRate as number;
      if (num(artifactData.npsScore))   updates.nps_score = artifactData.npsScore as number;
      break;
    }
    case 'atlas': {
      if (num(artifactData.competitorCount)) updates.competitor_count = artifactData.competitorCount as number;
      updates.last_competitor_scan = new Date().toISOString();
      break;
    }
    case 'harper': {
      if (num(artifactData.teamSize))       updates.team_size = artifactData.teamSize as number;
      if (num(artifactData.openRolesCount)) updates.open_roles_count = artifactData.openRolesCount as number;
      break;
    }
    case 'sage': {
      if (num(artifactData.investorReadinessScore)) updates.investor_readiness_score = artifactData.investorReadinessScore as number;
      break;
    }
    case 'riley': {
      if (num(artifactData.cac))               updates.cac = artifactData.cac as number;
      if (num(artifactData.monthlyGrowthRate)) updates.monthly_growth_rate = artifactData.monthlyGrowthRate as number;
      break;
    }
    case 'patel': {
      if (num(artifactData.leadsGenerated)) updates.open_deals_count = artifactData.leadsGenerated as number;
      break;
    }
  }

  // Ignore artifact type for now — just extract by agent
  void artifactType;

  return updates;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v) && v >= 0;
}
function str(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
