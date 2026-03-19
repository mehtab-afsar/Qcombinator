/**
 * Cross-Validator
 *
 * Detects logical contradictions between indicator results.
 * These are mathematical invariants — they are NOT DB-configurable
 * because they represent logical impossibilities, not tunable preferences.
 *
 * Output: ConsistencyFlag[] per indicator.
 * Flags reduce confidence (not score directly) via the Confidence Engine.
 */

import { ConsistencyFlag, ConsistencyFlagSeverity } from '../types/iq.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndicatorSnapshot {
  code: string;
  rawScore: number | null;       // 1–5
  rawValue: number | null;       // actual measured value
  excluded: boolean;
}

type FlagMap = Map<string, ConsistencyFlag[]>;

// ─── Rule Definitions ─────────────────────────────────────────────────────────

interface ConsistencyRule {
  code: string;
  description: string;
  severity: ConsistencyFlagSeverity;
  indicators: string[];
  check: (scores: Map<string, IndicatorSnapshot>) => boolean;
  flagTargets: string[];   // which indicators get the flag attached
}

const CONSISTENCY_RULES: ConsistencyRule[] = [
  {
    code: 'IP_DEVTIME_MISMATCH',
    description: 'Strong IP claimed (5/5) but MVP built in <3 months. Patents take years to file — IP score likely inflated.',
    severity: 'medium',
    indicators: ['3.1', '3.4'],
    check: (s) => {
      const ip = s.get('3.1');
      const devTime = s.get('3.4');
      return (ip?.rawScore ?? 0) >= 4.5 && (devTime?.rawValue ?? 999) < 3;
    },
    flagTargets: ['3.1'],
  },
  {
    code: 'LTV_CAC_CONCENTRATION',
    description: 'High LTV:CAC (5/5) combined with extreme customer concentration (>80%). CAC is artificially low — based on a single customer relationship.',
    severity: 'high',
    indicators: ['2.3', '1.4'],
    check: (s) => {
      const ltvCac = s.get('2.3');
      const concentration = s.get('1.4');
      // concentration rawValue is the % (0–1), score 1 means >80%
      return (ltvCac?.rawScore ?? 0) >= 4.5 && (concentration?.rawScore ?? 5) <= 1.5;
    },
    flagTargets: ['2.3'],
  },
  {
    code: 'REVENUE_INTENSITY_NO_RECURRING',
    description: 'High revenue intensity but near-zero recurring revenue quality. Non-recurring revenue makes intensity unsustainable.',
    severity: 'medium',
    indicators: ['1.1', '1.3'],
    check: (s) => {
      const intensity = s.get('1.1');
      const quality = s.get('1.3');
      return (intensity?.rawScore ?? 0) >= 4.5 && (quality?.rawScore ?? 5) <= 1.5;
    },
    flagTargets: ['1.1'],
  },
  {
    code: 'HIGH_GROWTH_NO_CUSTOMERS',
    description: 'High revenue growth velocity claimed but very low paying customer density. Growth without customers is inconsistent.',
    severity: 'medium',
    indicators: ['1.2', '1.5'],
    check: (s) => {
      const growth = s.get('1.2');
      const density = s.get('1.5');
      return (growth?.rawScore ?? 0) >= 4.5 && (density?.rawScore ?? 5) <= 1.5;
    },
    flagTargets: ['1.2'],
  },
  {
    code: 'LEVERAGE_PRE_REVENUE',
    description: 'Operating leverage scored but revenue intensity near zero. Leverage is meaningless without a revenue base to measure against.',
    severity: 'low',
    indicators: ['2.4', '1.1'],
    check: (s) => {
      const leverage = s.get('2.4');
      const intensity = s.get('1.1');
      return !leverage?.excluded && (intensity?.rawScore ?? 5) <= 1.5;
    },
    flagTargets: ['2.4'],
  },
  {
    code: 'RD_INTENSITY_NO_TECH_TEAM',
    description: 'High R&D intensity claimed but very low technical team density. R&D spend without engineers is structurally impossible.',
    severity: 'high',
    indicators: ['3.2', '3.3'],
    check: (s) => {
      const rd = s.get('3.2');
      const techDensity = s.get('3.3');
      return (rd?.rawScore ?? 0) >= 4 && (techDensity?.rawScore ?? 5) <= 1.5;
    },
    flagTargets: ['3.2'],
  },
  {
    code: 'TEAM_STABILITY_SOLO',
    description: 'Team stability scored high but technical team density near zero. Retention is not meaningful for a solo founder.',
    severity: 'low',
    indicators: ['4.5', '3.3'],
    check: (s) => {
      const stability = s.get('4.5');
      const techDensity = s.get('3.3');
      return (stability?.rawScore ?? 0) >= 4.5 && (techDensity?.rawScore ?? 5) <= 1.0;
    },
    flagTargets: ['4.5'],
  },
  {
    code: 'REVENUE_QUALITY_ZERO_ARR',
    description: 'Revenue quality ratio is maximum but revenue intensity is near zero. Cannot have 100% recurring revenue with no revenue.',
    severity: 'high',
    indicators: ['1.3', '1.1'],
    check: (s) => {
      const quality = s.get('1.3');
      const intensity = s.get('1.1');
      return (quality?.rawScore ?? 0) >= 4.5 && (intensity?.rawScore ?? 5) <= 1.0;
    },
    flagTargets: ['1.3'],
  },
  {
    code: 'EXTREME_SDG_CLAIM',
    description: 'Claiming material impact on 7+ UN SDGs. Maximum realistic SDG materiality for a startup is 3–5.',
    severity: 'medium',
    indicators: ['5.3'],
    check: (s) => {
      const sdg = s.get('5.3');
      return (sdg?.rawValue ?? 0) >= 7;
    },
    flagTargets: ['5.3'],
  },
  {
    code: 'VIKSIT_BHARAT_GLOBAL_MARKET',
    description: 'Maximum Viksit Bharat alignment claimed but SAM is global/large. India sovereignty metrics require India-primary market focus.',
    severity: 'low',
    indicators: ['5.5', '2.1'],
    check: (s) => {
      const vb = s.get('5.5');
      const sam = s.get('2.1');
      // Large SAM (score 5) + perfect Viksit Bharat is mildly inconsistent
      return (vb?.rawScore ?? 0) >= 4.5 && (sam?.rawScore ?? 0) >= 4.5;
    },
    flagTargets: ['5.5'],
  },
  {
    code: 'CARBON_CLAIM_NON_CLIMATE',
    description: 'Significant carbon reduction claimed but no climate-related language detected in product description.',
    severity: 'medium',
    indicators: ['5.1'],
    check: (s) => {
      const carbon = s.get('5.1');
      // rawValue = 0 means no climate detected, but score is high (AI must have erred)
      return (carbon?.rawScore ?? 0) >= 4 && carbon?.rawValue === 0;
    },
    flagTargets: ['5.1'],
  },
  {
    code: 'STRONG_IP_NO_TECHNICAL_TEAM',
    description: 'Strong IP claimed but very low technical team density. Building patents requires technical talent.',
    severity: 'medium',
    indicators: ['3.1', '3.3'],
    check: (s) => {
      const ip = s.get('3.1');
      const techDensity = s.get('3.3');
      return (ip?.rawScore ?? 0) >= 4 && (techDensity?.rawScore ?? 5) <= 1.5;
    },
    flagTargets: ['3.1'],
  },
];

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Run all 12 consistency rules against a set of indicator results.
 * Returns a map of indicator code → ConsistencyFlag[].
 */
export function runCrossValidation(
  indicators: IndicatorSnapshot[]
): FlagMap {
  const scoreMap = new Map<string, IndicatorSnapshot>();
  for (const ind of indicators) {
    scoreMap.set(ind.code, ind);
  }

  const flagMap: FlagMap = new Map();

  for (const rule of CONSISTENCY_RULES) {
    // Only check if all involved indicators have data
    const allPresent = rule.indicators.every(code => {
      const ind = scoreMap.get(code);
      return ind && !ind.excluded;
    });
    if (!allPresent) continue;

    const triggered = rule.check(scoreMap);
    if (!triggered) continue;

    // Attach flag to each target indicator
    for (const target of rule.flagTargets) {
      if (!flagMap.has(target)) flagMap.set(target, []);
      flagMap.get(target)?.push({
        ruleCode: rule.code,
        description: rule.description,
        severity: rule.severity,
        indicatorsInvolved: rule.indicators,
      });
    }
  }

  return flagMap;
}

/**
 * Get all consistency flags for a specific indicator code.
 */
export function getFlagsForIndicator(
  code: string,
  flagMap: FlagMap
): ConsistencyFlag[] {
  return flagMap.get(code) ?? [];
}
