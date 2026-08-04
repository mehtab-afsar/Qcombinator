import { blue, green, amber, red, purple, cyan } from '@/lib/constants/colors'

/** The 6 Q-Score dimensions (P1-P6), one color/label pair each — shared so every
 *  place that renders a dimension (the dashboard chart, the Command View's score
 *  anchor) agrees on what P1-P6 mean and look like. */
export const DIM_COLORS: Record<string, string> = {
  p1: blue,
  p2: purple,
  p3: green,
  p4: amber,
  p5: red,
  p6: cyan,
}

export const DIM_LABELS: Record<string, string> = {
  p1: 'Market Readiness', p2: 'Market Potential', p3: 'IP / Defensibility',
  p4: 'Founder / Team',   p5: 'Impact',            p6: 'Financials',
}
