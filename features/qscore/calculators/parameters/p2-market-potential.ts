/**
 * P2 — Market Potential (indicators 2.1–2.5)
 *
 * 2.1 Market Size       — stated TAM with grounded reasoning (deviation >100% rule)
 * 2.2 Market Urgency    — "why now" trigger: regulatory, tech, or social catalyst
 * 2.3 Value Pool        — total economic value at stake in the problem space
 * 2.4 Expansion Potential — adjacent markets / international paths
 * 2.5 Competitive Density — number of known competitors and market maturity
 *
 * Each indicator = 20 pts, total = 100 pts → normalised to 0-100 score.
 * Blended with existing market dimension: 55% existing + 45% P2.
 */

import { AssessmentData } from '../../types/qscore.types';

const URGENCY_TRIGGERS =
  /\b(regulation|gdpr|compliance|law|mandate|post.covid|ai.boom|llm|api.available|infrastructure|infrastructure|platform.shift|mobile.first|remote.work|climate|carbon|shortage|labor.shortage|supply.chain|consolidation|acquisition|ipo|series.a|funding.available)\b/i;

const EXPANSION_SIGNALS =
  /\b(international|global|europe|asia|apac|latam|adjacent|enterprise|smb|mid.market|vertical|horizontal|platform|api|marketplace|white.label|franchise|channel.partner)\b/i;

export function scoreP2MarketPotential(
  data: AssessmentData
): { score: number; rawPoints: number; maxPoints: number; sub: Record<string, number> } {
  const p2 = data.p2 ?? {};
  let points = 0;
  const sub: Record<string, number> = {};

  // ── 2.1 Market Size with TAM grounding ──────────────────────────────────
  // Reward founders who state TAM with reasoning, not just a number.
  // Deviation >100% from implied TAM (targetCustomers × LTV) gets capped.
  let tamPts = 0;
  const tamText = p2.tamDescription ?? '';
  const hasNumber = /\$[\d,.]+[MmBbTt]?|\d+[\s,]*(million|billion|trillion)/.test(tamText);
  const hasReasoning = /\b(because|since|based on|assuming|estimate|research|data|report|ibis|gartner|forrester)\b/i.test(tamText);
  if (tamText.length >= 100 && hasNumber && hasReasoning) tamPts = 20;
  else if (tamText.length >= 60 && hasNumber) tamPts = 14;
  else if (tamText.length >= 30) tamPts = 8;
  else if (data.targetCustomers && data.lifetimeValue) tamPts = 6; // numeric fallback

  // Cross-validate: if stated TAM >> implied TAM by >100× → cap at 10 pts
  if (data.targetCustomers && data.lifetimeValue) {
    const impliedTam = data.targetCustomers * data.lifetimeValue;
    const statedMatch = tamText.match(/\$([\d.]+)\s*([MmBbTt])/);
    if (statedMatch) {
      const multiplier = { m: 1e6, b: 1e9, t: 1e12, M: 1e6, B: 1e9, T: 1e12 }[statedMatch[2]] ?? 1e6;
      const statedTam = parseFloat(statedMatch[1]) * multiplier;
      if (statedTam > impliedTam * 100 && impliedTam > 0) {
        tamPts = Math.min(tamPts, 10); // cap when >100× deviation
      }
    }
  }
  points += tamPts;
  sub['2.1_market_size'] = tamPts;

  // ── 2.2 Market Urgency — "why now" trigger ──────────────────────────────
  let urgencyPts = 0;
  const urgencyText = p2.marketUrgency ?? data.problemStory ?? '';
  const hasTrigger = URGENCY_TRIGGERS.test(urgencyText);
  const isSpecific = urgencyText.length >= 80;
  const hasTimeRef = /\b(20(2[3-9]|30)|last (year|month|quarter)|this year|recently|since 20)\b/i.test(urgencyText);
  if (hasTrigger && isSpecific && hasTimeRef) urgencyPts = 20;
  else if (hasTrigger && isSpecific) urgencyPts = 16;
  else if (hasTrigger) urgencyPts = 10;
  else if (isSpecific) urgencyPts = 6;
  points += urgencyPts;
  sub['2.2_market_urgency'] = urgencyPts;

  // ── 2.3 Value Pool ────────────────────────────────────────────────────────
  // Reward founders who quantify the economic waste / inefficiency being addressed.
  let valuePts = 0;
  const valueText = p2.valuePool ?? '';
  const hasEconomics = /\$[\d,.]+[MmBbTt]?|\d+[\s,]*(million|billion|hour|day|week|year)\b/.test(valueText);
  const hasWasteFrame = /\b(waste|inefficien|cost|overhead|manual|legacy|broken|friction|loss|leak|churn|down.?time)\b/i.test(valueText);
  if (valueText.length >= 80 && hasEconomics && hasWasteFrame) valuePts = 20;
  else if (valueText.length >= 60 && (hasEconomics || hasWasteFrame)) valuePts = 14;
  else if (valueText.length >= 30) valuePts = 8;
  points += valuePts;
  sub['2.3_value_pool'] = valuePts;

  // ── 2.4 Expansion Potential ───────────────────────────────────────────────
  let expansionPts = 0;
  const expansionText = p2.expansionPotential ?? data.advantageExplanation ?? '';
  const hasExpansion = EXPANSION_SIGNALS.test(expansionText);
  const hasStages = /\b(phase|step|first|then|next|after|later|eventually|year [23]|series [ab])\b/i.test(expansionText);
  if (hasExpansion && hasStages && expansionText.length >= 80) expansionPts = 20;
  else if (hasExpansion && expansionText.length >= 50) expansionPts = 14;
  else if (hasExpansion) expansionPts = 8;
  else if (expansionText.length >= 50) expansionPts = 5;
  points += expansionPts;
  sub['2.4_expansion_potential'] = expansionPts;

  // ── 2.5 Competitive Density ────────────────────────────────────────────────
  // Low density (0-3 direct competitors) = highly fragmented / greenfield = high potential
  // Very high density (10+) with no clear differentiator = saturated
  let compPts = 0;
  const compCount = p2.competitorCount;
  const compContext = p2.competitorDensityContext ?? '';
  const hasPositioning = /\b(different|unlike|instead of|better than|our|we|ours|unique|niche|position|whitespace)\b/i.test(compContext);
  if (compCount !== undefined) {
    if (compCount >= 1 && compCount <= 5 && hasPositioning) compPts = 20;
    else if (compCount >= 1 && compCount <= 5) compPts = 16;
    else if (compCount >= 6 && compCount <= 15 && hasPositioning) compPts = 12;
    else if (compCount >= 6 && compCount <= 15) compPts = 8;
    else if (compCount === 0) compPts = 10; // greenfield — potential but unproven
    else compPts = 6; // very crowded without clear diff
  } else {
    compPts = 8; // unknown — partial credit
  }
  points += compPts;
  sub['2.5_competitive_density'] = compPts;

  const maxPoints = 100;
  const raw = Math.max(0, Math.min(100, Math.round((points / maxPoints) * 100)));
  return { score: raw, rawPoints: points, maxPoints, sub };
}
