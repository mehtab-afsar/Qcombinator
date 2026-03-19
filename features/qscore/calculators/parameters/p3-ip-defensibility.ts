/**
 * P3 — IP / Defensibility (indicators 3.1–3.5)
 *
 * 3.1 IP Protection        — patent filed/granted (confidence 0.95 when verified)
 * 3.2 Technical Depth      — proprietary technology that takes time to replicate
 * 3.3 Know-How Density     — trade secrets / tacit knowledge held by the team
 * 3.4 Build Complexity     — why this is hard to build (talent, data, time)
 * 3.5 Replication Cost     — estimated cost for a funded competitor to copy
 *
 * Each indicator = 20 pts, total = 100 pts → normalised to 0-100 score.
 * Blended with existing product dimension: 55% existing + 45% P3.
 */

import { AssessmentData } from '../../types/qscore.types';

const TECH_DEPTH_SIGNALS =
  /\b(algorithm|model|neural|ml|ai|proprietary|patent|copyright|api|architecture|infrastructure|dataset|database|trained|custom|built.in.?house|first.party|real.?time|low.?latency|edge|embedded|hardware|chip|sensor|protocol|blockchain|zero.?knowledge|encryption|diffusion)\b/i;

const KNOW_HOW_SIGNALS =
  /\b(trade.?secret|tacit|experience|years|expertise|relationships|network|data|dataset|distribution|contract|exclusive|partnership|license|certification|regulatory.?approval|fda|iso|compliance)\b/i;

const BUILD_COMPLEXITY_SIGNALS =
  /\b(hard.?to.?replicate|difficult|complex|regulatory|compliance|scale|data.?network|cold.?start|two.?sided|marketplace|integration|enterprise|certification|years.?to.?build|require.?team|require.?data)\b/i;

export function scoreP3IPDefensibility(
  data: AssessmentData
): { score: number; rawPoints: number; maxPoints: number; sub: Record<string, number> } {
  const p3 = data.p3 ?? {};
  let points = 0;
  const sub: Record<string, number> = {};

  // ── 3.1 IP Protection ────────────────────────────────────────────────────
  let ipPts = 0;
  const patentDesc = p3.patentDescription ?? '';
  if (p3.hasPatent === true) {
    if (patentDesc.length >= 50) ipPts = 20; // patent + description
    else ipPts = 18; // patent claimed, no detail
  } else if (patentDesc.length >= 50) {
    ipPts = 12; // describes IP without formal filing
  } else if (data.advantageExplanation?.toLowerCase().includes('patent')) {
    ipPts = 10; // mentioned in advantage explanation
  } else {
    ipPts = 4; // no IP — still could have other moats
  }
  points += ipPts;
  sub['3.1_ip_protection'] = ipPts;

  // ── 3.2 Technical Depth ───────────────────────────────────────────────────
  let techPts = 0;
  const techText = p3.technicalDepth ?? data.advantageExplanation ?? '';
  const hasTechSignal = TECH_DEPTH_SIGNALS.test(techText);
  const isDetailed = techText.length >= 120;
  const isModeratelyDetailed = techText.length >= 60;
  if (hasTechSignal && isDetailed) techPts = 20;
  else if (hasTechSignal && isModeratelyDetailed) techPts = 15;
  else if (hasTechSignal) techPts = 10;
  else if (isModeratelyDetailed) techPts = 6;
  else if (techText.length > 0) techPts = 3;
  points += techPts;
  sub['3.2_technical_depth'] = techPts;

  // ── 3.3 Know-How Density ─────────────────────────────────────────────────
  let knowHowPts = 0;
  const knowText = p3.knowHowDensity ?? data.problemStory ?? '';
  const hasKnowHow = KNOW_HOW_SIGNALS.test(knowText);
  const isLong = knowText.length >= 150;
  const isSpecific = /\b(\d+\s*years|\d+\s*clients|\d+\s*integrations|\d+\s*customers|enterprise.?grade|production.?ready)\b/i.test(knowText);
  if (hasKnowHow && isSpecific && isLong) knowHowPts = 20;
  else if (hasKnowHow && (isSpecific || isLong)) knowHowPts = 15;
  else if (hasKnowHow) knowHowPts = 10;
  else if (isLong) knowHowPts = 5;
  points += knowHowPts;
  sub['3.3_know_how_density'] = knowHowPts;

  // ── 3.4 Build Complexity ──────────────────────────────────────────────────
  let complexityPts = 0;
  const complexText = p3.buildComplexity ?? data.advantageExplanation ?? '';
  const isComplex = BUILD_COMPLEXITY_SIGNALS.test(complexText);
  const isExplained = complexText.length >= 100;
  const hasMultipleMoats = (
    BUILD_COMPLEXITY_SIGNALS.test(complexText) &&
    KNOW_HOW_SIGNALS.test(complexText) &&
    TECH_DEPTH_SIGNALS.test(complexText)
  );
  if (hasMultipleMoats && isExplained) complexityPts = 20;
  else if (isComplex && isExplained) complexityPts = 15;
  else if (isComplex) complexityPts = 10;
  else if (isExplained) complexityPts = 5;
  else complexityPts = 2;
  points += complexityPts;
  sub['3.4_build_complexity'] = complexityPts;

  // ── 3.5 Replication Cost ──────────────────────────────────────────────────
  // High cost to replicate = high defensibility. Calibrated against team size and build time.
  let replicationPts = 0;
  const repCost = p3.replicationCostUsd;
  if (repCost !== undefined) {
    if (repCost >= 10_000_000) replicationPts = 20;      // $10M+ to replicate
    else if (repCost >= 2_000_000) replicationPts = 16;  // $2M-10M
    else if (repCost >= 500_000) replicationPts = 12;    // $500K-2M
    else if (repCost >= 100_000) replicationPts = 8;     // $100K-500K
    else replicationPts = 4;
  } else {
    // Infer from build complexity + technical depth
    const inferred = techPts + complexityPts;
    replicationPts = Math.min(16, Math.round(inferred * 0.5));
  }
  points += replicationPts;
  sub['3.5_replication_cost'] = replicationPts;

  const maxPoints = 100;
  const raw = Math.max(0, Math.min(100, Math.round((points / maxPoints) * 100)));
  return { score: raw, rawPoints: points, maxPoints, sub };
}
