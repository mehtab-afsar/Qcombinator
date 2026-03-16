/**
 * IQ Orchestrator
 *
 * Main entry point for Edge Alpha IQ scoring.
 * Assembles all 7 components into a single pipeline:
 *
 * 1. Load indicator configs from DB (1h cache)
 * 2. Load sector parameter weights from DB
 * 3. Resolve data for each of 25 indicators (multi-source hierarchy)
 * 4. Score each indicator: AI reconciler or threshold scorer
 * 5. Run cross-validation (12 consistency rules)
 * 6. Compute effective scores via confidence engine
 * 7. Aggregate per parameter → overall score
 * 8. Persist to iq_scores + iq_indicator_scores
 * 9. Return IQScore with full audit trail
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  IQScore,
  IQIndicatorResult,
  IQParameterScore,
  DataSource,
  PARAMETER_NAMES,
  calculateIQGrade,
  ConsistencyFlag,
  EvidenceCitation,
} from '../types/iq.types';
import { fetchIndicatorConfig, scoreValue, finalizeScore } from './indicator-scorer';
import { resolveAllIndicators, ResolverContext } from './data-resolver';
import { reconcileIndicator } from './ai-reconciler';
import { runCrossValidation, getFlagsForIndicator } from './cross-validator';
import { computeEffectiveScore, aggregateParameterScore, normalizeIQScore } from '../services/confidence-engine';

// ─── Parameter Weight Loader ──────────────────────────────────────────────────

interface _ParameterWeightRow {
  parameter_id: number;
  weight: number;
}

let weightCache: Map<string, Map<number, number>> | null = null;
let weightCachedAt = 0;
const WEIGHT_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchParameterWeights(
  supabase: SupabaseClient,
  sector: string
): Promise<Map<number, number>> {
  const now = Date.now();

  if (weightCache && now - weightCachedAt < WEIGHT_TTL_MS) {
    return weightCache.get(sector) ?? weightCache.get('saas_b2b') ?? defaultWeights();
  }

  const { data, error } = await supabase
    .from('iq_parameter_weights')
    .select('sector, parameter_id, weight');

  if (error || !data) {
    console.warn('[IQ] Failed to fetch parameter weights:', error?.message);
    return defaultWeights();
  }

  weightCache = new Map();
  for (const row of data as Array<{ sector: string; parameter_id: number; weight: number }>) {
    if (!weightCache.has(row.sector)) weightCache.set(row.sector, new Map());
    weightCache.get(row.sector)!.set(row.parameter_id, row.weight);
  }
  weightCachedAt = now;

  return weightCache.get(sector) ?? weightCache.get('saas_b2b') ?? defaultWeights();
}

function defaultWeights(): Map<number, number> {
  // Equal weights 0.20 per parameter as fallback
  return new Map([[1, 0.20], [2, 0.20], [3, 0.20], [4, 0.20], [5, 0.20]]);
}

/** Invalidate both config + weight caches (call after admin update) */
export function invalidateIQCaches(): void {
  weightCache = null;
  weightCachedAt = 0;
}

// ─── Sector Inference ─────────────────────────────────────────────────────────

function inferSectorKey(sector?: string): string {
  if (!sector) return 'saas_b2b';
  const s = sector.toLowerCase();
  if (s.includes('deep') || s.includes('hardware') || s.includes('semiconductor')) return 'deeptech';
  if (s.includes('bio') || s.includes('health') || s.includes('pharma') || s.includes('medtech')) return 'healthtech';
  if (s.includes('fin') || s.includes('bank') || s.includes('payment') || s.includes('insurance')) return 'fintech';
  if (s.includes('climate') || s.includes('clean') || s.includes('energy') || s.includes('sustain')) return 'climatetech';
  if (s.includes('consumer') || s.includes('d2c') || s.includes('marketplace')) return 'consumer';
  if (s.includes('b2b') || s.includes('enterprise') || s.includes('saas')) return 'saas_b2b';
  if (s.includes('edu') || s.includes('learning')) return 'edtech';
  return 'saas_b2b'; // default
}

// ─── Tavily Grounding ─────────────────────────────────────────────────────────

async function fetchTavilyGrounding(query: string): Promise<string> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TAVILY_API_KEY ?? ''}`,
      },
      body: JSON.stringify({ query, search_depth: 'basic', max_results: 5 }),
    });
    if (!response.ok) return '';
    const data = await response.json();
    const results = (data.results ?? []) as Array<{ title: string; content: string; url: string }>;
    return results
      .map((r) => `### ${r.title}\n${r.content}\nSource: ${r.url}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export interface IQOrchestratorInput extends ResolverContext {
  userId: string;
  supabase: SupabaseClient;
  /** If true, skip Tavily calls (for testing or when quota exhausted) */
  skipTavily?: boolean;
}

/**
 * Run the full IQ scoring pipeline for one founder.
 * Returns a complete IQScore with per-indicator audit trail.
 */
export async function runIQScoring(input: IQOrchestratorInput): Promise<IQScore> {
  const { userId, supabase, assessment, artifacts, stripe, profile, skipTavily } = input;

  const assessmentExtra = assessment as unknown as Record<string, unknown>;
  const sector = profile?.sector ?? (assessmentExtra.sector as string | undefined) ?? 'saas_b2b';
  const sectorKey = inferSectorKey(sector);

  // ── Step 1 & 2: Load configs + weights in parallel ─────────────────────────
  const [indicatorConfigs, paramWeights] = await Promise.all([
    fetchIndicatorConfig(supabase),
    fetchParameterWeights(supabase, sectorKey),
  ]);

  if (indicatorConfigs.length === 0) {
    throw new Error('[IQ Orchestrator] No indicator configs found — run migration first');
  }

  // ── Step 3: Resolve data for all 25 indicators ─────────────────────────────
  const ctx: ResolverContext = { assessment, artifacts, stripe, profile };
  const resolvedMap = resolveAllIndicators(ctx);

  // ── Step 4 & 5: Score + AI reconcile, collect raw results ─────────────────
  // Pre-fetch Tavily grounding for AI-reconciled indicators if needed
  const needsTavily = indicatorConfigs.filter(c => c.aiReconciled);
  const tavilyCache: Record<string, string> = {};

  if (!skipTavily && needsTavily.length > 0) {
    const productDesc = String(
      (assessmentExtra.productDescription as string | undefined) ??
      (assessmentExtra.story as string | undefined) ??
      assessment.advantageExplanation ??
      assessment.problemStory ??
      ''
    );
    const sector_ = String((assessmentExtra.sector as string | undefined) ?? 'tech startup');

    await Promise.all([
      // 2.1 SAM — market size search
      (async () => {
        const q = `${sector_} serviceable addressable market size 2024 2025`;
        tavilyCache['2.1'] = await fetchTavilyGrounding(q);
      })(),
      // 2.5 Competitive Density — competitor search
      (async () => {
        const q = `${productDesc.slice(0, 100)} competitors alternatives 2024`;
        tavilyCache['2.5'] = await fetchTavilyGrounding(q);
      })(),
    ]);
  }

  // Score each indicator (run AI-reconciled ones in batches to respect concurrency)
  const rawResults: Array<{
    code: string;
    rawScore: number | null;
    dataSource: DataSource;
    rawValue: number | null;
    reasoning: string;
    evidenceQuotes: string[];
    excluded: boolean;
  }> = [];

  // Process AI-reconciled and regular indicators separately for clarity
  const aiCodes = new Set(indicatorConfigs.filter(c => c.aiReconciled).map(c => c.code));

  // Regular (threshold-based) indicators — all in parallel
  const regularResults = await Promise.all(
    indicatorConfigs
      .filter(c => !c.aiReconciled)
      .map(async (config) => {
        const resolved = resolvedMap.get(config.code);
        if (!resolved || resolved.source === 'excluded') {
          return {
            code: config.code,
            rawScore: null as number | null,
            dataSource: 'excluded' as DataSource,
            rawValue: null as number | null,
            reasoning: resolved?.missingReason ?? 'No data available',
            evidenceQuotes: [] as string[],
            excluded: true,
          };
        }
        const rawScore = finalizeScore(scoreValue(resolved.value, config));
        return {
          code: config.code,
          rawScore,
          dataSource: resolved.source,
          rawValue: resolved.value,
          reasoning: rawScore != null
            ? `Scored ${rawScore}/5 based on ${config.unit ?? 'value'} = ${resolved.value?.toLocaleString() ?? 'N/A'} (source: ${resolved.source})`
            : 'Could not score — value out of range',
          evidenceQuotes: [] as string[],
          excluded: rawScore == null,
        };
      })
  );

  rawResults.push(...regularResults);

  // AI-reconciled indicators — run sequentially to limit LLM concurrency
  for (const config of indicatorConfigs.filter(c => c.aiReconciled)) {
    const resolved = resolvedMap.get(config.code);
    if (!resolved || resolved.source === 'excluded') {
      rawResults.push({
        code: config.code,
        rawScore: null,
        dataSource: 'excluded',
        rawValue: null,
        reasoning: resolved?.missingReason ?? 'No data for AI reconciliation',
        evidenceQuotes: [],
        excluded: true,
      });
      continue;
    }

    try {
      const aiResult = await reconcileIndicator(
        config.code,
        resolved,
        tavilyCache[config.code]
      );

      if (aiResult.hallucinationDetected) {
        rawResults.push({
          code: config.code,
          rawScore: null,
          dataSource: 'excluded',
          rawValue: null,
          reasoning: 'Hallucination detected — indicator excluded from scoring',
          evidenceQuotes: [],
          excluded: true,
        });
      } else {
        const aiSource: DataSource = aiResult.confidence >= 0.65
          ? 'ai_reconciled_grounded'
          : 'ai_reconciled_estimated';

        rawResults.push({
          code: config.code,
          rawScore: aiResult.score,
          dataSource: aiSource,
          rawValue: resolved.value,
          reasoning: aiResult.reasoning,
          evidenceQuotes: aiResult.evidenceQuotes,
          excluded: false,
        });
      }
    } catch (err) {
      console.warn(`[IQ Orchestrator] AI reconciler failed for ${config.code}:`, err);
      rawResults.push({
        code: config.code,
        rawScore: null,
        dataSource: 'excluded',
        rawValue: null,
        reasoning: `AI reconciler error: ${err instanceof Error ? err.message : 'unknown'}`,
        evidenceQuotes: [],
        excluded: true,
      });
    }
  }

  // ── Step 5: Cross-validation ──────────────────────────────────────────────
  const snapshots = rawResults.map(r => ({
    code: r.code,
    rawScore: r.rawScore,
    rawValue: r.rawValue,
    excluded: r.excluded,
  }));
  const flagMap = runCrossValidation(snapshots);

  // ── Step 6: Apply confidence engine ──────────────────────────────────────
  const configMap = new Map(indicatorConfigs.map(c => [c.code, c]));

  const indicatorResults: IQIndicatorResult[] = rawResults.map(r => {
    const config = configMap.get(r.code);
    const flags: ConsistencyFlag[] = getFlagsForIndicator(r.code, flagMap);

    const { effectiveScore, finalConfidence } = computeEffectiveScore(
      r.rawScore ?? 1,
      r.dataSource,
      flags
    );

    const citations: EvidenceCitation[] = r.evidenceQuotes.map(q => ({
      text: q,
      source: aiCodes.has(r.code) ? 'tavily_search' : r.dataSource,
    }));

    return {
      code: r.code,
      name: config?.name ?? r.code,
      parameterId: config?.parameterId ?? 0,
      rawScore: r.excluded ? null : (r.rawScore ?? null),
      confidence: r.excluded ? 0 : finalConfidence,
      effectiveScore: r.excluded ? 0 : effectiveScore,
      dataSource: r.dataSource,
      rawValue: r.rawValue,
      reasoning: r.reasoning,
      evidenceCitations: citations,
      consistencyFlags: flags,
      excluded: r.excluded,
    };
  });

  // ── Step 7: Aggregate parameter scores ───────────────────────────────────
  const parameterIds = [1, 2, 3, 4, 5];

  const parameterScores: IQParameterScore[] = parameterIds.map(pid => {
    const inGroup = indicatorResults.filter(i => i.parameterId === pid);
    const weight = paramWeights.get(pid) ?? 0.20;

    const paramScore = aggregateParameterScore(
      inGroup.map(i => ({
        effectiveScore: i.effectiveScore,
        excluded: i.excluded,
        weight: 1, // equal weights within parameter
      }))
    );

    return {
      parameterId: pid,
      name: PARAMETER_NAMES[pid] ?? `Parameter ${pid}`,
      score: Math.round(paramScore * 100) / 100,
      weight,
      indicatorCount: inGroup.filter(i => !i.excluded).length,
      excludedCount: inGroup.filter(i => i.excluded).length,
    };
  });

  // Overall = weighted average of parameter scores
  const totalWeight = parameterScores.reduce((s, p) => s + p.weight, 0);
  const overall = totalWeight > 0
    ? parameterScores.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight
    : 0;

  const normalizedScore = normalizeIQScore(overall);
  const indicatorsUsed = indicatorResults.filter(i => !i.excluded).length;
  const indicatorsExcluded = indicatorResults.filter(i => i.excluded).length;
  const scoringMethod = indicatorsUsed >= 20 ? 'full' : indicatorsUsed >= 12 ? 'partial' : 'estimated';

  const iqScore: IQScore = {
    overall: Math.round(overall * 100) / 100,
    normalizedScore,
    grade: calculateIQGrade(normalizedScore),
    parameterScores,
    indicators: indicatorResults,
    indicatorsUsed,
    indicatorsExcluded,
    scoringMethod,
    sector: sectorKey,
    calculatedAt: new Date(),
  };

  // ── Step 8: Persist to DB (fire-and-forget safe — never blocks return) ────
  void persistIQScore(userId, iqScore, supabase).catch(err =>
    console.error('[IQ Orchestrator] Persistence failed:', err)
  );

  return iqScore;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function persistIQScore(
  userId: string,
  score: IQScore,
  supabase: SupabaseClient
): Promise<void> {
  // Insert top-level IQ score row
  const paramScoreObj: Record<string, number> = {};
  for (const p of score.parameterScores) {
    paramScoreObj[`p${p.parameterId}`] = p.score;
  }

  const { data: savedScore, error: scoreError } = await supabase
    .from('iq_scores')
    .insert({
      user_id: userId,
      overall_score: score.overall,
      normalized_score: score.normalizedScore,
      parameter_scores: paramScoreObj,
      indicators_used: score.indicatorsUsed,
      indicators_excluded: score.indicatorsExcluded,
      scoring_method: score.scoringMethod,
      sector: score.sector,
      calculated_at: score.calculatedAt.toISOString(),
    })
    .select('id')
    .single();

  if (scoreError || !savedScore) {
    console.error('[IQ Orchestrator] Failed to save iq_scores row:', scoreError?.message);
    return;
  }

  const iqScoreId = savedScore.id;

  // Insert per-indicator rows in batches of 10
  const indicatorRows = score.indicators.map(ind => ({
    iq_score_id: iqScoreId,
    user_id: userId,
    indicator_code: ind.code,
    raw_score: ind.rawScore,
    confidence: ind.confidence,
    effective_score: ind.effectiveScore,
    data_source: ind.dataSource,
    raw_value: ind.rawValue,
    reasoning: ind.reasoning,
    evidence_citations: ind.evidenceCitations,
    consistency_flags: ind.consistencyFlags,
    calculated_at: score.calculatedAt.toISOString(),
  }));

  // Batch in groups of 10 to avoid payload limits
  for (let i = 0; i < indicatorRows.length; i += 10) {
    const batch = indicatorRows.slice(i, i + 10);
    const { error: batchError } = await supabase
      .from('iq_indicator_scores')
      .insert(batch);
    if (batchError) {
      console.error(`[IQ Orchestrator] Indicator batch ${i / 10 + 1} insert error:`, batchError.message);
    }
  }
}

// ─── Latest Score Loader ──────────────────────────────────────────────────────

export async function loadLatestIQScore(
  userId: string,
  supabase: SupabaseClient
): Promise<IQScore | null> {
  const { data: scoreRow, error: scoreError } = await supabase
    .from('iq_scores')
    .select('*')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (scoreError || !scoreRow) return null;

  const { data: indRows, error: indError } = await supabase
    .from('iq_indicator_scores')
    .select('*')
    .eq('iq_score_id', scoreRow.id)
    .order('indicator_code');

  if (indError) {
    console.warn('[IQ Orchestrator] Failed to load indicator scores:', indError.message);
    return null;
  }

  const indicators: IQIndicatorResult[] = (indRows ?? []).map((row) => ({
    code: String(row.indicator_code),
    name: String(row.indicator_code), // will be enriched by UI from config
    parameterId: Number(row.indicator_code.split('.')[0]),
    rawScore: row.raw_score != null ? Number(row.raw_score) : null,
    confidence: Number(row.confidence ?? 0),
    effectiveScore: Number(row.effective_score ?? 0),
    dataSource: (row.data_source ?? 'excluded') as DataSource,
    rawValue: row.raw_value != null ? Number(row.raw_value) : null,
    reasoning: String(row.reasoning ?? ''),
    evidenceCitations: (row.evidence_citations ?? []) as EvidenceCitation[],
    consistencyFlags: (row.consistency_flags ?? []) as ConsistencyFlag[],
    excluded: row.data_source === 'excluded',
  }));

  const paramScoreMap = (scoreRow.parameter_scores ?? {}) as Record<string, number>;
  const parameterScores: IQParameterScore[] = [1, 2, 3, 4, 5].map(pid => ({
    parameterId: pid,
    name: PARAMETER_NAMES[pid],
    score: paramScoreMap[`p${pid}`] ?? 0,
    weight: 0.20, // display weight (actual used in calculation)
    indicatorCount: indicators.filter(i => i.parameterId === pid && !i.excluded).length,
    excludedCount: indicators.filter(i => i.parameterId === pid && i.excluded).length,
  }));

  return {
    overall: Number(scoreRow.overall_score),
    normalizedScore: Number(scoreRow.normalized_score),
    grade: calculateIQGrade(Number(scoreRow.normalized_score)),
    parameterScores,
    indicators,
    indicatorsUsed: Number(scoreRow.indicators_used),
    indicatorsExcluded: Number(scoreRow.indicators_excluded),
    scoringMethod: (scoreRow.scoring_method ?? 'estimated') as 'full' | 'partial' | 'estimated',
    sector: String(scoreRow.sector ?? 'saas_b2b'),
    calculatedAt: new Date(scoreRow.calculated_at),
  };
}
