/**
 * The P1–P6 dimension resolution priority: IQ v2 params → legacy breakdown → demo.
 *
 * Extracted from app/founder/dashboard/page.tsx, the only place this logic lived until now —
 * ScoreAnchor.tsx's own comment named this exact extraction as the blocker to any second
 * Q-Score view (a dashboard tab, a per-executive "Read" beat) existing safely without
 * reimplementing it. Pure, no IO — the caller supplies its own demo fallback (page-owned
 * placeholder content), so this has no baked-in placeholder data of its own.
 */

export type DimensionId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6'
export interface DimensionPoint { score: number; change: number; trend: 'up' | 'down' | 'neutral' }
export type DimensionTuple = [DimensionId, DimensionPoint]

export interface IqParam { id: string; averageScore: number }

/** Keyed exactly as realQScore.breakdown is shaped (app/api/qscore/latest/route.ts). weight is
 *  the founder's real sector×stage-blended weight for that parameter (0-1 fraction). */
export interface LegacyBreakdown {
  marketReadiness?:  { score?: number; change?: number; trend?: string; weight?: number }
  marketPotential?:  { score?: number; change?: number; trend?: string; weight?: number }
  ipDefensibility?:  { score?: number; change?: number; trend?: string; weight?: number }
  founderTeam?:      { score?: number; change?: number; trend?: string; weight?: number }
  structuralImpact?: { score?: number; change?: number; trend?: string; weight?: number }
  financials?:       { score?: number; change?: number; trend?: string; weight?: number }
}

/** Which legacy breakdown key each P-id reads from. Exported so any consumer reading a field
 *  other than score/change/trend off realQScore.breakdown (e.g. weight) can address the right
 *  key without keeping its own copy of this mapping. */
export const LEGACY_KEY_FOR: Record<DimensionId, keyof LegacyBreakdown> = {
  p1: 'marketReadiness', p2: 'marketPotential', p3: 'ipDefensibility',
  p4: 'founderTeam', p5: 'structuralImpact', p6: 'financials',
}

const ALL_DIMENSION_IDS: readonly DimensionId[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']

function fromIqParams(parameters: IqParam[] | undefined): DimensionTuple[] {
  return (parameters ?? [])
    .map(p => [p.id as DimensionId, { score: Math.round(p.averageScore * 20), change: 0, trend: 'neutral' as const }] as DimensionTuple)
    .sort((a, b) => a[1].score - b[1].score)
}

function fromLegacyBreakdown(breakdown: LegacyBreakdown | undefined): DimensionTuple[] {
  if (!breakdown) return []
  return ALL_DIMENSION_IDS
    .map(id => {
      const d = breakdown[LEGACY_KEY_FOR[id]]
      return [id, {
        score: Math.round(d?.score ?? 0),
        change: d?.change ?? 0,
        trend: (d?.trend ?? 'neutral') as DimensionPoint['trend'],
      }] as DimensionTuple
    })
    .sort((a, b) => a[1].score - b[1].score)
}

/**
 * Resolve the founder's 6 dimensions, worst-first, from whichever source is authoritative.
 * @param demoDims page-owned demo/placeholder content, used only when there's no real score at all.
 */
export function resolveDimensions(args: {
  iqParams?: IqParam[]
  legacyBreakdown?: LegacyBreakdown
  demoDims: DimensionTuple[]
}): DimensionTuple[] {
  const sortedDims = fromIqParams(args.iqParams)
  if (sortedDims.length > 0) return sortedDims

  const legacyDims = fromLegacyBreakdown(args.legacyBreakdown)
  if (legacyDims.length > 0) return legacyDims

  return [...args.demoDims].sort((a, b) => a[1].score - b[1].score)
}

/** Read one dimension's resolved point out of an already-resolved set, or null if absent —
 *  the shape a per-executive "Read" beat needs (F09 Executive Team tabs). */
export function findDimension(dims: DimensionTuple[], id: DimensionId): DimensionPoint | null {
  return dims.find(([dimId]) => dimId === id)?.[1] ?? null
}
