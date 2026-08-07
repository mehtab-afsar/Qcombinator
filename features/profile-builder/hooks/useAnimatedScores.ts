import { useEffect, useState } from 'react'
import type { SectionState } from '@/features/profile-builder/types'

/** Smoothly ticks the sidebar's per-section scores toward their real
 *  completionScores rather than jumping — purely derived from `sections`,
 *  no external writers. */
export function useAnimatedScores(sections: Record<string, SectionState>): Record<string, number> {
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({})

  useEffect(() => {
    const targets: Record<string, number> = {}
    for (const [k, s] of Object.entries(sections)) targets[k] = s.completionScore
    const timer = setInterval(() => {
      setAnimatedScores(prev => {
        let changed = false
        const next = { ...prev }
        for (const [k, target] of Object.entries(targets)) {
          const cur = prev[k] ?? 0
          if (cur !== target) {
            next[k] = cur < target ? Math.min(cur + 3, target) : Math.max(cur - 3, target)
            changed = true
          }
        }
        if (!changed) clearInterval(timer)
        return next
      })
    }, 25)
    return () => clearInterval(timer)
  }, [sections])

  return animatedScores
}
