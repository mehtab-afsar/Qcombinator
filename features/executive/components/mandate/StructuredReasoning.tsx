'use client'

/**
 * The reasoning behind a mandate — objectives, pathway, risks — rendered as a document.
 *
 * The ONE place that switches on a parsed section's kind. `raw` is not an error branch: it is
 * the honest outcome for a section whose layout the model didn't repeat, and it renders through
 * ReportMarkdown, the same component every Asset document already uses. That is what makes the
 * "degrade, never fail" contract in lib/mandate/document-structure.ts true rather than merely
 * intended — and it is why the raw branch sits inside the same heading wrapper as the structured
 * ones, so a founder cannot tell which path a section took.
 *
 * Replaces a `<p style={{ whiteSpace: 'pre-wrap' }}>{markdown}</p>`, which put literal
 * `**Why it matters:**` and `---` on the screen.
 */

import { muted } from '@/lib/constants/colors'
import { font } from '@/features/shared/tokens'
import type { StructuredSection } from '@/lib/mandate/document-structure'
import { ReportMarkdown } from '../ReportMarkdown'
import { ObjectiveCards } from './ObjectiveCards'
import { PathwayPanel } from './PathwayPanel'
import { RiskBlock } from './RiskBlock'

function SectionBody({ section }: { section: StructuredSection }) {
  switch (section.kind) {
    case 'objectives': return <ObjectiveCards objectives={section.objectives} />
    case 'pathway': return <PathwayPanel pathway={section.pathway} />
    case 'risks': return <RiskBlock risks={section.risks} />
    case 'raw': return <ReportMarkdown content={section.body} />
  }
}

export function StructuredReasoning({ sections }: { sections: StructuredSection[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {sections.map((section, i) => (
        <div key={`${section.heading}-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{
            color: muted, fontSize: font.size.sm, fontWeight: font.weight.semibold,
            letterSpacing: font.letterSpacing.label, textTransform: 'uppercase', margin: 0,
          }}>
            {section.heading}
          </h3>
          <SectionBody section={section} />
        </div>
      ))}
    </div>
  )
}
