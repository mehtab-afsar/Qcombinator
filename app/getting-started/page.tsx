'use client'

import Link from 'next/link'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants/app'
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

const green  = '#16A34A'
const amber  = '#D97706'
const purple = '#7C3AED'
const cyan   = '#0891B2'

const EXECUTIVES = [
  { id: 'ceo',        role: 'CEO / Chief of Staff',    name: 'Morgan', desc: 'Turns your Q-Score into a Mandate — the Executive Contract that decides which Programs run' },
  { id: 'growth',     role: 'Chief Growth Officer',    name: 'Patel',  desc: 'Owns Go-to-Market: ICP, positioning, messaging, and channel strategy — live today' },
  { id: 'product',    role: 'Chief Technology Officer',name: null,     desc: 'Product & Technology' },
  { id: 'operations', role: 'Chief Operations Officer',name: null,     desc: 'Runs the operating rhythm across the company' },
  { id: 'finance',    role: 'Chief Financial Officer', name: null,     desc: 'Keeps the company alive and fundable' },
]

const PARAMETERS = [
  { id: 'P1', label: 'Market Readiness',    color: blue,   desc: 'Validated demand — paying customers, discovery interviews, signed LOIs' },
  { id: 'P2', label: 'Market Potential',    color: green,  desc: 'TAM/SAM/SOM sizing, growth tailwinds, and competitive white space' },
  { id: 'P3', label: 'IP & Defensibility',  color: purple, desc: 'Technical moat, proprietary data, patents, or network effects' },
  { id: 'P4', label: 'Founder & Team',      color: amber,  desc: 'Relevant domain expertise, execution history, and team completeness' },
  { id: 'P5', label: 'Structural Impact',   color: cyan,   desc: 'Scalability, gross margins, and unit economics potential' },
  { id: 'P6', label: 'Financials',          color: ink,    desc: 'MRR, burn rate, runway, CAC, LTV, and financial model quality' },
]

const PLAYBOOK_DELIVERABLES = [
  { id: 'AS001', label: 'ICP Profiles',                       color: blue,      desc: 'Ideal Customer Profile — buyer segments, firmographics, and entry segment recommendation' },
  { id: 'AS002', label: 'Pains & Gains Matrix',                color: green,     desc: 'Ranked pains and gains, and the positioning angle they point to' },
  { id: 'AS003', label: 'Buyer Journey Map',                   color: purple,    desc: 'The path from unaware to purchase, with touchpoints per stage' },
  { id: 'AS004', label: 'Positioning & Messaging Framework',   color: amber,     desc: 'Category play, value pillars, and core message hierarchy' },
  { id: 'AS005', label: 'Channel Strategy',                    color: cyan,      desc: 'Which acquisition channels to prioritise, and why' },
]

const QUICK_START = [
  { period: 'Day 1',    action: 'Complete your profile',         detail: 'Fill all 5 Profile Builder sections to calculate your Q-Score. The more evidence you provide, the higher your score.' },
  { period: 'Week 1',   action: 'Confirm your mandate',          detail: 'Review the CEO\'s proposed Executive Contract and confirm it. That activates Growth\'s GTM program — Patel\'s team gets to work immediately, no messages required.' },
  { period: 'Week 2',   action: 'Read your first Executive Briefing', detail: 'Your ICP, Pains & Gains, Buyer Journey, Positioning, and Channel Strategy appear as living documents. Open any of them, edit directly if something\'s off — it\'s used next cycle.' },
  { period: 'Week 3',   action: 'Send your first investor connection', detail: 'Browse the Investor Marketplace. Filter by stage and industry. Send a personalised connection request with your pitch.' },
  { period: 'Day 30',   action: 'Review your Q-Score progress', detail: 'Head to your dashboard. If your Q-Score improved, you\'ve unlocked more investor visibility. If not, check which P-score is lowest and focus there.' },
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
            style={{ fontSize: 12, color: '#fff', background: ink, border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 8, fontWeight: 600 }}
          >
            Save as PDF ↓
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 32px 96px' }}>

        {/* ── Slide 1: Welcome ───────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: muted, marginBottom: 16 }}>
            Getting Started Guide
          </p>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 300, letterSpacing: '-0.04em', color: ink, marginBottom: 16, lineHeight: 1.1 }}>
            Welcome to {APP_NAME}
          </h1>
          <p style={{ fontSize: 16, color: muted, maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.6 }}>
            {APP_TAGLINE}. Your AI team is ready. Here&apos;s how to get the most from the platform in your first 30 days.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
            {(['Q-Score', '5 AI Executives', 'GTM Deliverables', 'Investor Matching'] as const).map(f => (
              <div key={f} style={{ fontSize: 12, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, background: blue, borderRadius: '50%' }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${bdr}`, marginBottom: 72 }} />

        {/* ── Slide 2: Q-Score ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="02" />
          <SectionTitle>Your Q-Score</SectionTitle>
          <SectionDesc>The Q-Score is a 0–100 composite score that tells investors how investment-ready your startup is. It&apos;s calculated across 6 parameters — the more evidence you provide, the higher your score.</SectionDesc>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 24 }}>
            {PARAMETERS.map(p => (
              <div key={p.id} style={{ padding: '16px 18px', background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: p.color, background: p.color + '15', padding: '2px 7px', borderRadius: 6, letterSpacing: '0.05em' }}>{p.id}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{p.label}</span>
                </div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{p.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: '14px 18px', background: blue + '08', border: `1px solid ${blue}30`, borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: ink, margin: 0 }}>
              <strong>Grade scale:</strong> A (80+) · B (65–79) · C (50–64) · D (35–49) · F (below 35). Investors on the Marketplace filter by grade — aim for B or above to maximise visibility.
            </p>
          </div>
        </div>

        {/* ── Slide 3: Profile Builder ───────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="03" />
          <SectionTitle>The Profile Builder</SectionTitle>
          <SectionDesc>The Profile Builder is how your Q-Score gets calculated. It has 5 sections — fill each one with as much quantitative evidence as you can. Numbers always beat adjectives.</SectionDesc>

          <ol style={{ margin: '24px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { n: 'S1', label: 'Market Validation',    tip: 'Customer interviews, paying customers, MRR, churn, LOIs, pilots' },
              { n: 'S2', label: 'Market & Competition', tip: 'TAM/SAM/SOM with sources, named competitors, your differentiator' },
              { n: 'S3', label: 'IP & Technology',      tip: 'What makes your tech hard to copy — data moat, patents, proprietary model' },
              { n: 'S4', label: 'Founder & Team',       tip: 'Relevant prior experience, domain expertise, advisors, co-founder split' },
              { n: 'S5', label: 'Financials',           tip: 'MRR, burn, runway, CAC, LTV, ACV, growth rate, funding history' },
            ].map(s => (
              <li key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: muted, flexShrink: 0, paddingTop: 1 }}>{s.n}</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{s.label}</span>
                  <p style={{ fontSize: 12, color: muted, margin: '3px 0 0', lineHeight: 1.5 }}>Evidence that matters: {s.tip}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link href="/founder/profile-builder" className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 12, color: blue, textDecoration: 'none', fontWeight: 500 }}>
            Open Profile Builder →
          </Link>
        </div>

        {/* ── Slide 4: Agents ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="04" />
          <SectionTitle>Meet Your Executive Team</SectionTitle>
          <SectionDesc>5 AI executives — CEO, Growth, Product, Operations, and Finance. They don&apos;t wait to be asked: once you confirm a mandate, an executive works to it on a weekly rhythm and hands you real, versioned deliverables — not chat replies. Growth is live today, running your Go-to-Market program; the rest come online as their programs ship.</SectionDesc>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 24 }}>
            {EXECUTIVES.map(a => (
              <div key={a.id} style={{ padding: '14px 16px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {a.name && <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>{a.name}</span>}
                  <span style={{ fontSize: 10, fontWeight: 600, color: muted, background: bdr, padding: '1px 6px', borderRadius: 4 }}>{a.role}</span>
                </div>
                <p style={{ fontSize: 11, color: muted, margin: 0, lineHeight: 1.5 }}>{a.desc}</p>
              </div>
            ))}
          </div>

          <Link href="/founder/executive" className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 12, color: blue, textDecoration: 'none', fontWeight: 500 }}>
            Open your Command View →
          </Link>
        </div>

        {/* ── Slide 5: Patel's GTM deliverables ──────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="05" />
          <SectionTitle>Patel&apos;s GTM Deliverables</SectionTitle>
          <SectionDesc>Growth builds five deliverables on the weekly Operating Rhythm — no prompting needed. Each cycle re-runs and sharpens them further as your Q-Score profile and Assets improve.</SectionDesc>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
            {PLAYBOOK_DELIVERABLES.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 18px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: d.color, flexShrink: 0, minWidth: 28 }}>{d.id}</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.label}</span>
                  <p style={{ fontSize: 12, color: muted, margin: '3px 0 0', lineHeight: 1.5 }}>{d.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: '14px 18px', background: green + '08', border: `1px solid ${green}30`, borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: ink, margin: 0 }}>
              <strong>How each deliverable actually gets built:</strong> confirming your mandate activates the GTM program — the rhythm runs it every week and versions each document as it improves. Open any deliverable in your Command View to read it, or edit it directly — that edit becomes the new version, used immediately, no approval needed.
            </p>
          </div>
        </div>

        {/* ── Slide 6: Investor Marketplace ─────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="06" />
          <SectionTitle>The Investor Marketplace</SectionTitle>
          <SectionDesc>Browse 200+ investors filtered by stage, industry, check size, and geography. Your Q-Score is displayed on every profile — investors use it to shortlist founders before accepting connections.</SectionDesc>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 24 }}>
            {[
              { step: '1', title: 'Browse', desc: 'Filter by your stage (pre-seed, seed, Series A) and industry. Read each investor\'s thesis.' },
              { step: '2', title: 'Connect', desc: 'Send a personalised connection request. Investors see your Q-Score and one-line pitch before accepting.' },
              { step: '3', title: 'Message', desc: 'Once accepted, messaging unlocks. Use your Patel deliverables as conversation starters.' },
              { step: '4', title: 'Raise', desc: 'Move conversations forward directly in the platform. Your agent-built deliverables do the heavy lifting.' },
            ].map(s => (
              <div key={s.step} style={{ padding: '16px 18px', background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>Step {s.step}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 6 }}>{s.title}</div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          <Link href="/founder/matching" className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 12, color: blue, textDecoration: 'none', fontWeight: 500 }}>
            Open Marketplace →
          </Link>
        </div>

        {/* ── Slide 7: Messaging ────────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="07" />
          <SectionTitle>Messaging & Connections</SectionTitle>
          <SectionDesc>Messaging is available once an investor accepts your connection request. Keep it short, specific, and evidence-driven — investors read dozens of messages a week.</SectionDesc>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'First message', tip: 'Reference why you connected — their thesis, a portfolio company, a specific insight. Under 100 words.' },
              { label: 'Follow up',     tip: 'Attach a relevant Growth deliverable, like your Positioning Framework. Let the artifact do the talking.' },
              { label: 'Ask',           tip: 'Be specific: "30-minute intro call" beats "catch up". Include your Calendly or a specific time.' },
            ].map(m => (
              <div key={m.label} style={{ padding: '14px 18px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 4 }}>{m.label}</div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{m.tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Slide 8: Library ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="08" />
          <SectionTitle>Your Deliverables Library</SectionTitle>
          <SectionDesc>Every Asset your executives build is versioned and kept here. You can read, edit, or share any version in investor conversations.</SectionDesc>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 24 }}>
            {[
              { label: 'ICP Profiles',              desc: 'AS001 — buyer segments and entry segment recommendation' },
              { label: 'Pains & Gains Matrix',       desc: 'AS002 — ranked pains, gains, and positioning angle' },
              { label: 'Buyer Journey Map',          desc: 'AS003 — the path from unaware to purchase' },
              { label: 'Positioning & Messaging',    desc: 'AS004 — value pillars and core message hierarchy' },
              { label: 'Channel Strategy',           desc: 'AS005 — which acquisition channels to prioritise' },
            ].map(l => (
              <div key={l.label} style={{ padding: '14px 16px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{l.label}</div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{l.desc}</p>
              </div>
            ))}
          </div>

          <Link href="/founder/executive" className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 12, color: blue, textDecoration: 'none', fontWeight: 500 }}>
            Open your Library →
          </Link>
        </div>

        {/* ── Slide 9: 30-Day Plan ──────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="09" />
          <SectionTitle>Your 30-Day Quick-Start Plan</SectionTitle>
          <SectionDesc>This is your activation checklist. Complete each step in order — each one builds on the last.</SectionDesc>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            {QUICK_START.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 18px', background: surf, border: `1px solid ${bdr}`, borderRadius: 12 }}>
                <div style={{ flexShrink: 0, width: 52, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.period}</div>
                </div>
                <div style={{ width: 1, background: bdr, flexShrink: 0, alignSelf: 'stretch' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 4 }}>{s.action}</div>
                  <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, textAlign: 'center', padding: '32px 24px', background: surf, border: `1px solid ${bdr}`, borderRadius: 16 }}>
            <p style={{ fontSize: 18, fontWeight: 300, color: ink, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Your AI team is waiting.
            </p>
            <p style={{ fontSize: 13, color: muted, marginBottom: 24 }}>
              Start with your profile, then confirm your mandate. Everything else follows.
            </p>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Link href="/founder/profile-builder" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: ink, padding: '10px 22px', borderRadius: 10, textDecoration: 'none' }}>
                Complete my profile
              </Link>
              <Link href="/founder/executive" style={{ fontSize: 13, fontWeight: 600, color: ink, background: 'transparent', padding: '10px 22px', borderRadius: 10, border: `1px solid ${bdr}`, textDecoration: 'none' }}>
                Open Command View
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 32, borderTop: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 11, color: muted }}>
            {APP_NAME} · {new Date().getFullYear()} · <span className="no-print"><Link href="/founder/dashboard" style={{ color: muted }}>Back to dashboard</Link></span>
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ n }: { n: string }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: muted, marginBottom: 10 }}>
      {n} / 09
    </p>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 300, letterSpacing: '-0.03em', color: '#000', marginBottom: 12 }}>
      {children}
    </h2>
  )
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, color: muted, lineHeight: 1.65, maxWidth: 600 }}>
      {children}
    </p>
  )
}
