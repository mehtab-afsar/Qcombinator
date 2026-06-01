'use client'

import Link from 'next/link'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants/app'
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

const green  = '#16A34A'
const amber  = '#D97706'
const purple = '#7C3AED'
const cyan   = '#0891B2'

const AGENTS = [
  { id: 'patel',  role: 'CMO',  name: 'Patel',  desc: 'GTM strategy, ICP definition, positioning, and 90-day launch plan' },
  { id: 'susi',   role: 'CRO',  name: 'Susi',   desc: 'Sales process, outreach cadences, pipeline management, and deal review' },
  { id: 'maya',   role: 'Brand',name: 'Maya',   desc: 'Brand audit, one-pager, blog content, landing page copy, and social' },
  { id: 'felix',  role: 'CFO',  name: 'Felix',  desc: 'Financial model, runway alerts, board updates, and investor memos' },
  { id: 'leo',    role: 'CLO',  name: 'Leo',    desc: 'SAFE agreements, NDAs, privacy policy, contractor contracts, and IP audit' },
  { id: 'harper', role: 'CHRO', name: 'Harper', desc: 'Job descriptions, offer letters, rejection emails, and equity policy' },
  { id: 'nova',   role: 'CPO',  name: 'Nova',   desc: 'Feature prioritisation, PMF analysis, cohort analysis, and user interviews' },
  { id: 'atlas',  role: 'CSO',  name: 'Atlas',  desc: 'Competitor tracking, market sizing, tech-stack detection, and battle cards' },
  { id: 'sage',   role: 'CEO',  name: 'Sage',   desc: 'Strategic plan, OKRs, investor updates, Linear sync, and weekly standup' },
  { id: 'carter', role: 'CSM',  name: 'Carter', desc: 'Customer success playbook, churn risk analysis, and account health' },
  { id: 'riley',  role: 'Growth',name:'Riley',  desc: 'Growth experiments, ad creative, SEO strategy, and growth accounting' },
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
  { id: 'D1', label: 'ICP',                  color: blue,   desc: 'Ideal Customer Profile — 3 buyer segments, firmographics, decision-maker map, and entry segment recommendation' },
  { id: 'D2', label: 'Pains & Gains',        color: green,  desc: 'Top 5 pains (ranked by severity), top 5 gains, 3 emotional triggers, and recommended positioning angle' },
  { id: 'D3', label: 'Buyer Journey',        color: purple, desc: '5-stage journey from Unaware → Purchase, with content and sales touchpoints per stage' },
  { id: 'D4', label: 'Positioning',          color: amber,  desc: 'Category play, 3 value pillars, competitive displacement map, and core message hierarchy' },
  { id: 'D5', label: 'Competitive Intel',    color: cyan,   desc: 'Competitor profiles, battle cards, pricing landscape, and differentiation matrix' },
  { id: 'D6', label: 'GTM Playbook',         color: '#DC2626', desc: 'Full 9-section playbook: ICP → Channels → Budget → 90-Day Plan → Dashboard → Actions → Risks → Success State' },
]

const GTM_SECTIONS = [
  { n: '§1', title: 'Commercial Objective',          desc: 'North-star revenue goal, ARR/MRR target, and key success metrics' },
  { n: '§2', title: 'ICP + Positioning + Messaging', desc: 'Segment table, value pillars, and audience-specific messaging by segment' },
  { n: '§3', title: 'Channel Strategy',              desc: 'Ranked channel mix with rationale, CAC estimates, and monthly reach projections' },
  { n: '§4', title: 'Budget Table',                  desc: 'Monthly spend allocation by channel for the 90-day window' },
  { n: '§5', title: '90-Day GTM Plan',               desc: 'Week-by-week execution grid with milestones, owners, and expected outputs' },
  { n: '§6', title: 'Commercial Dashboard',          desc: 'Pipeline, Revenue, Efficiency, and Key Metrics KPIs with target values' },
  { n: '§7', title: 'Prioritised Action Stack',      desc: 'Top 5 immediate actions ranked by impact and effort' },
  { n: '§8', title: 'Risks & GTM Hypotheses',        desc: 'Top 3 risks with mitigation, and 3 testable GTM hypotheses' },
  { n: '§9', title: 'End-of-90-Day Success State',   desc: 'What "done" looks like — quantitative targets and qualitative milestones' },
]

const QUICK_START = [
  { period: 'Day 1',    action: 'Complete your profile',         detail: 'Fill all 5 Profile Builder sections to calculate your Q-Score. The more evidence you provide, the higher your score.' },
  { period: 'Week 1',   action: 'Run D1→D4 with Patel',         detail: 'Open the Patel workspace from your CXO hub. One message per deliverable — D1 first, then D2, D3, D4 in sequence.' },
  { period: 'Week 2',   action: 'Generate your D6 GTM Playbook',detail: 'Once D1–D4 are done, ask Patel to build D6. This is your 9-section go-to-market playbook — export it as a PDF.' },
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
            {(['Q-Score', '11 AI Agents', 'GTM Playbook', 'Investor Matching'] as const).map(f => (
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
          <SectionTitle>Meet Your CXO Agents</SectionTitle>
          <SectionDesc>11 AI agents — each modelled on a different C-suite executive. They don&apos;t give generic advice. They build real deliverables: contracts, financial models, GTM strategies, and more.</SectionDesc>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 24 }}>
            {AGENTS.map(a => (
              <div key={a.id} style={{ padding: '14px 16px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>{a.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: muted, background: bdr, padding: '1px 6px', borderRadius: 4 }}>{a.role}</span>
                </div>
                <p style={{ fontSize: 11, color: muted, margin: 0, lineHeight: 1.5 }}>{a.desc}</p>
              </div>
            ))}
          </div>

          <Link href="/founder/cxo" className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 12, color: blue, textDecoration: 'none', fontWeight: 500 }}>
            Open CXO Hub →
          </Link>
        </div>

        {/* ── Slide 5: Patel D1→D6 ──────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="05" />
          <SectionTitle>Patel&apos;s D1→D6 Playbook System</SectionTitle>
          <SectionDesc>Patel (CMO) builds six deliverables in sequence. Each unlocks the next — you must complete D1 before D2, and so on. They culminate in D6, the full 9-section GTM Playbook.</SectionDesc>

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
              <strong>How to trigger each deliverable:</strong> Open the Patel workspace, provide company context and the signal Patel asks for, then write &quot;Proceed and build D1 now&quot;. Patel will build the artifact and show a &quot;View document&quot; button when ready.
            </p>
          </div>
        </div>

        {/* ── Slide 6: GTM Playbook sections ────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="06" />
          <SectionTitle>Inside the GTM Playbook (D6)</SectionTitle>
          <SectionDesc>D6 is a 9-section document built from your D1–D4 outputs. It&apos;s the most comprehensive deliverable — export it as a PDF and share it with your team or investors.</SectionDesc>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
            {GTM_SECTIONS.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 14, padding: '12px 16px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: muted, flexShrink: 0, minWidth: 24 }}>{s.n}</span>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{s.title}</span>
                  <span style={{ fontSize: 12, color: muted }}> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Slide 7: Investor Marketplace ─────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="07" />
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

          <Link href="/founder/marketplace" className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 12, color: blue, textDecoration: 'none', fontWeight: 500 }}>
            Open Marketplace →
          </Link>
        </div>

        {/* ── Slide 8: Messaging ────────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="08" />
          <SectionTitle>Messaging & Connections</SectionTitle>
          <SectionDesc>Messaging is available once an investor accepts your connection request. Keep it short, specific, and evidence-driven — investors read dozens of messages a week.</SectionDesc>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'First message', tip: 'Reference why you connected — their thesis, a portfolio company, a specific insight. Under 100 words.' },
              { label: 'Follow up',     tip: 'Attach a relevant Patel deliverable or your GTM Playbook. Let the artifact do the talking.' },
              { label: 'Ask',           tip: 'Be specific: "30-minute intro call" beats "catch up". Include your Calendly or a specific time.' },
            ].map(m => (
              <div key={m.label} style={{ padding: '14px 18px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 4 }}>{m.label}</div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{m.tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Slide 9: Library ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="09" />
          <SectionTitle>Your Deliverables Library</SectionTitle>
          <SectionDesc>Every artifact Patel or your other agents build is stored in your library as a PDF. You can download, share, or use them in investor conversations.</SectionDesc>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 24 }}>
            {[
              { label: 'ICP Document',         desc: 'D1 — 3 buyer segments, persona map, and entry segment recommendation' },
              { label: 'Pains & Gains',        desc: 'D2 — 5 pains, 5 gains, and emotional trigger framework' },
              { label: 'Buyer Journey Map',    desc: 'D3 — 5-stage sales and marketing journey with touchpoints' },
              { label: 'Positioning Matrix',   desc: 'D4 — Value pillars, competitive map, and message hierarchy' },
              { label: 'GTM Playbook',         desc: 'D6 — Full 9-section go-to-market strategy' },
              { label: 'Agent Deliverables',   desc: 'All other outputs from Felix, Leo, Harper, Nova, and more' },
            ].map(l => (
              <div key={l.label} style={{ padding: '14px 16px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{l.label}</div>
                <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.5 }}>{l.desc}</p>
              </div>
            ))}
          </div>

          <Link href="/founder/cxo" className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 12, color: blue, textDecoration: 'none', fontWeight: 500 }}>
            Open your Library →
          </Link>
        </div>

        {/* ── Slide 10: 30-Day Plan ─────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }} className="page-break">
          <SectionLabel n="10" />
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
              Start with your profile, then meet Patel. Everything else follows.
            </p>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Link href="/founder/profile-builder" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: ink, padding: '10px 22px', borderRadius: 10, textDecoration: 'none' }}>
                Complete my profile
              </Link>
              <Link href="/founder/cxo/patel" style={{ fontSize: 13, fontWeight: 600, color: ink, background: 'transparent', padding: '10px 22px', borderRadius: 10, border: `1px solid ${bdr}`, textDecoration: 'none' }}>
                Open Patel
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
      {n} / 10
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
