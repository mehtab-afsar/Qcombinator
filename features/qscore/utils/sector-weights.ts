/**
 * Sector-Specific Scoring Rubrics
 *
 * Different startup sectors have fundamentally different success patterns.
 * These rubrics adjust the Q-Score dimension weights accordingly.
 *
 * biotech ≠ SaaS ≠ marketplace ≠ consumer
 */

export type Sector =
  | 'saas_b2b'
  | 'saas_b2c'
  | 'marketplace'
  | 'biotech_deeptech'
  | 'consumer'
  | 'fintech'
  | 'hardware'
  | 'ecommerce';

export interface SectorWeights {
  market:     number;
  product:    number;
  goToMarket: number;
  financial:  number;
  team:       number;
  traction:   number;
}

export const SECTOR_CONFIGS: Record<Sector, { label: string; description: string; weights: SectorWeights }> = {
  saas_b2b: {
    label: 'B2B SaaS',
    description: 'Enterprise software. Go-to-market and traction matter most; long deal cycles mean traction weight is lower.',
    weights: { market: 0.20, product: 0.18, goToMarket: 0.20, financial: 0.18, team: 0.14, traction: 0.10 },
  },
  saas_b2c: {
    label: 'B2C SaaS / Consumer Tech',
    description: 'Consumer software. Product-market fit and traction are king — virality and retention signal everything.',
    weights: { market: 0.16, product: 0.22, goToMarket: 0.16, financial: 0.14, team: 0.12, traction: 0.20 },
  },
  marketplace: {
    label: 'Marketplace',
    description: 'Two-sided markets. Traction (GMV, liquidity) is the most critical signal. Unit economics are central.',
    weights: { market: 0.18, product: 0.14, goToMarket: 0.16, financial: 0.20, team: 0.12, traction: 0.20 },
  },
  biotech_deeptech: {
    label: 'Biotech / Deep Tech',
    description: 'Science-driven startups with long cycles. Market opportunity and team credentials dominate; early traction is harder to show.',
    weights: { market: 0.26, product: 0.22, goToMarket: 0.12, financial: 0.16, team: 0.20, traction: 0.04 },
  },
  consumer: {
    label: 'Consumer Brand / CPG',
    description: 'Physical or digital consumer brands. Traction, brand, and unit economics are the key signals.',
    weights: { market: 0.16, product: 0.18, goToMarket: 0.20, financial: 0.18, team: 0.10, traction: 0.18 },
  },
  fintech: {
    label: 'Fintech',
    description: 'Financial services. Regulatory readiness, financial rigor, and market timing are critical.',
    weights: { market: 0.22, product: 0.18, goToMarket: 0.14, financial: 0.24, team: 0.14, traction: 0.08 },
  },
  hardware: {
    label: 'Hardware / IoT',
    description: 'Physical products. Team execution and financial discipline matter most; traction takes longer to build.',
    weights: { market: 0.20, product: 0.20, goToMarket: 0.14, financial: 0.22, team: 0.18, traction: 0.06 },
  },
  ecommerce: {
    label: 'E-commerce / D2C',
    description: 'Direct-to-consumer commerce. Unit economics and traction (revenue, ROAS) are the most important signals.',
    weights: { market: 0.16, product: 0.14, goToMarket: 0.18, financial: 0.24, team: 0.10, traction: 0.18 },
  },
};

export const DEFAULT_SECTOR: Sector = 'saas_b2b';

/**
 * Apply sector-specific weights to dimension scores and return adjusted overall.
 */
export function applyWeights(
  dimScores: { market: number; product: number; goToMarket: number; financial: number; team: number; traction: number },
  sector: Sector = DEFAULT_SECTOR,
): number {
  const w = SECTOR_CONFIGS[sector].weights;
  return Math.min(100, Math.round(
    dimScores.market     * w.market +
    dimScores.product    * w.product +
    dimScores.goToMarket * w.goToMarket +
    dimScores.financial  * w.financial +
    dimScores.team       * w.team +
    dimScores.traction   * w.traction,
  ));
}
