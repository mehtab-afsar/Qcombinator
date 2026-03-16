/**
 * Data Resolver
 *
 * For each of the 25 indicators, picks the HIGHEST-CONFIDENCE data source
 * available for this specific founder. Priority order is per-indicator —
 * Stripe-verified > artifact > self-reported > AI estimated > excluded.
 *
 * Returns: { value, source, rawData } per indicator code.
 * Never throws — returns source='excluded' if no data found.
 */

import { DataSource, ResolvedIndicatorData } from '../types/iq.types';
import { AssessmentData } from '@/features/qscore/types/qscore.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArtifactBundle {
  financial?: Record<string, unknown> | null;   // Felix financial_summary content
  hiring?: Record<string, unknown> | null;      // Harper hiring_plan content
  competitive?: Record<string, unknown> | null; // Atlas competitive_matrix content
}

export interface StripeMetrics {
  mrr: number;
  arr: number;
  customerCount: number;
  lastMonthRevenue?: number;
}

export interface FounderProfile {
  companyFoundedYear?: number;
  sector?: string;
  stage?: string;
}

export interface ResolverContext {
  assessment: AssessmentData;
  artifacts: ArtifactBundle;
  stripe?: StripeMetrics | null;
  profile?: FounderProfile | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isFinite(n) && n >= 0 ? n : null;
}

function companyAgeYears(profile?: FounderProfile | null): number {
  if (!profile?.companyFoundedYear) return 1; // default 1 year if unknown
  const age = new Date().getFullYear() - profile.companyFoundedYear;
  return Math.max(0.5, age); // minimum 6 months
}

function safeGet(obj: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!obj) return undefined;
  return obj[key];
}

// ─── Per-Indicator Resolvers ──────────────────────────────────────────────────

type Resolver = (ctx: ResolverContext) => ResolvedIndicatorData;

const RESOLVERS: Record<string, Resolver> = {

  // ── 1.1 Revenue Intensity: ARR ÷ company age ─────────────────────────────
  '1.1': (ctx) => {
    const ageYears = companyAgeYears(ctx.profile);
    // Stripe: highest confidence
    if (ctx.stripe?.arr) {
      return { value: ctx.stripe.arr / ageYears, source: 'stripe_api', rawData: { arr: ctx.stripe.arr, ageYears } };
    }
    // Felix artifact
    const felixArr = num(safeGet(ctx.artifacts.financial as Record<string, unknown>, 'arr'))
      ?? num(safeGet(ctx.artifacts.financial as Record<string, unknown>, 'mrr')) !== null
        ? (num(safeGet(ctx.artifacts.financial as Record<string, unknown>, 'mrr')) ?? 0) * 12
        : null;
    if (felixArr !== null) {
      return { value: felixArr / ageYears, source: 'felix_artifact', rawData: { arr: felixArr, ageYears } };
    }
    // Assessment
    const assessArr = num(ctx.assessment.financial?.arr)
      ?? ((num(ctx.assessment.financial?.mrr) ?? 0) * 12);
    if (assessArr > 0) {
      return { value: assessArr / ageYears, source: 'self_reported', rawData: { arr: assessArr, ageYears } };
    }
    return { value: null, source: 'excluded', missingReason: 'No revenue data available' };
  },

  // ── 1.2 Revenue Growth Velocity: YoY % ───────────────────────────────────
  '1.2': (ctx) => {
    // Felix artifact with snapshot data
    const fin = ctx.artifacts.financial as Record<string, unknown> | null;
    const currentArr = num(safeGet(fin, 'arr')) ?? ((num(safeGet(fin, 'mrr')) ?? 0) * 12);
    const prevArr = num(safeGet(fin, 'arr_prev_year'));
    if (currentArr > 0 && prevArr != null && prevArr > 0) {
      const growth = ((currentArr - prevArr) / prevArr) * 100;
      return { value: growth, source: 'felix_artifact', rawData: { currentArr, prevArr } };
    }
    // Self-reported growth rate from assessment
    const projGrowth = num(ctx.assessment.financial?.projectedRevenue12mo);
    const currentMrr = num(ctx.assessment.financial?.mrr);
    if (projGrowth && currentMrr && currentMrr > 0) {
      const impliedGrowth = ((projGrowth - currentMrr * 12) / (currentMrr * 12)) * 100;
      return { value: impliedGrowth, source: 'self_reported', rawData: { projGrowth, currentMrr } };
    }
    return { value: null, source: 'excluded', missingReason: 'No comparative revenue periods available' };
  },

  // ── 1.3 Revenue Quality Ratio: MRR ÷ total revenue ───────────────────────
  '1.3': (ctx) => {
    const fin = ctx.artifacts.financial as Record<string, unknown> | null;
    const mrr = num(safeGet(fin, 'mrr')) ?? num(ctx.assessment.financial?.mrr);
    const arr = num(safeGet(fin, 'arr')) ?? ((mrr ?? 0) * 12);
    if (mrr && arr && arr > 0) {
      const ratio = (mrr * 12) / arr;
      const source: DataSource = fin ? 'felix_artifact' : 'self_reported';
      return { value: ratio, source, rawData: { mrr, arr } };
    }
    return { value: null, source: 'excluded', missingReason: 'Insufficient revenue data for quality ratio' };
  },

  // ── 1.4 Customer Concentration: top client % ─────────────────────────────
  '1.4': (ctx) => {
    const fin = ctx.artifacts.financial as Record<string, unknown> | null;
    const topClientPct = num(safeGet(fin, 'top_client_revenue_pct'))
      ?? num(safeGet(fin, 'topClientPct'));
    if (topClientPct !== null) {
      return { value: topClientPct, source: 'felix_artifact', rawData: { topClientPct } };
    }
    // Assessment doesn't collect this explicitly — mark as estimated
    // If only 1–2 customers, assume high concentration
    const convCount = num(ctx.assessment.conversationCount);
    if (convCount !== null && convCount <= 3) {
      return { value: 0.90, source: 'self_reported', rawData: { convCount }, missingReason: 'Inferred from very low customer count' };
    }
    return { value: null, source: 'excluded', missingReason: 'Customer revenue breakdown not available' };
  },

  // ── 1.5 Paying Customer Density: customers ÷ age ─────────────────────────
  '1.5': (ctx) => {
    const ageYears = companyAgeYears(ctx.profile);
    const payingCount = num(safeGet(ctx.artifacts.financial as Record<string, unknown>, 'paying_customers'))
      ?? ctx.stripe?.customerCount
      ?? null;
    if (payingCount !== null) {
      const source: DataSource = ctx.stripe ? 'stripe_api' : 'felix_artifact';
      return { value: payingCount / ageYears, source, rawData: { payingCount, ageYears } };
    }
    // Infer from conversation count (proxy — not paying customers)
    const convCount = num(ctx.assessment.conversationCount);
    if (convCount && convCount > 0) {
      return { value: convCount / ageYears, source: 'self_reported', rawData: { convCount, ageYears } };
    }
    return { value: null, source: 'excluded', missingReason: 'No paying customer data' };
  },

  // ── 2.1 SAM — AI reconciled (resolved as raw claim; AI reconciler scores it)
  '2.1': (ctx) => {
    const tam = num(ctx.assessment.targetCustomers) && num(ctx.assessment.lifetimeValue)
      ? (ctx.assessment.targetCustomers ?? 0) * (ctx.assessment.lifetimeValue ?? 0)
      : null;
    // Return raw founder claim — AI reconciler will ground it with Tavily
    if (tam !== null) {
      return { value: tam, source: 'ai_reconciled_grounded', rawData: { tam, sector: ctx.profile?.sector } };
    }
    return { value: null, source: 'ai_reconciled_estimated', rawData: { sector: ctx.profile?.sector } };
  },

  // ── 2.2 Gross Margin ─────────────────────────────────────────────────────
  '2.2': (ctx) => {
    const fin = ctx.artifacts.financial as Record<string, unknown> | null;
    // Felix artifact
    const gmStr = safeGet(fin, 'gross_margin') ?? safeGet(fin, 'grossMargin');
    const gm = typeof gmStr === 'string'
      ? parseFloat(gmStr.replace('%', '')) / 100
      : num(gmStr);
    if (gm !== null && gm >= 0 && gm <= 1) {
      return { value: gm, source: 'felix_artifact', rawData: { gm } };
    }
    // Assessment: derive from COGS
    const mrr = num(ctx.assessment.financial?.mrr);
    const cogs = num(ctx.assessment.financial?.cogs);
    const ads = num(ctx.assessment.financial?.averageDealSize);
    if (mrr && cogs && ads && ads > 0) {
      const grossMargin = (ads - cogs) / ads;
      return { value: grossMargin, source: 'self_reported', rawData: { mrr, cogs, ads } };
    }
    return { value: null, source: 'excluded', missingReason: 'No margin data available' };
  },

  // ── 2.3 LTV/CAC ──────────────────────────────────────────────────────────
  '2.3': (ctx) => {
    const ltv = num(ctx.assessment.lifetimeValue);
    const cac = num(ctx.assessment.costPerAcquisition);
    if (ltv && cac && cac > 0) {
      const ratio = ltv / cac;
      // If corroborated by Felix, higher confidence
      const source: DataSource = ctx.artifacts.financial ? 'self_report_verified' : 'self_reported';
      return { value: ratio, source, rawData: { ltv, cac } };
    }
    return { value: null, source: 'excluded', missingReason: 'LTV or CAC not provided' };
  },

  // ── 2.4 Operating Leverage ────────────────────────────────────────────────
  '2.4': (ctx) => {
    const fin = ctx.artifacts.financial as Record<string, unknown> | null;
    const leverage = num(safeGet(fin, 'operating_leverage'));
    if (leverage !== null) {
      return { value: leverage, source: 'felix_artifact', rawData: { leverage } };
    }
    // Can't derive without two periods — exclude
    return { value: null, source: 'excluded', missingReason: 'Requires two revenue periods — build Felix financial summary' };
  },

  // ── 2.5 Competitive Density — AI reconciled ───────────────────────────────
  '2.5': (ctx) => {
    const comp = ctx.artifacts.competitive as Record<string, unknown> | null;
    const competitors = safeGet(comp, 'competitors');
    const count = Array.isArray(competitors) ? competitors.length : null;
    if (count !== null) {
      return { value: count, source: 'ai_reconciled_grounded', rawData: { count, hasAtlasArtifact: true } };
    }
    return { value: null, source: 'ai_reconciled_estimated', rawData: { sector: ctx.profile?.sector } };
  },

  // ── 3.1 Registered IP — self-reported (patent DB future) ─────────────────
  '3.1': (ctx) => {
    // Assessment doesn't collect this — look in advantages array for IP signals
    const advantages = ctx.assessment.advantages ?? [];
    const ipSignals = advantages.filter(a =>
      /patent|patent.filed|ip|intellectual property|trademark|trade secret/i.test(a)
    ).length;
    if (ipSignals > 0) {
      return { value: ipSignals, source: 'self_reported', rawData: { ipSignals } };
    }
    const story = (ctx.assessment.advantageExplanation ?? '').toLowerCase();
    if (/patent|filed|granted|trademark/i.test(story)) {
      return { value: 1, source: 'self_reported', rawData: { inferred: true } };
    }
    return { value: 0, source: 'self_reported', rawData: { ipSignals: 0 } };
  },

  // ── 3.2 R&D Intensity ─────────────────────────────────────────────────────
  '3.2': (ctx) => {
    const fin = ctx.artifacts.financial as Record<string, unknown> | null;
    const rdPct = num(safeGet(fin, 'rd_intensity')) ?? num(safeGet(fin, 'rdIntensity'));
    if (rdPct !== null) {
      return { value: rdPct, source: 'felix_artifact', rawData: { rdPct } };
    }
    // Infer: if majority of team is engineers, R&D intensity likely high
    const hire = ctx.artifacts.hiring as Record<string, unknown> | null;
    const engPct = num(safeGet(hire, 'engineering_pct'));
    if (engPct !== null) {
      const estimated = engPct * 0.6; // engineers × 60% as proxy
      return { value: estimated, source: 'self_reported', rawData: { engPct, estimated } };
    }
    return { value: null, source: 'excluded', missingReason: 'No R&D spend data' };
  },

  // ── 3.3 Technical Team Density ───────────────────────────────────────────
  '3.3': (ctx) => {
    const hire = ctx.artifacts.hiring as Record<string, unknown> | null;
    if (hire) {
      const nextHires = safeGet(hire, 'nextHires');
      const currentTeam = safeGet(hire, 'currentTeam');
      const arr = Array.isArray(nextHires) ? nextHires : [];
      const techCount = arr.filter((r: unknown) =>
        typeof r === 'object' && r !== null &&
        /engineer|developer|tech|cto|backend|frontend|ml|data/i.test(
          String((r as Record<string,unknown>).role ?? '')
        )
      ).length;
      const total = arr.length + (typeof currentTeam === 'object' && currentTeam !== null
        ? Object.keys(currentTeam).length : 0);
      if (total > 0) {
        return { value: techCount / total, source: 'harper_artifact', rawData: { techCount, total } };
      }
    }
    // Infer from assessment team clues
    const hasTechCofounder = /cto|engineer|developer|technical/i.test(
      ctx.assessment.advantageExplanation ?? ''
    );
    return { value: hasTechCofounder ? 0.50 : 0.20, source: 'self_reported', rawData: { inferred: true } };
  },

  // ── 3.4 Core Technology Development Time ─────────────────────────────────
  '3.4': (ctx) => {
    const buildTime = num(ctx.assessment.buildTime);
    if (buildTime !== null) {
      // buildTime in assessment is in days — convert to months
      const months = buildTime / 30;
      return { value: months, source: 'self_reported', rawData: { buildTimeDays: buildTime, months } };
    }
    return { value: null, source: 'excluded', missingReason: 'Build time not reported in assessment' };
  },

  // ── 3.5 Replication Cost — AI reconciled ─────────────────────────────────
  '3.5': (ctx) => {
    // Provide all available context for AI reconciler
    const hire = ctx.artifacts.hiring as Record<string, unknown> | null;
    const teamSize = num(safeGet(hire, 'teamSize'));
    const buildTimeDays = num(ctx.assessment.buildTime);
    const burn = num(ctx.assessment.financial?.monthlyBurn);
    return {
      value: null, // AI reconciler derives this
      source: 'ai_reconciled_grounded',
      rawData: {
        productDescription: ctx.assessment.advantageExplanation,
        teamSize,
        buildTimeMonths: buildTimeDays ? buildTimeDays / 30 : null,
        monthlyBurn: burn,
        advantages: ctx.assessment.advantages,
      },
    };
  },

  // ── 4.1 Founder Domain Depth ──────────────────────────────────────────────
  '4.1': (ctx) => {
    // Extract years from problemStory via keyword matching
    const story = ctx.assessment.problemStory ?? '';
    const yearMatch = story.match(/(\d+)\s*(?:\+\s*)?years?/i);
    if (yearMatch) {
      return { value: parseInt(yearMatch[1]), source: 'self_reported', rawData: { extracted: yearMatch[0] } };
    }
    // Heuristic: long, personal story = likely 5+ years exposure
    if (story.length > 300) {
      return { value: 5, source: 'self_reported', rawData: { inferred: true, storyLength: story.length } };
    }
    if (story.length > 150) {
      return { value: 3, source: 'self_reported', rawData: { inferred: true, storyLength: story.length } };
    }
    return { value: 1, source: 'self_reported', rawData: { inferred: true, storyLength: story.length } };
  },

  // ── 4.2 Founder-Market Alignment (5 signals) ──────────────────────────────
  '4.2': (ctx) => {
    let signals = 0;
    const story = (ctx.assessment.problemStory ?? '').toLowerCase();
    const adv = (ctx.assessment.advantageExplanation ?? '').toLowerCase();
    const combined = story + ' ' + adv;
    // Signal 1: lived the pain (personal experience language)
    if (/i experienced|i faced|i struggled|as a|when i was|i worked/i.test(combined)) signals++;
    // Signal 2: domain expert (years / expertise language)
    if (/years? (of )?experience|expert|specialist|background in|worked (at|for|in)/i.test(combined)) signals++;
    // Signal 3: industry network
    if (/connection|network|relationship|know the|worked with|partner|advisor/i.test(combined)) signals++;
    // Signal 4: prior customers in this space
    if (ctx.assessment.customerList && ctx.assessment.customerList.length > 0) signals++;
    // Signal 5: regulatory/IP/structural advantage
    if (/patent|regulation|compliance|license|certification|government/i.test(combined)) signals++;
    return { value: signals, source: 'self_reported', rawData: { signals } };
  },

  // ── 4.3 Prior Founding Experience ────────────────────────────────────────
  '4.3': (ctx) => {
    const story = (ctx.assessment.problemStory ?? '').toLowerCase();
    const adv = (ctx.assessment.advantageExplanation ?? '').toLowerCase();
    const combined = story + ' ' + adv;
    // Look for signals of prior ventures
    let ventures = 0;
    const priorMatches = combined.match(/(?:previously|before|founded|co-founded|built|started|ran|exited|acquired)/gi);
    if (priorMatches) ventures = Math.min(3, Math.floor(priorMatches.length / 2));
    return { value: ventures, source: 'self_reported', rawData: { ventures } };
  },

  // ── 4.4 Technical Leadership ─────────────────────────────────────────────
  '4.4': (ctx) => {
    const hire = ctx.artifacts.hiring as Record<string, unknown> | null;
    if (hire) {
      const current = safeGet(hire, 'currentTeam');
      if (typeof current === 'object' && current !== null) {
        const hasCTO = Object.values(current).some((v: unknown) =>
          /cto|chief tech|technical co|vp eng|head of eng/i.test(String(v))
        );
        return { value: hasCTO ? 1.0 : 0.5, source: 'harper_artifact', rawData: { hasCTO } };
      }
    }
    const adv = (ctx.assessment.advantageExplanation ?? '').toLowerCase();
    const hasTech = /cto|technical co.?founder|engineer.{0,20}founder|developer.{0,20}founder/i.test(adv);
    return { value: hasTech ? 1.0 : 0.25, source: 'self_reported', rawData: { inferred: true } };
  },

  // ── 4.5 Team Stability ────────────────────────────────────────────────────
  '4.5': (ctx) => {
    const hire = ctx.artifacts.hiring as Record<string, unknown> | null;
    const retention = num(safeGet(hire, 'retention_rate') ?? safeGet(hire, 'retentionRate'));
    if (retention !== null) {
      return { value: retention, source: 'harper_artifact', rawData: { retention } };
    }
    // Default: stable if small team (solo or 2-person = by definition stable)
    const teamSize = num(safeGet(hire, 'teamSize'));
    if (teamSize !== null && teamSize <= 2) {
      return { value: 0.90, source: 'self_reported', rawData: { teamSize, assumption: 'small team assumed stable' } };
    }
    return { value: 0.70, source: 'self_reported', rawData: { assumed: true } };
  },

  // ── 5.1 Carbon Intensity Reduction ───────────────────────────────────────
  '5.1': (ctx) => {
    const story = (ctx.assessment.problemStory ?? '') + (ctx.assessment.advantageExplanation ?? '');
    const hasClimate = /carbon|emission|co2|climate|green|sustainab|net.?zero|renewable/i.test(story);
    if (!hasClimate) {
      return { value: 0, source: 'self_reported', rawData: { climateMentioned: false } };
    }
    // Self-reported — AI sanity check triggered if claim > 50% reduction
    return {
      value: null,
      source: 'ai_reconciled_grounded',
      rawData: { climateRelevant: true, story: story.slice(0, 500) },
    };
  },

  // ── 5.2 Resource Efficiency ───────────────────────────────────────────────
  '5.2': (ctx) => {
    const story = (ctx.assessment.advantageExplanation ?? '').toLowerCase();
    const hasEfficiency = /efficient|waste|optimiz|reduce|resource|less (energy|water|material)/i.test(story);
    return {
      value: hasEfficiency ? 1.20 : 0.90,
      source: 'self_reported',
      rawData: { inferred: true, hasEfficiencyLanguage: hasEfficiency },
    };
  },

  // ── 5.3 SDG Breadth — AI reconciled ──────────────────────────────────────
  '5.3': (ctx) => {
    return {
      value: null,
      source: 'ai_reconciled_grounded',
      rawData: {
        productDescription: ctx.assessment.advantageExplanation,
        problemStory: ctx.assessment.problemStory,
        sector: ctx.profile?.sector,
      },
    };
  },

  // ── 5.4 SDG Revenue Share ─────────────────────────────────────────────────
  '5.4': (ctx) => {
    const story = (ctx.assessment.problemStory ?? '') + (ctx.assessment.advantageExplanation ?? '');
    const hasSocialMission = /sdg|impact|mission|social|community|health|education|poverty|water|hunger/i.test(story);
    if (!hasSocialMission) {
      return { value: 0, source: 'self_reported', rawData: { sdgMentioned: false } };
    }
    return { value: 0.30, source: 'self_reported', rawData: { inferred: true } };
  },

  // ── 5.5 Viksit Bharat 2047 — AI reconciled ───────────────────────────────
  '5.5': (ctx) => {
    return {
      value: null,
      source: 'ai_reconciled_grounded',
      rawData: {
        productDescription: ctx.assessment.advantageExplanation,
        problemStory: ctx.assessment.problemStory,
        sector: ctx.profile?.sector,
      },
    };
  },
};

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Resolve data for all 25 indicators.
 * Returns a map of indicator code → resolved data.
 * Never throws — missing data returns source='excluded'.
 */
export function resolveAllIndicators(ctx: ResolverContext): Map<string, ResolvedIndicatorData> {
  const results = new Map<string, ResolvedIndicatorData>();

  for (const [code, resolver] of Object.entries(RESOLVERS)) {
    try {
      results.set(code, resolver(ctx));
    } catch (err) {
      console.warn(`[IQ] Data resolver failed for ${code}:`, err);
      results.set(code, {
        value: null,
        source: 'excluded',
        missingReason: `Resolver error: ${err instanceof Error ? err.message : 'unknown'}`,
      });
    }
  }

  return results;
}

export function resolveIndicator(code: string, ctx: ResolverContext): ResolvedIndicatorData {
  const resolver = RESOLVERS[code];
  if (!resolver) {
    return { value: null, source: 'excluded', missingReason: `No resolver for indicator ${code}` };
  }
  try {
    return resolver(ctx);
  } catch (err) {
    return { value: null, source: 'excluded', missingReason: `Resolver error: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}
