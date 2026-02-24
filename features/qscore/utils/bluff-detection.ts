/**
 * Bluff / AI-Generated Input Detection
 *
 * Analyzes assessment responses for signals of inflated, fabricated,
 * or AI-generated inputs that would artificially boost scoring.
 */

import { AssessmentData } from '../types/qscore.types';

export interface BluffSignal {
  field: string;
  signal: 'too_perfect' | 'inconsistent' | 'generic' | 'round_numbers' | 'impossible';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

// Common AI-generated hallmark phrases
const AI_PHRASES = [
  'leveraging cutting-edge',
  'revolutionary',
  'game-changing',
  'paradigm shift',
  'synergistic',
  'holistic approach',
  "in today's fast-paced",
  'unprecedented',
  'transformative solution',
  'disruptive innovation',
  'seamlessly integrate',
  'scalable and robust',
  'state-of-the-art',
  'best-in-class',
  'end-to-end solution',
  'unlock the full potential',
  'next-generation',
  'world-class',
];

// Specificity indicators — real founders use specific details
const SPECIFICITY_PATTERN = /\b(last (week|month|quarter|year)|in (january|february|march|april|may|june|july|august|september|october|november|december)|\d{1,2}\/\d{1,2}|\$[\d,]+|\d+%|\d+ (customers|users|people|companies|conversations|calls|meetings))/gi;

export function detectBluffSignals(data: AssessmentData): BluffSignal[] {
  const signals: BluffSignal[] = [];

  // ── 1. Round number detection ──────────────────────────────────────────
  // Real founders rarely have perfectly round metrics
  const numericChecks: { field: string; value: number | undefined; threshold: number }[] = [
    { field: 'targetCustomers', value: data.targetCustomers, threshold: 10000 },
    { field: 'financial.mrr', value: data.financial?.mrr, threshold: 1000 },
    { field: 'financial.monthlyBurn', value: data.financial?.monthlyBurn, threshold: 1000 },
    { field: 'costPerAcquisition', value: data.costPerAcquisition, threshold: 10 },
    { field: 'lifetimeValue', value: data.lifetimeValue, threshold: 100 },
  ];

  let roundCount = 0;
  for (const { value, threshold } of numericChecks) {
    if (value && value >= threshold && value % 1000 === 0) {
      roundCount++;
    }
  }
  // Only flag if 3+ metrics are suspiciously round
  if (roundCount >= 3) {
    signals.push({
      field: 'numeric_fields',
      signal: 'round_numbers',
      severity: 'medium',
      description: `${roundCount} metrics are perfectly round numbers — real data is rarely this clean`,
    });
  }

  // ── 2. Impossible ratios ───────────────────────────────────────────────
  if (data.lifetimeValue && data.costPerAcquisition && data.costPerAcquisition > 0) {
    const ratio = data.lifetimeValue / data.costPerAcquisition;
    if (ratio > 20) {
      signals.push({
        field: 'lifetimeValue',
        signal: 'impossible',
        severity: 'high',
        description: `LTV/CAC ratio of ${ratio.toFixed(1)}:1 is unrealistically high (>20:1)`,
      });
    }
  }

  // ── 3. AI-hallmark phrase detection ────────────────────────────────────
  const textFields: { name: string; value: string | undefined }[] = [
    { name: 'problemStory', value: data.problemStory },
    { name: 'advantageExplanation', value: data.advantageExplanation },
    { name: 'hardshipStory', value: data.hardshipStory },
    { name: 'customerQuote', value: data.customerQuote },
    { name: 'customerSurprise', value: data.customerSurprise },
  ];

  for (const { name, value } of textFields) {
    if (!value || value.length < 30) continue;
    const lower = value.toLowerCase();
    const aiMatches = AI_PHRASES.filter(p => lower.includes(p));
    if (aiMatches.length >= 2) {
      signals.push({
        field: name,
        signal: 'generic',
        severity: 'medium',
        description: `Contains ${aiMatches.length} AI-hallmark phrases: "${aiMatches.slice(0, 3).join('", "')}"`,
      });
    }
  }

  // ── 4. Specificity scoring ─────────────────────────────────────────────
  // Good answers from real founders have specific numbers, dates, names
  for (const { name, value } of textFields) {
    if (!value || value.length < 200) continue;
    const matches = value.match(SPECIFICITY_PATTERN) || [];
    if (matches.length === 0) {
      signals.push({
        field: name,
        signal: 'generic',
        severity: 'low',
        description: 'Long answer with zero specific details (no dates, numbers, or names)',
      });
    }
  }

  // ── 5. Inconsistent financials ─────────────────────────────────────────
  if (data.financial?.mrr && data.financial.mrr > 0 && data.financial.monthlyBurn > 0) {
    // MRR much higher than burn but no ARR — inconsistent
    if (data.financial.mrr > data.financial.monthlyBurn * 10 && !data.financial.arr) {
      signals.push({
        field: 'financial.mrr',
        signal: 'inconsistent',
        severity: 'medium',
        description: 'MRR is 10x burn rate but no ARR reported — inconsistent data',
      });
    }
    // Runway reported but doesn't match burn
    if (data.financial.runway && data.financial.monthlyBurn > 0) {
      // If they claim huge runway but high burn with no revenue, flag it
      if (data.financial.runway > 36 && data.financial.monthlyBurn > 50000 && data.financial.mrr < data.financial.monthlyBurn * 0.1) {
        signals.push({
          field: 'financial.runway',
          signal: 'inconsistent',
          severity: 'medium',
          description: '3+ year runway with high burn and minimal revenue seems unlikely',
        });
      }
    }
  }

  // ── 6. Conversation count vs evidence mismatch ─────────────────────────
  if (data.conversationCount > 50 && !data.customerQuote && !data.customerSurprise) {
    signals.push({
      field: 'conversationCount',
      signal: 'inconsistent',
      severity: 'medium',
      description: 'Claims 50+ customer conversations but provides no quotes or surprises',
    });
  }

  return signals;
}

/**
 * Apply scoring penalty based on detected bluff signals.
 * High severity: -10% each, Medium: -3% each, Low: -1% each
 * Max total penalty: 30%
 */
export function applyBluffPenalty(score: number, signals: BluffSignal[]): number {
  if (signals.length === 0) return score;

  const highCount = signals.filter(s => s.severity === 'high').length;
  const mediumCount = signals.filter(s => s.severity === 'medium').length;
  const lowCount = signals.filter(s => s.severity === 'low').length;

  const penalty = highCount * 0.10 + mediumCount * 0.03 + lowCount * 0.01;
  const clampedPenalty = Math.min(penalty, 0.30); // Max 30% penalty

  return Math.round(score * (1 - clampedPenalty));
}
