/**
 * P4 — Founder / Team (indicators 4.1–4.5)
 *
 * 4.1 Domain Depth         — years of relevant domain experience
 * 4.2 Founder-Market Fit   — narrative evidence of unique insight into this market
 * 4.3 Prior Experience     — prior exits, companies built, or operator background
 * 4.4 Leadership Coverage  — functional coverage across key CXO roles
 * 4.5 Team Cohesion        — months the core team has worked together
 *
 * Each indicator = 20 pts, total = 100 pts → normalised to 0-100 score.
 * Blended with existing team dimension: 55% existing + 45% P4.
 */

import { AssessmentData } from '../../types/qscore.types';

// Functions covered by leadership (from teamCoverage array)
const KEY_FUNCTIONS = ['tech', 'product', 'sales', 'marketing', 'finance', 'ops', 'design', 'data'];

const INSIDER_FIT_SIGNALS =
  /\b(i.?ve|i have|i was|i worked|i built|i ran|i led|i founded|i managed|previously|before this|last company|former|ex.?|background in|spent \d+ years|lived this|personal experience|saw this firsthand)\b/i;

const PRIOR_EXP_SIGNALS =
  /\b(exited|acquired|sold|ipo|founded|built|scaled|raised|series|led|managed|operator|executive|director|vp|chief|head of)\b/i;

export function scoreP4FounderTeam(
  data: AssessmentData
): { score: number; rawPoints: number; maxPoints: number; sub: Record<string, number> } {
  const p4 = data.p4 ?? {};
  let points = 0;
  const sub: Record<string, number> = {};

  // ── 4.1 Domain Depth ──────────────────────────────────────────────────────
  let domainPts = 0;
  const domainYears = p4.domainYears;
  if (domainYears !== undefined) {
    if (domainYears >= 10) domainPts = 20;
    else if (domainYears >= 7) domainPts = 17;
    else if (domainYears >= 5) domainPts = 14;
    else if (domainYears >= 3) domainPts = 10;
    else if (domainYears >= 1) domainPts = 6;
    else domainPts = 3;
  } else {
    // Infer from text if no explicit years provided
    const originText = data.problemStory ?? '';
    const yearMatch = originText.match(/(\d+)\s*year/i);
    if (yearMatch) {
      const inferred = parseInt(yearMatch[1]);
      if (inferred >= 10) domainPts = 18;
      else if (inferred >= 5) domainPts = 13;
      else if (inferred >= 3) domainPts = 9;
      else domainPts = 5;
    } else if (originText.length >= 150 && INSIDER_FIT_SIGNALS.test(originText)) {
      domainPts = 8;
    } else {
      domainPts = 3;
    }
  }
  points += domainPts;
  sub['4.1_domain_depth'] = domainPts;

  // ── 4.2 Founder-Market Fit ────────────────────────────────────────────────
  let fmfPts = 0;
  const fmfText = p4.founderMarketFit ?? data.problemStory ?? '';
  const hasInsiderFit = INSIDER_FIT_SIGNALS.test(fmfText);
  const isPersonal = /\b(personal|myself|family|friend|colleague|team|we all)\b/i.test(fmfText);
  const isSpecific = fmfText.length >= 150;
  const hasConcreteDetail = /\$[\d,]+|\d+\s*(months|years|customers|users|companies)|[A-Z][a-z]+\s+(?:Inc|Corp|LLC|Ltd|company)/.test(fmfText);
  if (hasInsiderFit && isPersonal && isSpecific && hasConcreteDetail) fmfPts = 20;
  else if (hasInsiderFit && (isPersonal || isSpecific) && isSpecific) fmfPts = 16;
  else if (hasInsiderFit && isSpecific) fmfPts = 12;
  else if (hasInsiderFit) fmfPts = 8;
  else if (isSpecific) fmfPts = 5;
  else fmfPts = 2;
  points += fmfPts;
  sub['4.2_founder_market_fit'] = fmfPts;

  // ── 4.3 Prior Experience ──────────────────────────────────────────────────
  let priorPts = 0;
  const priorExits = p4.priorExits;
  if (priorExits !== undefined) {
    if (priorExits >= 2) priorPts = 20;
    else if (priorExits === 1) priorPts = 16;
    else priorPts = 8; // 0 exits but explicit — first-time founder
  } else {
    // Infer from text
    const expText = (data.advantageExplanation ?? '') + ' ' + (data.problemStory ?? '');
    const hasExp = PRIOR_EXP_SIGNALS.test(expText);
    const hasSeniorRole = /\b(ceo|cto|cfo|vp|director|head of|chief|partner|investor|board)\b/i.test(expText);
    if (hasExp && hasSeniorRole) priorPts = 14;
    else if (hasExp) priorPts = 10;
    else priorPts = 5;
  }
  points += priorPts;
  sub['4.3_prior_experience'] = priorPts;

  // ── 4.4 Leadership Coverage ────────────────────────────────────────────────
  // Reward teams that have named coverage across key functions
  let coveragePts = 0;
  const coverage = p4.teamCoverage ?? [];
  const normalised = coverage.map(c => c.toLowerCase());
  const coveredCount = KEY_FUNCTIONS.filter(fn =>
    normalised.some(c => c.includes(fn))
  ).length;
  // Also scan advantage text for inferred coverage
  const advText = (data.advantageExplanation ?? '').toLowerCase();
  const inferredCount = KEY_FUNCTIONS.filter(fn => advText.includes(fn)).length;
  const effective = Math.max(coveredCount, inferredCount);
  if (effective >= 4) coveragePts = 20;
  else if (effective >= 3) coveragePts = 16;
  else if (effective >= 2) coveragePts = 12;
  else if (effective >= 1) coveragePts = 7;
  else coveragePts = 3;
  points += coveragePts;
  sub['4.4_leadership_coverage'] = coveragePts;

  // ── 4.5 Team Cohesion ─────────────────────────────────────────────────────
  let cohesionPts = 0;
  const cohesionMonths = p4.teamCohesionMonths;
  if (cohesionMonths !== undefined) {
    if (cohesionMonths >= 24) cohesionPts = 20;       // 2+ years together
    else if (cohesionMonths >= 12) cohesionPts = 16;  // 1 year
    else if (cohesionMonths >= 6) cohesionPts = 12;   // 6 months
    else if (cohesionMonths >= 3) cohesionPts = 8;    // 3 months
    else cohesionPts = 4;
  } else {
    // Infer from "we've been working together" type phrases
    const cohText = data.problemStory ?? '';
    if (/\b(co.?founder|founding team|built together|together for|known each other)\b/i.test(cohText)) {
      cohesionPts = 10;
    } else {
      cohesionPts = 5; // solo or unspecified
    }
  }
  points += cohesionPts;
  sub['4.5_team_cohesion'] = cohesionPts;

  const maxPoints = 100;
  const raw = Math.max(0, Math.min(100, Math.round((points / maxPoints) * 100)));
  return { score: raw, rawPoints: points, maxPoints, sub };
}
