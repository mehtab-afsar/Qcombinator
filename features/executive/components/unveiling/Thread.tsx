'use client'

/**
 * The thread connecting the five layers of the unveiling — dots darken as
 * commitment deepens (UX_SPEC_the_frame.md §3). Purely visual, no data of its own.
 */

import { blue, bdr } from '@/lib/constants/colors'

const LAYERS = [
  'The read',
  'The direction',
  'The mandate',
  'The team',
  'Confirm',
] as const

export function Thread({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      {LAYERS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4 | 5
        const reached = n <= step
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: reached ? blue : bdr,
              transition: 'background 0.4s ease',
            }} />
            <span style={{
              fontSize: 11, color: reached ? blue : bdr,
              transition: 'color 0.4s ease', letterSpacing: '0.02em',
            }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
