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

/** Which agent owns challenging/coaching each dimension. Was defined twice — once here-shaped
 *  in the dashboard, once independently in the daily-priority API route — and the two copies
 *  had drifted apart for p3 (leo vs nova), so the same weak dimension pointed a founder at a
 *  different agent depending on which section of the page they were looking at. leo is correct
 *  (IP/Defensibility is patents & legal moat, leo's domain, not nova's product/PMF one) — both
 *  call sites now import this instead of keeping their own copy. */
export const DIM_AGENTS: Record<string, { agentId: string; agentName: string; label: string }> = {
  p1: { agentId: 'patel',  agentName: 'Patel',  label: 'GTM Playbook'         },
  p2: { agentId: 'atlas',  agentName: 'Atlas',  label: 'Competitive Analysis' },
  p3: { agentId: 'leo',    agentName: 'Leo',    label: 'Legal Checklist'      },
  p4: { agentId: 'harper', agentName: 'Harper', label: 'Hiring Plan'          },
  p5: { agentId: 'sage',   agentName: 'Sage',   label: 'Strategic Plan'      },
  p6: { agentId: 'felix',  agentName: 'Felix',  label: 'Financial Summary'    },
}

/** Same ownership question as DIM_AGENTS, but one level finer — per sub-indicator (1.1-6.5)
 *  rather than per P1-P6 parameter. Was a private copy inside score-intelligence.ts; moved here
 *  so all "which specialist owns this" lookups live in one file. Checked against the real
 *  Executive registry's `inheritsFrom` lists (lib/registry/executives/*\/executive.ts) — every
 *  persona here is a real specialist folded into a real executive: patel/susi/atlas → growth,
 *  nova → product, leo/felix → finance, sage → ceo, harper → operations. */
export const INDICATOR_AGENTS: Record<string, string> = {
  '1.1': 'nova',  '1.2': 'patel', '1.3': 'susi',  '1.4': 'nova',  '1.5': 'patel',
  '2.1': 'atlas', '2.2': 'atlas', '2.3': 'atlas',  '2.4': 'atlas', '2.5': 'atlas',
  '3.1': 'leo',   '3.2': 'patel', '3.3': 'patel',  '3.4': 'leo',   '3.5': 'leo',
  '4.1': 'sage',  '4.2': 'sage',  '4.3': 'harper', '4.4': 'sage',  '4.5': 'harper',
  '5.1': 'sage',  '5.2': 'sage',  '5.3': 'sage',   '5.4': 'felix', '5.5': 'sage',
  '6.1': 'felix', '6.2': 'felix', '6.3': 'felix',  '6.4': 'felix', '6.5': 'felix',
}
