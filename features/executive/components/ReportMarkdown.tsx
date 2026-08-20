'use client'

/**
 * Renders a long AI-generated report (an Asset's markdown content) so it reads as a real
 * document, not an undifferentiated wall of text. Before this, ReactMarkdown ran with zero
 * component overrides — a 2,000-word report with ten numbered `##` sections and eight tables
 * rendered as one continuous scroll with no visual hierarchy at all (a real founder's own
 * complaint: "too much info blob... looks like a heavy essay").
 *
 * Split out of AssetWorkspaceBody.tsx (which was already near CLAUDE.md's ~300-line ceiling) —
 * this is the one place in the app rendering a genuinely long structured document; the other
 * three ReactMarkdown call sites (action summaries, live-streaming previews, action payload
 * bodies) are all short, capped content that doesn't need this treatment.
 */

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { bg, surf, bdr, ink, muted, blue, alpha } from '@/lib/constants/colors'
import { font, space } from '@/features/shared/tokens'
import { FONT_SERIF } from '@/features/onboarding/theme'

/** Matches how remark turns heading text into a fragment id — lowercase, spaces to hyphens,
 *  strip anything that isn't a letter/number/hyphen/space first. Kept in sync by construction:
 *  both the TOC and the h2 renderer below call this on the exact same source strings. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** Recursively flattens a heading's rendered children back to plain text, for slugging. Headings
 *  in these reports are plain text in practice, but this stays correct if one is ever bold/etc. */
function textOf(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: React.ReactNode } }).props.children)
  }
  return ''
}

const TABLE_WRAP: React.CSSProperties = { overflowX: 'auto', margin: `${space[5]}px 0` }
const TH: React.CSSProperties = {
  textAlign: 'left', padding: '8px 12px', background: surf, borderBottom: `2px solid ${bdr}`,
  color: ink, fontSize: font.size.sm, fontWeight: font.weight.semibold, whiteSpace: 'nowrap',
}
const TD: React.CSSProperties = {
  padding: '8px 12px', borderBottom: `1px solid ${bdr}`, color: ink, fontSize: font.size.md,
  verticalAlign: 'top',
}

/**
 * Section headings (`##`) get a real break — top border, generous space above — because these
 * reports are structured as numbered sections and the previous plain-text render gave every
 * heading level the same quiet weight, so nothing read as a boundary.
 */
function makeComponents(): Components {
  return {
    h1: ({ children }) => (
      <h1 style={{
        fontFamily: FONT_SERIF, color: ink, fontSize: font.size['3xl'], fontWeight: font.weight.semibold,
        lineHeight: 1.25, margin: `0 0 ${space[3]}px`, textWrap: 'balance',
      }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => {
      const text = textOf(children)
      return (
        <h2
          id={slugify(text)}
          style={{
            fontFamily: FONT_SERIF, color: ink, fontSize: font.size['2xl'], fontWeight: font.weight.semibold,
            lineHeight: 1.3, margin: `${space[10]}px 0 ${space[4]}px`,
            paddingTop: space[6], borderTop: `1px solid ${bdr}`,
          }}
        >
          {children}
        </h2>
      )
    },
    h3: ({ children }) => (
      <h3 style={{
        color: ink, fontSize: font.size.xl, fontWeight: font.weight.semibold, lineHeight: 1.35,
        margin: `${space[6]}px 0 ${space[2]}px`, paddingLeft: space[3], borderLeft: `3px solid ${blue}`,
      }}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 style={{
        color: ink, fontSize: font.size.lg, fontWeight: font.weight.semibold,
        margin: `${space[5]}px 0 ${space[1]}px`,
      }}>
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p style={{ color: ink, fontSize: font.size.md, lineHeight: 1.7, margin: `${space[2]}px 0`, maxWidth: '72ch' }}>
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: `${space[2]}px 0`, paddingLeft: space[5], display: 'grid', gap: space[1] }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: `${space[2]}px 0`, paddingLeft: space[5], display: 'grid', gap: space[1] }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ color: ink, fontSize: font.size.md, lineHeight: 1.65, maxWidth: '70ch' }}>
        {children}
      </li>
    ),
    strong: ({ children }) => <strong style={{ color: ink, fontWeight: font.weight.semibold }}>{children}</strong>,
    blockquote: ({ children }) => (
      <blockquote style={{
        margin: `${space[4]}px 0`, padding: `${space[2]}px ${space[4]}px`,
        borderLeft: `3px solid ${blue}`, background: alpha(blue, 0.05), color: muted, fontStyle: 'italic',
      }}>
        {children}
      </blockquote>
    ),
    hr: () => <hr style={{ border: 'none', borderTop: `1px solid ${bdr}`, margin: `${space[6]}px 0` }} />,
    table: ({ children }) => (
      <div style={TABLE_WRAP}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
      </div>
    ),
    th: ({ children }) => <th style={TH}>{children}</th>,
    td: ({ children }) => <td style={TD}>{children}</td>,
  }
}

/** Every `##` heading, in document order — the "jump to section" strip's own source of truth. */
function extractSections(markdown: string): string[] {
  return [...markdown.matchAll(/^##\s+(.+)$/gm)].map(m => m[1].trim())
}

export function ReportMarkdown({ content }: { content: string }) {
  const components = useMemo(makeComponents, [])
  const sections = useMemo(() => extractSections(content), [content])

  return (
    <div>
      {sections.length > 2 && (
        <nav
          aria-label="Jump to section"
          style={{ display: 'flex', flexWrap: 'wrap', gap: space[1], marginBottom: space[5] }}
        >
          {sections.map(heading => (
            <a
              key={heading}
              href={`#${slugify(heading)}`}
              style={{
                fontSize: font.size.sm, color: muted, textDecoration: 'none',
                border: `1px solid ${bdr}`, borderRadius: 999, padding: '4px 10px', background: bg,
              }}
            >
              {heading}
            </a>
          ))}
        </nav>
      )}
      <div style={{ fontFamily: font.family.sans, color: ink }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
