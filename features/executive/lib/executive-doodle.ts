/**
 * One doodle per executive, by role — the same hand-drawn system already used
 * across onboarding/loading states (not a new icon language). Single source
 * (CLAUDE.md "one of each") — was previously defined only inside ExecutiveCard.tsx,
 * so the executive detail page had no way to show the same identity without a
 * second copy of this map.
 */

import { CompassDoodle } from '@/features/onboarding/components/doodles/CompassDoodle'
import { ChartDoodle } from '@/features/onboarding/components/doodles/ChartDoodle'
import { LightbulbDoodle } from '@/features/onboarding/components/doodles/LightbulbDoodle'
import { ScrollDoodle } from '@/features/onboarding/components/doodles/ScrollDoodle'
import { TargetDoodle } from '@/features/onboarding/components/doodles/TargetDoodle'

export const EXECUTIVE_DOODLE: Record<string, typeof CompassDoodle> = {
  ceo: CompassDoodle,
  growth: ChartDoodle,
  product: LightbulbDoodle,
  operations: ScrollDoodle,
  finance: TargetDoodle,
}
