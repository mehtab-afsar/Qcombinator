'use client'

/**
 * The Executive Objectives, as cards rather than a run of bold-label paragraphs.
 *
 * ⚠️ A ROW WITH NO FIELD IS OMITTED ENTIRELY. That is the whole design constraint, not a nicety:
 * the prompt never asks the model for these sub-fields by name, so which of them appear varies
 * per generation — one captured mandate states only "why it matters", another states all three.
 * Reserving a row per label ships two empty labels against the first. See
 * lib/mandate/document-structure.ts, and the fixtures that disagree with each other.
 *
 * One column, not a grid. Objectives are RANKED; two abreast destroys the reading order that
 * ranking exists to convey.
 */

import { bdr, ink, muted, surf } from '@/lib/constants/colors'
import { font, radius } from '@/features/shared/tokens'
import type { ParsedObjective } from '@/lib/mandate/document-structure'
import { chipStyle, labelStyle, rowStyle, valueStyle, PRIORITY_COLOR } from './reasoning-style'

function ObjectiveCard({ objective }: { objective: ParsedObjective }) {
  return (
    <div style={{
      border: `1px solid ${bdr}`, borderRadius: radius.lg, background: surf,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{
          fontFamily: font.family.serif, fontSize: font.size['2xl'], color: muted,
          lineHeight: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums',
        }}>
          {objective.ordinal}
        </span>
        <h4 style={{
          color: ink, fontSize: font.size.lg, fontWeight: font.weight.semibold,
          margin: 0, lineHeight: 1.35, flex: 1, textWrap: 'balance',
        }}>
          {objective.title}
        </h4>
        {/* Absent rather than guessed at — the model does not always state one. */}
        {objective.priority && (
          <span style={chipStyle(PRIORITY_COLOR[objective.priority])}>{objective.priority}</span>
        )}
      </div>

      {objective.fields.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {objective.fields.map(field => (
            <div key={field.label} style={rowStyle}>
              <span style={labelStyle}>{field.label}</span>
              <p style={valueStyle}>{field.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ObjectiveCards({ objectives }: { objectives: ParsedObjective[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {objectives.map(objective => (
        <ObjectiveCard key={objective.ordinal} objective={objective} />
      ))}
    </div>
  )
}
