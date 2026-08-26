'use client'

import Link from 'next/link'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants/app'
import { bg, surf, bdr, ink, muted, blue, white } from '@/lib/constants/colors'

const EXECUTIVES = [
  { id: 'ceo',        role: 'CEO / Chief of Staff',     name: 'Morgan', desc: 'Turns your Q-Score into a Mandate — the Executive Contract that decides which Programs run' },
  { id: 'growth',     role: 'Chief Growth Officer',     name: 'Patel',  desc: 'Owns Go-to-Market: ICP, positioning, messaging, and channel strategy — live today' },
  { id: 'product',    role: 'Chief Technology Officer', name: null,     desc: 'Product & Technology' },
  { id: 'operations', role: 'Chief Operations Officer', name: null,     desc: 'Runs the operating rhythm across the company' },
  { id: 'finance',    role: 'Chief Financial Officer',  name: null,     desc: 'Keeps the company alive and fundable' },
]

const PARAMETERS = [
  { id: 'P1', label: 'Market Readiness',   desc: 'Validated demand — paying customers, discovery interviews, signed LOIs' },
  { id: 'P2', label: 'Market Potential',   desc: 'TAM/SAM/SOM sizing, growth tailwinds, and competitive white space' },
  { id: 'P3', label: 'IP & Defensibility', desc: 'Technical moat, proprietary data, patents, or network effects' },
  { id: 'P4', label: 'Founder & Team',     desc: 'Relevant domain expertise, execution history, and team completeness' },
  { id: 'P5', label: 'Structural Impact',  desc: 'Scalability, gross margins, and unit economics potential' },
  { id: 'P6', label: 'Financials',         desc: 'MRR, burn rate, runway, CAC, LTV, and financial model quality' },
]

const PROFILE_SECTIONS = [
  { n: 'S1', label: 'Market Validation',    tip: 'Customer interviews, paying customers, MRR, churn, LOIs, pilots' },
  { n: 'S2', label: 'Market & Competition', tip: 'TAM/SAM/SOM with sources, named competitors, your differentiator' },
  { n: 'S3', label: 'IP & Technology',      tip: 'What makes your tech hard to copy — data moat, patents, proprietary model' },
  { n: 'S4', label: 'Founder & Team',       tip: 'Relevant prior experience, domain expertise, advisors, co-founder split' },
  { n: 'S5', label: 'Financials',           tip: 'MRR, burn, runway, CAC, LTV, ACV, growth rate, funding history' },
]

const PLAYBOOK_DELIVERABLES = [
  { id: 'AS001', label: 'ICP Profiles',                     desc: 'Ideal Customer Profile — buyer segments, firmographics, and entry segment recommendation' },
  { id: 'AS002', label: 'Pains & Gains Matrix',              desc: 'Ranked pains and gains, and the positioning angle they point to' },
  { id: 'AS003', label: 'Buyer Journey Map',                 desc: 'The path from unaware to purchase, with touchpoints per stage' },
  { id: 'AS004', label: 'Positioning & Messaging Framework', desc: 'Category play, value pillars, and core message hierarchy' },
  { id: 'AS005', label: 'Channel Strategy',                  desc: 'Which acquisition channels to prioritise, and why' },
]

const MARKETPLACE_STEPS = [
  { step: '1', title: 'Browse',  desc: "Filter by your stage (pre-seed, seed, Series A) and industry. Read each investor's thesis." },
  { step: '2', title: 'Connect', desc: 'Send a personalised connection request. Investors see your Q-Score and one-line pitch before accepting.' },
  { step: '3', title: 'Message', desc: 'Once accepted, messaging unlocks. Use your Patel deliverables as conversation starters.' },
  { step: '4', title: 'Raise',   desc: 'Move conversations forward directly in the platform. Your agent-built deliverables do the heavy lifting.' },
]

const MESSAGING_TIPS = [
  { label: 'First message', tip: 'Reference why you connected — their thesis, a portfolio company, a specific insight. Under 100 words.' },
  { label: 'Follow up',     tip: 'Attach a relevant Growth deliverable, like your Positioning Framework. Let the artifact do the talking.' },
  { label: 'Ask',           tip: 'Be specific: "30-minute intro call" beats "catch up". Include your Calendly or a specific time.' },
]

const LIBRARY_ITEMS = [
  { label: 'ICP Profiles',           desc: 'AS001 — buyer segments and entry segment recommendation' },
  { label: 'Pains & Gains Matrix',   desc: 'AS002 — ranked pains, gains, and positioning angle' },
  { label: 'Buyer Journey Map',      desc: 'AS003 — the path from unaware to purchase' },
  { label: 'Positioning & Messaging', desc: 'AS004 — value pillars and core message hierarchy' },
  { label: 'Channel Strategy',       desc: 'AS005 — which acquisition channels to prioritise' },
]

const QUICK_START = [
  { period: 'Day 1',  action: 'Complete your profile',              detail: 'Fill all 5 Profile Builder sections to calculate your Q-Score. The more evidence you provide, the higher your score.' },
  { period: 'Week 1', action: 'Confirm your mandate',                detail: "Review the CEO's proposed Executive Contract and confirm it. That activates Growth's GTM program — Patel's team gets to work immediately, no messages required." },
  { period: 'Week 2', action: 'Read your first Executive Briefing',  detail: "Your ICP, Pains & Gains, Buyer Journey, Positioning, and Channel Strategy appear as living documents. Open any of them, edit directly if something's off — it's used next cycle." },
  { period: 'Week 3', action: 'Send your first investor connection', detail: 'Browse the Investor Marketplace. Filter by stage and industry. Send a personalised connection request with your pitch.' },
  { period: 'Day 30', action: 'Review your Q-Score progress',        detail: "Head to your dashboard. If your Q-Score improved, you've unlocked more investor visibility. If not, check which P-score is lowest and focus there." },
]

export default function GettingStartedPage() {
  return (
    <div style={{ background: bg, color: ink, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          body { background: white !important; }
          a { color: inherit !important; }
        }
        @page { margin: 1.2cm; }
      `}</style>

      {/* Nav */}
      <div className="no-print" style={{ borderBottom: `1px solid ${bdr}`, padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: bg, zIndex: 10 }}>
        <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: ink, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {APP_NAME}
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/founder/dashboard" style={{ fontSize: 12, color: muted, textDecoration: 'none', padding: '6px 14px', border: `1px solid ${bdr}`, borderRadius: 8 }}>
            ← Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            style={{ fontSize: 12, color: white, background: ink, border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 8, fontWeight: 600 }}
          >
            Save as PDF ↓
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 32px 96px' }}>

        {/* ── Slide 1: Welcome ───────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 88 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: muted, marginBottom: 18 }}>
            Getting Started Guide
          </p>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 300, letterSpacing: '-0.04em', color: ink, marginBottom: 16, lineHeight: 1.1 }}>
            Welcome to {APP_NAME}
          </h1>
          <p style={{ fontSize: 16, color: muted, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.65 }}>
            {APP_TAGLINE}. Your AI team is ready. Here&apos;s how to get the most from the platform in your first 30 days.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
            {(['Q-Score', '5 AI Executives', 'GTM Deliverables', 'Investor Matching'] as const).map(f => (
              <div key={f} style={{ fontSize: 12, color: muted, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 5, height: 5, background: blue, borderRadius: '50%' }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* ── Slide 2: Q-Score ──────────────────────────────────────────── */}
        <Section n="02" title="Your Q-Score">
          <SectionDesc>The Q-Score is a 0–100 composite score that tells investors how investment-ready your startup is. It&apos;s calculated across 6 parameters — the more evidence you provide, the higher your score.</SectionDesc>

          <GridPanel cols={2}>
            {PARAMETERS.map((p, i) => (
              <Cell key={p.id} right={i % 2 === 0} bottom={i < PARAMETERS.length - 2}>
                <Tag>{p.id}</Tag>
                <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginTop: 8 }}>{p.label}</div>
                <p style={{ fontSize: 12, color: muted, margin: '4px 0 0', lineHeight: 1.5 }}>{p.desc}</p>
              </Cell>
            ))}
          </GridPanel>

          <Callout>
            <strong>Grade scale:</strong> A (80+) · B (65–79) · C (50–64) · D (35–49) · F (below 35). Investors on the Marketplace filter by grade — aim for B or above to maximise visibility.
          </Callout>
        </Section>

        {/* ── Slide 3: Profile Builder ───────────────────────────────────── */}
        <Section n="03" title="The Profile Builder">
          <SectionDesc>The Profile Builder is how your Q-Score gets calculated. It has 5 sections — fill each one with as much quantitative evidence as you can. Numbers always beat adjectives.</SectionDesc>

          <RowPanel>
            {PROFILE_SECTIONS.map((s, i) => (
              <Row key={s.n} last={i === PROFILE_SECTIONS.length - 1}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <Tag style={{ marginTop: 2 }}>{s.n}</Tag>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{s.label}</div>
                    <p style={{ fontSize: 12, color: muted, margin: '3px 0 0', lineHeight: 1.5 }}>Evidence that matters: {s.tip}</p>
                  </div>
                </div>
              </Row>
            ))}
          </RowPanel>

          <SectionLink href="/founder/profile-builder">Open Profile Builder →</SectionLink>
        </Section>

        {/* ── Slide 4: Executive team ────────────────────────────────────── */}
        <Section n="04" title="Meet Your Executive Team">
          <SectionDesc>5 AI executives — CEO, Growth, Product, Operations, and Finance. They don&apos;t wait to be asked: once you confirm a mandate, an executive works to it on a weekly rhythm and hands you real, versioned deliverables — not chat replies. Growth is live today, running your Go-to-Market program; the rest come online as their programs ship.</SectionDesc>

          <RowPanel>
            {EXECUTIVES.map((a, i) => (
              <Row key={a.id} last={i === EXECUTIVES.length - 1}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  {a.name && <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>{a.name}</span>}
                  <span style={{ fontSize: 11, color: muted }}>{a.role}</span>
                </div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{a.desc}</p>
              </Row>
            ))}
          </RowPanel>

          <SectionLink href="/founder/executive">Open your Command View →</SectionLink>
        </Section>

        {/* ── Slide 5: Patel's GTM deliverables ──────────────────────────── */}
        <Section n="05" title={<>Patel&apos;s GTM Deliverables</>}>
          <SectionDesc>Growth builds five deliverables on the weekly Operating Rhythm — no prompting needed. Each cycle re-runs and sharpens them further as your Q-Score profile and Assets improve.</SectionDesc>

          <RowPanel>
            {PLAYBOOK_DELIVERABLES.map((d, i) => (
              <Row key={d.id} last={i === PLAYBOOK_DELIVERABLES.length - 1}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: muted, flexShrink: 0, minWidth: 46 }}>{d.id}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.label}</div>
                    <p style={{ fontSize: 12, color: muted, margin: '3px 0 0', lineHeight: 1.5 }}>{d.desc}</p>
                  </div>
                </div>
              </Row>
            ))}
          </RowPanel>

          <Callout>
            <strong>How each deliverable actually gets built:</strong> confirming your mandate activates the GTM program — the rhythm runs it every week and versions each document as it improves. Open any deliverable in your Command View to read it, or edit it directly — that edit becomes the new version, used immediately, no approval needed.
          </Callout>
        </Section>

        {/* ── Slide 6: Investor Marketplace ─────────────────────────────── */}
        <Section n="06" title="The Investor Marketplace">
          <SectionDesc>Browse 200+ investors filtered by stage, industry, check size, and geography. Your Q-Score is displayed on every profile — investors use it to shortlist founders before accepting connections.</SectionDesc>

          <GridPanel cols={2}>
            {MARKETPLACE_STEPS.map((s, i) => (
              <Cell key={s.step} right={i % 2 === 0} bottom={i < MARKETPLACE_STEPS.length - 2}>
                <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Step {s.step}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 6 }}>{s.title}</div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </Cell>
            ))}
          </GridPanel>

          <SectionLink href="/founder/matching">Open Marketplace →</SectionLink>
        </Section>

        {/* ── Slide 7: Messaging ────────────────────────────────────────── */}
        <Section n="07" title="Messaging & Connections">
          <SectionDesc>Messaging is available once an investor accepts your connection request. Keep it short, specific, and evidence-driven — investors read dozens of messages a week.</SectionDesc>

          <RowPanel>
            {MESSAGING_TIPS.map((m, i) => (
              <Row key={m.label} last={i === MESSAGING_TIPS.length - 1}>
                <div style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 4 }}>{m.label}</div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{m.tip}</p>
              </Row>
            ))}
          </RowPanel>
        </Section>

        {/* ── Slide 8: Library ──────────────────────────────────────────── */}
        <Section n="08" title="Your Deliverables Library">
          <SectionDesc>Every Asset your executives build is versioned and kept here. You can read, edit, or share any version in investor conversations.</SectionDesc>

          <RowPanel>
            {LIBRARY_ITEMS.map((l, i) => (
              <Row key={l.label} last={i === LIBRARY_ITEMS.length - 1}>
                <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 3 }}>{l.label}</div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{l.desc}</p>
              </Row>
            ))}
          </RowPanel>

          <SectionLink href="/founder/executive">Open your Library →</SectionLink>
        </Section>

        {/* ── Slide 9: 30-Day Plan ──────────────────────────────────────── */}
        <Section n="09" title="Your 30-Day Quick-Start Plan">
          <SectionDesc>This is your activation checklist. Complete each step in order — each one builds on the last.</SectionDesc>

          <RowPanel>
            {QUICK_START.map((s, i) => (
              <Row key={s.period} last={i === QUICK_START.length - 1}>
                <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, width: 56, fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', paddingTop: 2 }}>
                    {s.period}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 4 }}>{s.action}</div>
                    <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{s.detail}</p>
                  </div>
                </div>
              </Row>
            ))}
          </RowPanel>

          <div style={{ marginTop: 40, textAlign: 'center', padding: '36px 24px', border: `1px solid ${bdr}`, borderRadius: 14 }}>
            <p style={{ fontSize: 18, fontWeight: 300, color: ink, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Your AI team is waiting.
            </p>
            <p style={{ fontSize: 13, color: muted, marginBottom: 26 }}>
              Start with your profile, then confirm your mandate. Everything else follows.
            </p>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Link href="/founder/profile-builder" style={{ fontSize: 13, fontWeight: 600, color: white, background: ink, padding: '10px 22px', borderRadius: 999, textDecoration: 'none' }}>
                Complete my profile
              </Link>
              <Link href="/founder/executive" style={{ fontSize: 13, fontWeight: 600, color: ink, background: 'transparent', padding: '10px 22px', borderRadius: 999, border: `1px solid ${bdr}`, textDecoration: 'none' }}>
                Open Command View
              </Link>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 32, borderTop: `1px solid ${bdr}`, marginTop: 24 }}>
          <p style={{ fontSize: 11, color: muted }}>
            {APP_NAME} · {new Date().getFullYear()} · <span className="no-print"><Link href="/founder/dashboard" style={{ color: muted }}>Back to dashboard</Link></span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Layout primitives ──────────────────────────────────────────────────────────
// One outer bordered panel per section instead of a separate card per list item — the same
// content read as "busy" when every P-score/deliverable/step had its own border, background
// and radius. A single panel with hairline row/cell dividers reads as one clean spec sheet.

function Section({ n, title, children }: { n: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 88 }} className="page-break">
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: muted, marginBottom: 10 }}>
        {n} / 09
      </p>
      <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 300, letterSpacing: '-0.03em', color: ink, marginBottom: 14 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {children}
      </div>
    </div>
  )
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, color: muted, lineHeight: 1.65, maxWidth: 560, margin: 0 }}>
      {children}
    </p>
  )
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: blue, textDecoration: 'none', fontWeight: 500 }}>
      {children}
    </Link>
  )
}

function Tag({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, color: muted, border: `1px solid ${bdr}`, borderRadius: 6, padding: '2px 7px', letterSpacing: '0.04em', ...style }}>
      {children}
    </span>
  )
}

function RowPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden' }}>
      {children}
    </div>
  )
}

function Row({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: last ? 'none' : `1px solid ${bdr}` }}>
      {children}
    </div>
  )
}

function GridPanel({ children, cols }: { children: React.ReactNode; cols: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden' }}>
      {children}
    </div>
  )
}

function Cell({ children, right, bottom }: { children: React.ReactNode; right?: boolean; bottom?: boolean }) {
  return (
    <div style={{ padding: '18px 20px', borderRight: right ? `1px solid ${bdr}` : 'none', borderBottom: bottom ? `1px solid ${bdr}` : 'none' }}>
      {children}
    </div>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 18px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
      <p style={{ fontSize: 12, color: ink, margin: 0, lineHeight: 1.6 }}>{children}</p>
    </div>
  )
}
