/**
 * Cross-Artifact Consistency Checker
 *
 * After an artifact is generated, compares its key numeric metrics against
 * the founder's latest assessment data. If a core metric deviates >3× from
 * what the founder self-reported, it creates a consistency_flag entry in
 * score_evidence and reduces the integrity_index.
 *
 * This catches the common case where a founder enters $50K MRR in onboarding
 * but then has their Felix agent produce a financial_summary showing $200K MRR.
 *
 * Called fire-and-forget from generate/route.ts after applyAgentScoreSignal.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface ConsistencyResult {
  flagCount: number;
  flags: { metric: string; assessmentValue: number; artifactValue: number; deviation: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric extractors — pull numeric values from artifact content
// ─────────────────────────────────────────────────────────────────────────────

function extractNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && v > 0) return v;
    if (typeof v === 'string') {
      const n = parseFloat(v.replace(/[$,K]/gi, (m) =>
        m === 'K' || m === 'k' ? '000' : ''
      ));
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

/** Core metrics to compare between artifact and assessment */
const METRIC_CHECKS: {
  metric: string;
  artifactKeys: string[];
  assessmentPath: (a: Record<string, unknown>) => number | null;
}[] = [
  {
    metric: 'MRR',
    artifactKeys: ['mrr', 'MRR', 'monthlyRevenue', 'monthly_revenue', 'monthly_mrr'],
    assessmentPath: (a) => {
      const fin = a.financial as Record<string, unknown> | undefined;
      return fin ? extractNum(fin, ['mrr', 'MRR']) : null;
    },
  },
  {
    metric: 'ARR',
    artifactKeys: ['arr', 'ARR', 'annualRevenue', 'annual_revenue'],
    assessmentPath: (a) => {
      const fin = a.financial as Record<string, unknown> | undefined;
      return fin ? extractNum(fin, ['arr', 'ARR']) : null;
    },
  },
  {
    metric: 'Monthly burn',
    artifactKeys: ['burn', 'burnRate', 'burn_rate', 'monthlyBurn', 'monthly_burn'],
    assessmentPath: (a) => {
      const fin = a.financial as Record<string, unknown> | undefined;
      return fin ? extractNum(fin, ['monthlyBurn', 'burn', 'monthly_burn']) : null;
    },
  },
  {
    metric: 'Runway months',
    artifactKeys: ['runway', 'runwayMonths', 'runway_months'],
    assessmentPath: (a) => {
      const fin = a.financial as Record<string, unknown> | undefined;
      return fin ? extractNum(fin, ['runway', 'runwayMonths']) : null;
    },
  },
  {
    metric: 'Customer count',
    artifactKeys: ['customers', 'customerCount', 'customer_count', 'activeCustomers', 'paying_customers'],
    assessmentPath: (a) => {
      const n = extractNum(a, ['conversationCount']);
      return n;
    },
  },
];

const DEVIATION_THRESHOLD = 3.0; // 3× difference triggers a flag

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run consistency check between a newly generated artifact and the founder's
 * latest qscore_history assessment_data.
 *
 * Any inconsistent metric is written to score_evidence as a consistency_flag
 * with status='flagged' and negative points_awarded, which reduces the
 * integrity_index on the next scoring run.
 */
export async function checkArtifactConsistency(
  supabase: SupabaseClient,
  userId: string,
  artifactType: string,
  artifactContent: Record<string, unknown>
): Promise<ConsistencyResult> {
  const result: ConsistencyResult = { flagCount: 0, flags: [] };

  // Only check artifact types that contain financial data
  const financialArtifacts = ['financial_summary', 'strategic_plan', 'gtm_playbook'];
  if (!financialArtifacts.includes(artifactType)) return result;

  // Load latest assessment_data
  const { data: scoreRow } = await supabase
    .from('qscore_history')
    .select('assessment_data')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (!scoreRow?.assessment_data) return result;

  const assessmentData = scoreRow.assessment_data as Record<string, unknown>;

  // Compare each metric
  for (const check of METRIC_CHECKS) {
    const artifactVal = extractNum(artifactContent, check.artifactKeys);
    if (!artifactVal) continue;

    const assessmentVal = check.assessmentPath(assessmentData);
    if (!assessmentVal) continue;

    const larger  = Math.max(artifactVal, assessmentVal);
    const smaller = Math.min(artifactVal, assessmentVal);
    if (smaller === 0) continue;

    const deviation = larger / smaller;
    if (deviation > DEVIATION_THRESHOLD) {
      result.flags.push({
        metric: check.metric,
        assessmentValue: assessmentVal,
        artifactValue: artifactVal,
        deviation: Math.round(deviation * 10) / 10,
      });
    }
  }

  if (result.flags.length === 0) return result;
  result.flagCount = result.flags.length;

  // Write flags to score_evidence (status='flagged', negative points reduce integrity)
  for (const f of result.flags) {
    const title = `${f.metric} inconsistency: assessment ~$${Math.round(f.assessmentValue).toLocaleString()} vs ${artifactType} ~$${Math.round(f.artifactValue).toLocaleString()} (${f.deviation}×)`;

    // Skip if an identical flag already exists for this user (prevent duplicates)
    const { count } = await supabase
      .from('score_evidence')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('evidence_type', 'consistency_flag')
      .eq('title', title);

    if ((count ?? 0) > 0) continue;

    await supabase.from('score_evidence').insert({
      user_id:        userId,
      dimension:      'financial',
      evidence_type:  'consistency_flag',
      title,
      data_value:     String(f.deviation),
      status:         'flagged',
      points_awarded: -Math.min(5, Math.floor(f.deviation)), // −1 to −5 pts per flag
    });
  }

  console.log(`[Consistency] ${result.flagCount} flag(s) for ${userId} after ${artifactType}`);
  return result;
}
