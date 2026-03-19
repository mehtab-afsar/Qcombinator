/**
 * P5 — Structural Impact (indicators 5.1–5.5)
 *
 * 5.1 Climate Leverage     — climate/environmental impact with AI sanity check on extreme claims
 * 5.2 Social Impact        — broader social or community benefit
 * 5.3 Revenue-Impact Link  — impact must be IN the revenue model, not peripheral
 * 5.4 Scaling Mechanism    — how impact scales proportionally with revenue growth
 * 5.5 Viksit Bharat        — sector + product alignment with India development priorities
 *
 * P5 works differently from P2-P4:
 * - It is OPTIONAL — if no p5 fields are populated, score is neutral (50/100)
 * - Revenue linkage strictness: 5.3 + 5.4 must pass for full credit on 5.1/5.2
 * - Applied as a +/- modifier on the overall Q-Score (max +8 pts bonus)
 *
 * Each indicator = 20 pts, total = 100 pts → normalised to 0-100 score.
 * Blended as a 15% bonus weight on the final weighted score.
 */

import { AssessmentData } from '../../types/qscore.types';

const CLIMATE_SIGNALS =
  /\b(carbon|co2|emissions|climate|clean.?energy|renewable|solar|wind|ev|electric.?vehicle|sustainability|sustainable|net.?zero|green|waste|recycl|circular|decarbon|fossil|greenhouse|ghg)\b/i;

const SOCIAL_SIGNALS =
  /\b(education|health|rural|underserved|low.?income|affordable|access|inclusion|diversity|equity|sanitation|water|food.?security|financial.?inclusion|micro.?finance|community|non.?profit|ngo|social.?enterprise|bharat|india)\b/i;

const REVENUE_LINKAGE_SIGNALS =
  /\b(core.?product|revenue.?model|business.?model|per.?transaction|per.?unit|subscription|saas|impact.?fee|carbon.?credit|offset|certification|savings|cost.?reduction|efficiency|direct.?link|measur|metric)\b/i;

const VIKSIT_BHARAT_SECTORS =
  /\b(agriculture|agritech|fintech|healthtech|edtech|msme|manufacturing|logistics|supply.?chain|rural|tier.?2|tier.?3|bharat|india|digital.?india|upi|aadhar|aadhaar|jan.?dhan|pm|government|psu|public.?sector)\b/i;

export function scoreP5StructuralImpact(
  data: AssessmentData
): { score: number; rawPoints: number; maxPoints: number; sub: Record<string, number>; isApplicable: boolean } {
  const p5 = data.p5 ?? {};

  // If no P5 fields are populated, return neutral score (50) and mark as not applicable
  const hasAnyP5Data = !!(
    p5.climateLeverage || p5.socialImpact || p5.revenueImpactLink ||
    p5.scalingMechanism || p5.viksitBharatAlignment
  );

  if (!hasAnyP5Data) {
    // Check if we can infer anything from core assessment text
    const allText = [data.problemStory, data.advantageExplanation, data.customerQuote].join(' ');
    const hasImplicit = CLIMATE_SIGNALS.test(allText) || SOCIAL_SIGNALS.test(allText) || VIKSIT_BHARAT_SECTORS.test(allText);
    if (!hasImplicit) {
      return {
        score: 50, rawPoints: 50, maxPoints: 100,
        sub: { 'neutral_default': 50 },
        isApplicable: false,
      };
    }
  }

  let points = 0;
  const sub: Record<string, number> = {};

  // ── 5.1 Climate Leverage ──────────────────────────────────────────────────
  let climatePts = 0;
  const climateText = p5.climateLeverage ?? data.problemStory ?? '';
  const hasClimate = CLIMATE_SIGNALS.test(climateText);
  // AI sanity check: flag extreme claims (e.g. "eliminate all carbon" without mechanism)
  const isExtremeClaim = /\b(eliminate all|100%|zero.?carbon|net.?zero.?by|save the planet|solve climate)\b/i.test(climateText)
    && !/\b(by 20[3-9]\d|over \d+ years?|through|via|mechanism|because|model)\b/i.test(climateText);
  if (hasClimate && !isExtremeClaim && climateText.length >= 80) climatePts = 20;
  else if (hasClimate && !isExtremeClaim) climatePts = 14;
  else if (hasClimate && isExtremeClaim) climatePts = 8; // penalise extreme unsupported claims
  else climatePts = 2;
  points += climatePts;
  sub['5.1_climate_leverage'] = climatePts;

  // ── 5.2 Social Impact ─────────────────────────────────────────────────────
  let socialPts = 0;
  const socialText = p5.socialImpact ?? data.customerQuote ?? '';
  const hasSocial = SOCIAL_SIGNALS.test(socialText);
  const isMeasured = /\b(\d+|percent|%|people|users|families|communities)\b/i.test(socialText);
  if (hasSocial && isMeasured && socialText.length >= 60) socialPts = 20;
  else if (hasSocial && socialText.length >= 40) socialPts = 14;
  else if (hasSocial) socialPts = 8;
  else socialPts = 2;
  points += socialPts;
  sub['5.2_social_impact'] = socialPts;

  // ── 5.3 Revenue-Impact Link ────────────────────────────────────────────────
  // Strictness rule: impact must be in revenue model, not peripheral
  let revLinkPts = 0;
  const revText = p5.revenueImpactLink ?? data.advantageExplanation ?? '';
  const hasRevLink = REVENUE_LINKAGE_SIGNALS.test(revText);
  const isEmbedded = /\b(every|each|per|directly|core|built.?in|integral|fundamental|not peripheral)\b/i.test(revText);
  if (hasRevLink && isEmbedded && revText.length >= 80) revLinkPts = 20;
  else if (hasRevLink && revText.length >= 50) revLinkPts = 14;
  else if (hasRevLink) revLinkPts = 8;
  else revLinkPts = 2;
  points += revLinkPts;
  sub['5.3_revenue_impact_link'] = revLinkPts;

  // ── 5.4 Scaling Mechanism ─────────────────────────────────────────────────
  let scalePts = 0;
  const scaleText = p5.scalingMechanism ?? '';
  const hasScale = /\b(more customers|more revenue|more impact|linear|exponential|multiplier|leverage|network|ecosystem|platform|data flywheel|more\s+\w+\s+means\s+more)\b/i.test(scaleText);
  if (hasScale && scaleText.length >= 80) scalePts = 20;
  else if (hasScale) scalePts = 14;
  else if (scaleText.length >= 50) scalePts = 8;
  else scalePts = 4;

  // Penalty: if revenue link is weak (5.3 low), cap scaling points
  if (revLinkPts < 8) scalePts = Math.min(scalePts, 10);
  points += scalePts;
  sub['5.4_scaling_mechanism'] = scalePts;

  // ── 5.5 Viksit Bharat Alignment ───────────────────────────────────────────
  // Sector + product must both align — not just being incorporated in India
  let viksitPts = 0;
  const viksitText = p5.viksitBharatAlignment
    ?? (data.p2?.tamDescription ?? '') + ' ' + (data.problemStory ?? '');
  const hasSectorAlignment = VIKSIT_BHARAT_SECTORS.test(viksitText);
  const hasProductAlignment = /\b(solution|product|platform|service|tool|app)\b/i.test(viksitText);
  const hasExplicitMission = /\b(viksit|bharat|india 20[3-9]\d|digital india|make in india|startup india|grassroots|last.?mile|tier.?2|tier.?3)\b/i.test(viksitText);
  if (hasSectorAlignment && hasProductAlignment && hasExplicitMission) viksitPts = 20;
  else if (hasSectorAlignment && hasProductAlignment) viksitPts = 14;
  else if (hasSectorAlignment) viksitPts = 8;
  else viksitPts = 2;
  points += viksitPts;
  sub['5.5_viksit_bharat'] = viksitPts;

  const maxPoints = 100;
  const raw = Math.max(0, Math.min(100, Math.round((points / maxPoints) * 100)));
  return { score: raw, rawPoints: points, maxPoints, sub, isApplicable: true };
}
