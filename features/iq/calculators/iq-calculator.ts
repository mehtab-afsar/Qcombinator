/**
 * IQ Score Calculator — v1 (threshold-based, no LLM)
 *
 * Computes a 0–100 investment-readiness score from 25 indicators across 5 parameters.
 * DB-driven thresholds via `iq_indicators` table (seeded from Bessemer, YC, Carta).
 *
 * For each indicator:
 *   1. Extract raw numeric value from AssessmentData
 *   2. Compare against (score_1_max, score_3_max, score_5_min) thresholds → raw score 1/3/5
 *   3. Apply confidence (0.4–1.0) based on data source quality
 *   4. effective_score = raw_score × confidence
 *
 * Parameter scores = mean(effective_score) for included indicators.
 * Overall score = weighted sum of parameter scores, normalized to 0–100.
 *
 * Indicators with no extractable data are EXCLUDED (not penalized as 0).
 * This means the IQ Score is always "partial" until the founder fills all fields.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssessmentData } from '@/features/qscore/types/qscore.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IQIndicatorResult {
  code: string;
  name: string;
  rawValue: number | null;
  rawScore: number | null;   // 1 | 3 | 5 | null (excluded)
  confidence: number;        // 0.0–1.0
  effectiveScore: number;    // rawScore × confidence
  dataSource: 'direct' | 'derived' | 'estimated' | 'excluded';
  reasoning: string;
}

export interface IQParameterResult {
  parameterId: number;
  name: string;
  score: number;             // 0–5 effective weighted average
  indicatorsUsed: number;
  indicatorsExcluded: number;
}

export interface IQScoreResult {
  overallScore: number;       // 0–5 weighted
  normalizedScore: number;    // 0–100 for display
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  scoringMethod: 'full' | 'partial' | 'estimated';
  parameters: IQParameterResult[];
  indicators: IQIndicatorResult[];
  indicatorsUsed: number;
  indicatorsExcluded: number;
}

interface DBIndicator {
  code: string;
  parameter_id: number;
  name: string;
  score_1_max: number | null;
  score_3_max: number | null;
  score_5_min: number | null;
  higher_is_better: boolean;
  is_active: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const PARAMETER_NAMES: Record<number, string> = {
  1: 'Market Readiness',
  2: 'Market Potential',
  3: 'IP & Defensibility',
  4: 'Founder & Team',
  5: 'Structural Impact',
};

const DEFAULT_PARAM_WEIGHTS: Record<number, number> = {
  1: 0.25,
  2: 0.25,
  3: 0.20,
  4: 0.20,
  5: 0.10,
};

// ─── Data extraction ──────────────────────────────────────────────────────────

/**
 * Returns { value, source } where:
 *   source = 'direct'    — reliable first-party numeric field
 *   source = 'derived'   — computed from multiple fields
 *   source = 'estimated' — inferred from text/presence
 *   source = 'excluded'  — data unavailable
 */
function extractIndicatorValue(
  code: string,
  data: AssessmentData,
): { value: number | null; source: IQIndicatorResult['dataSource']; reasoning: string } {
  const fin = data.financial;
  const p2  = data.p2;
  const p3  = data.p3;
  const p4  = data.p4;

  switch (code) {
    // ── P1: Market Readiness ───────────────────────────────────────────────

    case '1.1': {
      // Revenue Intensity: ARR ÷ company age years — no age field, skip
      return { value: null, source: 'excluded', reasoning: 'Company age not collected' };
    }

    case '1.2': {
      // Revenue Growth Velocity: YoY % — requires 2 time-point data, not in single assessment
      return { value: null, source: 'excluded', reasoning: 'YoY comparison requires prior assessment data' };
    }

    case '1.3': {
      // Revenue Quality Ratio: MRR×12 / ARR (1 = fully recurring)
      if (fin?.mrr && fin?.arr && fin.arr > 0) {
        const ratio = (fin.mrr * 12) / fin.arr;
        return { value: Math.min(ratio, 1), source: 'derived', reasoning: `MRR×12=$${Math.round(fin.mrr * 12)}, ARR=$${fin.arr}` };
      }
      if (fin?.mrr && fin.mrr > 0) {
        // All revenue is MRR → ratio ≈ 1
        return { value: 1.0, source: 'estimated', reasoning: 'Only MRR present, assumed fully recurring' };
      }
      return { value: null, source: 'excluded', reasoning: 'No revenue data provided' };
    }

    case '1.4': {
      // Customer Concentration: top client % — not collected
      return { value: null, source: 'excluded', reasoning: 'Customer revenue concentration not collected' };
    }

    case '1.5': {
      // Paying Customer Density: customers / age years — no age, use absolute count proxy
      // We can estimate: ≥10 customers suggests density ≥ score 3
      if (data.customerList && data.customerList.length > 0) {
        return { value: data.customerList.length, source: 'estimated', reasoning: `${data.customerList.length} customers in customerList` };
      }
      if (data.conversationCount && data.conversationCount > 0) {
        return { value: Math.max(1, data.conversationCount * 0.3), source: 'estimated', reasoning: `~30% of ${data.conversationCount} conversations → paying estimate` };
      }
      return { value: null, source: 'excluded', reasoning: 'No paying customer count available' };
    }

    // ── P2: Market Potential ───────────────────────────────────────────────

    case '2.1': {
      // SAM — not a numeric field in AssessmentData
      if (data.targetCustomers && data.conversionRate) {
        const sam = data.targetCustomers * (data.lifetimeValue ?? 1000);
        return { value: sam, source: 'derived', reasoning: `${data.targetCustomers} targets × $${data.lifetimeValue ?? 1000} LTV` };
      }
      return { value: null, source: 'excluded', reasoning: 'SAM not calculable from available fields' };
    }

    case '2.2': {
      // Gross Margin % — not directly collected
      if (fin?.mrr && fin?.cogs) {
        const margin = (fin.mrr - fin.cogs) / fin.mrr;
        return { value: margin, source: 'derived', reasoning: `(MRR-COGS)/MRR = ${Math.round(margin * 100)}%` };
      }
      return { value: null, source: 'excluded', reasoning: 'COGS not provided' };
    }

    case '2.3': {
      // LTV:CAC ratio
      const ltv = data.lifetimeValue ?? 0;
      const cac = data.costPerAcquisition ?? 0;
      if (ltv > 0 && cac > 0) {
        return { value: ltv / cac, source: 'direct', reasoning: `LTV=$${ltv} ÷ CAC=$${cac}` };
      }
      return { value: null, source: 'excluded', reasoning: 'LTV or CAC not provided' };
    }

    case '2.4': {
      // Operating Leverage — not collected
      return { value: null, source: 'excluded', reasoning: 'Operating leverage requires OpEx and revenue time-series' };
    }

    case '2.5': {
      // Competitive Density: number of direct competitors
      if (p2?.competitorCount !== undefined && p2.competitorCount !== null) {
        return { value: p2.competitorCount, source: 'direct', reasoning: `${p2.competitorCount} direct competitors reported` };
      }
      return { value: null, source: 'excluded', reasoning: 'Competitor count not provided' };
    }

    // ── P3: IP & Defensibility ─────────────────────────────────────────────

    case '3.1': {
      // Registered IP: hasPatent → 0 (none) / 1 (filed) / 2 (granted)
      if (p3?.hasPatent === true) {
        // Filed = 1 point; we can't distinguish granted/filed without more info
        return { value: 1, source: 'estimated', reasoning: 'Patent filed (status unknown, conservative estimate)' };
      }
      if (p3?.hasPatent === false) {
        return { value: 0, source: 'direct', reasoning: 'No patent filed' };
      }
      return { value: null, source: 'excluded', reasoning: 'IP status not provided' };
    }

    case '3.2': {
      // R&D Intensity — not collected
      return { value: null, source: 'excluded', reasoning: 'R&D spend not separately tracked' };
    }

    case '3.3': {
      // Technical Team Density: engineers % of headcount
      if (p4?.teamCoverage && p4.teamCoverage.length > 0) {
        const techCount = p4.teamCoverage.filter(r =>
          /tech|eng|cto|dev|architect|ml|ai|data/i.test(r)
        ).length;
        const ratio = techCount / p4.teamCoverage.length;
        return { value: ratio, source: 'estimated', reasoning: `${techCount}/${p4.teamCoverage.length} roles are technical` };
      }
      return { value: null, source: 'excluded', reasoning: 'Team composition not provided' };
    }

    case '3.4': {
      // Build time (months) — direct field
      if (data.buildTime && data.buildTime > 0) {
        return { value: data.buildTime, source: 'direct', reasoning: `Build time: ${data.buildTime} months` };
      }
      return { value: null, source: 'excluded', reasoning: 'Build time not provided' };
    }

    case '3.5': {
      // Replication cost
      if (p3?.replicationCostUsd && p3.replicationCostUsd > 0) {
        return { value: p3.replicationCostUsd, source: 'direct', reasoning: `Replication cost: $${p3.replicationCostUsd}` };
      }
      return { value: null, source: 'excluded', reasoning: 'Replication cost not estimated' };
    }

    // ── P4: Founder & Team ─────────────────────────────────────────────────

    case '4.1': {
      // Domain years
      if (p4?.domainYears !== undefined && p4.domainYears !== null) {
        return { value: p4.domainYears, source: 'direct', reasoning: `${p4.domainYears} years in this domain` };
      }
      return { value: null, source: 'excluded', reasoning: 'Domain experience not provided' };
    }

    case '4.2': {
      // Founder-market alignment signals — count signals in text
      const signals = [
        /lived.*pain|personal.*problem|own.*problem|experienced.*firsthand/i.test(data.problemStory + (p4?.founderMarketFit ?? '')),
        /expert|specialist|\d+\s*year[s]?.*industr|domain.*expert/i.test(p4?.founderMarketFit ?? ''),
        /network|connection|relationship|know.*decision|advisor.*industr/i.test(p4?.founderMarketFit ?? ''),
        (data.conversationCount ?? 0) >= 10,
        p3?.hasPatent === true || /patent|trademark|exclusive|regulated|license/i.test(p3?.technicalDepth ?? ''),
      ].filter(Boolean).length;
      if (signals > 0) {
        return { value: signals, source: 'estimated', reasoning: `${signals}/5 founder-market alignment signals detected` };
      }
      return { value: 0, source: 'estimated', reasoning: 'No founder-market alignment signals detected in text' };
    }

    case '4.3': {
      // Prior ventures
      if (p4?.priorExits !== undefined && p4.priorExits !== null) {
        return { value: p4.priorExits, source: 'direct', reasoning: `${p4.priorExits} prior ventures/exits` };
      }
      return { value: null, source: 'excluded', reasoning: 'Prior venture history not provided' };
    }

    case '4.4': {
      // Technical cofounder presence: 0 = none, 0.5 = advisor, 1 = cofounder
      if (p4?.teamCoverage) {
        const hasTechFounder = p4.teamCoverage.some(r => /cto|co.?found.*tech|tech.*co.?found/i.test(r));
        const hasTechAdvisor = p4.teamCoverage.some(r => /tech|eng|dev/i.test(r));
        const score = hasTechFounder ? 1 : hasTechAdvisor ? 0.5 : 0;
        return { value: score, source: 'estimated', reasoning: hasTechFounder ? 'Technical co-founder in team' : hasTechAdvisor ? 'Technical advisor/member present' : 'No technical leadership identified' };
      }
      return { value: null, source: 'excluded', reasoning: 'Team composition not provided' };
    }

    case '4.5': {
      // Team retention: derived from teamCohesionMonths (longer = lower churn)
      if (p4?.teamCohesionMonths !== undefined && p4.teamCohesionMonths !== null) {
        // Assume cohesion months proxy retention: 24+ months → ~90% retention
        const retention = Math.min(0.95, 0.60 + (p4.teamCohesionMonths / 24) * 0.30);
        return { value: retention, source: 'estimated', reasoning: `Team cohesion ${p4.teamCohesionMonths}m → estimated retention ${Math.round(retention * 100)}%` };
      }
      return { value: null, source: 'excluded', reasoning: 'Team cohesion data not provided' };
    }

    // ── P5: Structural Impact ──────────────────────────────────────────────

    case '5.1': {
      // Carbon reduction — text-based, score by specificity
      const text = data.p5?.climateLeverage ?? '';
      if (!text || text.length < 30) return { value: null, source: 'excluded', reasoning: 'No climate impact data' };
      const hasNumbers = /\d+\s*%|\d+\s*(ton|kg|kg CO|metric)/i.test(text);
      return { value: hasNumbers ? 0.30 : 0.10, source: 'estimated', reasoning: hasNumbers ? 'Carbon reduction claim with numbers' : 'Climate claim present but qualitative' };
    }

    case '5.2': {
      const text = data.p5?.socialImpact ?? '';
      if (!text || text.length < 30) return { value: null, source: 'excluded', reasoning: 'No social impact data' };
      const hasMetric = /\d+/.test(text);
      return { value: hasMetric ? 1.30 : 1.10, source: 'estimated', reasoning: hasMetric ? 'Social impact with metrics' : 'Social impact qualitative claim' };
    }

    case '5.3': {
      // SDG count — estimate from text
      const text = (data.p5?.socialImpact ?? '') + (data.p5?.revenueImpactLink ?? '');
      if (!text || text.length < 20) return { value: null, source: 'excluded', reasoning: 'No SDG alignment data' };
      const sdgs = text.match(/SDG\s*\d+|Goal\s*\d+/gi) ?? [];
      const uniqueCount = new Set(sdgs.map(s => s.replace(/\D/g, ''))).size;
      return { value: uniqueCount || 1, source: 'estimated', reasoning: `${uniqueCount || 1} SDGs referenced in impact description` };
    }

    case '5.4': {
      const text = data.p5?.revenueImpactLink ?? '';
      if (!text || text.length < 30) return { value: null, source: 'excluded', reasoning: 'Revenue-impact link not described' };
      const hasPercent = /\d+\s*%/.test(text);
      return { value: hasPercent ? 0.60 : 0.25, source: 'estimated', reasoning: hasPercent ? 'SDG revenue % stated' : 'Revenue-impact link described qualitatively' };
    }

    case '5.5': {
      const text = data.p5?.viksitBharatAlignment ?? '';
      if (!text || text.length < 20) return { value: null, source: 'excluded', reasoning: 'Viksit Bharat alignment not provided' };
      const domains = ['semiconductor', 'defence', 'energy', 'food', 'agri', 'health', 'infra', 'space', 'fintech'];
      const matched = domains.filter(d => new RegExp(d, 'i').test(text)).length;
      return { value: Math.min(5, matched + 1), source: 'estimated', reasoning: `Aligned to ${matched} strategic domain(s)` };
    }

    default:
      return { value: null, source: 'excluded', reasoning: 'Unknown indicator code' };
  }
}

// ─── Threshold scoring ────────────────────────────────────────────────────────

function applyThreshold(
  value: number,
  s1: number | null,
  s3: number | null,
  s5: number | null,
  higherIsBetter: boolean,
): 1 | 3 | 5 {
  if (s1 === null || s3 === null || s5 === null) return 3; // neutral if no thresholds

  if (higherIsBetter) {
    if (value >= s5) return 5;
    if (value >= s3) return 3;
    return 1;
  } else {
    // Lower is better (e.g. competitor count)
    if (value <= s5) return 5;
    if (value <= s3) return 3;
    return 1;
  }
}

const CONFIDENCE_BY_SOURCE: Record<IQIndicatorResult['dataSource'], number> = {
  direct:    0.90,
  derived:   0.70,
  estimated: 0.45,
  excluded:  0,
};

// ─── Grade ────────────────────────────────────────────────────────────────────

function computeGrade(score: number): IQScoreResult['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

// ─── Main calculator ──────────────────────────────────────────────────────────

export async function computeIQScore(
  supabase: SupabaseClient,
  assessmentData: AssessmentData,
  sector: string = 'default',
): Promise<IQScoreResult> {
  // 1. Load active indicators from DB
  const { data: dbIndicators } = await supabase
    .from('iq_indicators')
    .select('code, parameter_id, name, score_1_max, score_3_max, score_5_min, higher_is_better, is_active')
    .eq('is_active', true)
    .order('code');

  const indicators: DBIndicator[] = (dbIndicators ?? []) as DBIndicator[];

  // 2. Load parameter weights for this sector
  const { data: dbWeights } = await supabase
    .from('iq_parameter_weights')
    .select('parameter_id, weight')
    .eq('sector', sector);

  const paramWeights: Record<number, number> = { ...DEFAULT_PARAM_WEIGHTS };
  for (const w of dbWeights ?? []) {
    paramWeights[w.parameter_id] = w.weight;
  }

  // 3. Score each indicator
  const results: IQIndicatorResult[] = [];

  for (const ind of indicators) {
    const { value, source, reasoning } = extractIndicatorValue(ind.code, assessmentData);

    if (source === 'excluded' || value === null) {
      results.push({
        code: ind.code, name: ind.name,
        rawValue: null, rawScore: null,
        confidence: 0, effectiveScore: 0,
        dataSource: 'excluded', reasoning,
      });
      continue;
    }

    const rawScore = applyThreshold(value, ind.score_1_max, ind.score_3_max, ind.score_5_min, ind.higher_is_better);
    const confidence = CONFIDENCE_BY_SOURCE[source];
    const effectiveScore = rawScore * confidence;

    results.push({
      code: ind.code, name: ind.name,
      rawValue: value, rawScore,
      confidence, effectiveScore,
      dataSource: source, reasoning,
    });
  }

  // 4. Aggregate per parameter
  const paramResults: IQParameterResult[] = [];
  const paramIds = [1, 2, 3, 4, 5];

  for (const pid of paramIds) {
    const paramIndicators = results.filter(r => {
      const ind = indicators.find(i => i.code === r.code);
      return ind?.parameter_id === pid;
    });

    const included = paramIndicators.filter(r => r.dataSource !== 'excluded');
    const excluded = paramIndicators.filter(r => r.dataSource === 'excluded');

    const score = included.length > 0
      ? included.reduce((s, r) => s + r.effectiveScore, 0) / included.length
      : 0;

    paramResults.push({
      parameterId: pid,
      name: PARAMETER_NAMES[pid] ?? `P${pid}`,
      score,
      indicatorsUsed: included.length,
      indicatorsExcluded: excluded.length,
    });
  }

  // 5. Weighted overall
  const totalWeight = paramIds.reduce((s, pid) => {
    const p = paramResults.find(r => r.parameterId === pid);
    if (!p || p.indicatorsUsed === 0) return s; // skip unpopulated parameters
    return s + (paramWeights[pid] ?? 0.20);
  }, 0);

  const rawOverall = totalWeight > 0
    ? paramIds.reduce((s, pid) => {
        const p = paramResults.find(r => r.parameterId === pid);
        if (!p || p.indicatorsUsed === 0) return s;
        return s + p.score * (paramWeights[pid] ?? 0.20);
      }, 0) / totalWeight
    : 0;

  const normalizedScore = Math.round((rawOverall / 5) * 100);
  const indicatorsUsed = results.filter(r => r.dataSource !== 'excluded').length;
  const indicatorsExcluded = results.filter(r => r.dataSource === 'excluded').length;
  const scoringMethod: IQScoreResult['scoringMethod'] = indicatorsUsed >= 20 ? 'full' : indicatorsUsed >= 10 ? 'partial' : 'estimated';

  return {
    overallScore: parseFloat(rawOverall.toFixed(2)),
    normalizedScore,
    grade: computeGrade(normalizedScore),
    scoringMethod,
    parameters: paramResults,
    indicators: results,
    indicatorsUsed,
    indicatorsExcluded,
  };
}

/**
 * Persist IQ Score to DB (iq_scores + iq_indicator_scores).
 * Returns the inserted iq_score row id.
 */
export async function saveIQScore(
  supabase: SupabaseClient,
  userId: string,
  result: IQScoreResult,
  previousScoreId: string | null,
  sector: string,
): Promise<string | null> {
  const parameterScores: Record<string, number> = {};
  for (const p of result.parameters) {
    parameterScores[`p${p.parameterId}`] = parseFloat(p.score.toFixed(2));
  }

  const { data: row, error } = await supabase
    .from('iq_scores')
    .insert({
      user_id:             userId,
      overall_score:       result.overallScore,
      normalized_score:    result.normalizedScore,
      grade:               result.grade,
      parameter_scores:    parameterScores,
      indicators_used:     result.indicatorsUsed,
      indicators_excluded: result.indicatorsExcluded,
      scoring_method:      result.scoringMethod,
      sector,
      previous_score_id:   previousScoreId,
    })
    .select('id')
    .single();

  if (error || !row) {
    console.error('[IQ] Insert error:', error);
    return null;
  }

  // Insert per-indicator breakdown
  const indicatorRows = result.indicators
    .filter(r => r.dataSource !== 'excluded')
    .map(r => ({
      iq_score_id:     row.id,
      user_id:         userId,
      indicator_code:  r.code,
      raw_score:       r.rawScore,
      confidence:      r.confidence,
      effective_score: r.effectiveScore,
      data_source:     r.dataSource,
      raw_value:       r.rawValue,
      reasoning:       r.reasoning,
    }));

  if (indicatorRows.length > 0) {
    await supabase.from('iq_indicator_scores').insert(indicatorRows);
  }

  return row.id;
}
