/**
 * Centralized pipeline stage and momentum colors.
 * Single source of truth — used by deal-flow, pipeline, and startup deep-dive pages.
 * Previously conflicting: pipeline page had meeting=purple, deal-flow had meeting=amber.
 */

import { amber, green, red, muted, purple, alpha } from '@/lib/constants/colors'

export type PipelineStage = 'watching' | 'meeting' | 'in_dd' | 'portfolio' | 'passed'

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, { color: string; bg: string; label: string }> = {
  watching:  { color: muted,   bg: alpha(muted,  0.12), label: 'Watching'  },
  meeting:   { color: amber,   bg: alpha(amber,  0.12), label: 'Meeting'   },
  in_dd:     { color: purple,  bg: alpha(purple, 0.12), label: 'In DD'     },
  portfolio: { color: green,   bg: alpha(green,  0.12), label: 'Portfolio' },
  passed:    { color: red,     bg: alpha(red,    0.12), label: 'Passed'    },
}

export const PIPELINE_STAGES: PipelineStage[] = ['watching', 'meeting', 'in_dd', 'portfolio', 'passed']

export function momentumBadge(score: number): { color: string; bg: string; label: string } {
  if (score >= 10) return { color: red,   bg: alpha(red,   0.12), label: `+${score} Hot`    }
  if (score >=  4) return { color: green, bg: alpha(green, 0.12), label: `+${score} Rising` }
  if (score >= -3) return { color: muted, bg: alpha(muted, 0.12), label: 'Steady'            }
  return                  { color: amber, bg: alpha(amber, 0.12), label: `${score} Falling`  }
}
