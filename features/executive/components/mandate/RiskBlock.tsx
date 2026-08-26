'use client'

/**
 * Executive risks. Each carries its kind on a coloured left edge, so the three read as three
 * different KINDS of exposure at a glance rather than as three more paragraphs.
 *
 * A risk the model gave no title keeps its body alone — no placeholder heading invented for it.
 */

import { ink } from '@/lib/constants/colors'
import { font } from '@/features/shared/tokens'
import type { ParsedRisk } from '@/lib/mandate/document-structure'
import { chipStyle, valueStyle, RISK_COLOR, RISK_LABEL } from './reasoning-style'

export function RiskBlock({ risks }: { risks: ParsedRisk[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {risks.map((risk, i) => (
        <div
          key={`${risk.kind}-${i}`}
          style={{
            borderLeft: `3px solid ${RISK_COLOR[risk.kind]}`, paddingLeft: 14,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={chipStyle(RISK_COLOR[risk.kind])}>{RISK_LABEL[risk.kind]}</span>
            {risk.title && (
              <span style={{
                color: ink, fontSize: font.size.md, fontWeight: font.weight.semibold,
                lineHeight: 1.4, textWrap: 'balance',
              }}>
                {risk.title}
              </span>
            )}
          </div>
          <p style={valueStyle}>{risk.body}</p>
        </div>
      ))}
    </div>
  )
}
