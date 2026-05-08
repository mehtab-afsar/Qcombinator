/**
 * Patel 20-Indicator GTM Diagnostic Framework
 *
 * 4 dimensions × 5 indicators = 20 total.
 * Each indicator scored 1–5 by Patel during conversation.
 * These are stored in patel_diagnostic_scores — separate from Q-Score P1 traction indicators.
 *
 * P1.1 ICP Quality     → D1 ICP Definition
 * P1.2 Customer Insight → D2 Pains & Gains
 * P1.3 Channel Focus   → D3 Buyer Journey
 * P1.4 Message Clarity → D4 Positioning & Messaging
 */

export type IndicatorScore = 1 | 2 | 3 | 4 | 5
export type ConfidenceLevel = 'validated' | 'inferred' | 'assumed' | 'not_assessed'
export type IndicatorDimension = 'icp' | 'insight' | 'channel' | 'message'
export type DeliverableKey = 'D1' | 'D2' | 'D3' | 'D4'

export interface PatelIndicator {
  id: string
  name: string
  dimension: IndicatorDimension
  dimensionLabel: string
  deliverable: DeliverableKey
  rubric: Record<IndicatorScore, string>
  knowledgeAnchor: string
}

export const PATEL_INDICATORS: Record<string, PatelIndicator> = {

  // ── P1.1 ICP Quality → D1 ────────────────────────────────────────────────

  'icp.specificity': {
    id: 'icp.specificity',
    name: 'Persona Specificity',
    dimension: 'icp',
    dimensionLabel: 'P1.1 ICP Quality',
    deliverable: 'D1',
    knowledgeAnchor: 'Bessemer ICP Model — specificity enables targeting precision',
    rubric: {
      1: 'Persona is a vague category (e.g. "SMBs", "tech companies") — no meaningful targeting criteria',
      2: 'Persona defined by 1–2 traits (e.g. industry + size) but overlaps significantly with adjacent segments',
      3: 'Persona defined by 3–4 observable traits; distinguishable but not uniquely targetable',
      4: 'Persona defined by 5+ specific traits including role, trigger, and observable behaviours',
      5: 'Persona is laser-specific: named role, seniority, company type, observable trigger, exclusion criteria — a new team member could identify them in the wild',
    },
  },

  'icp.validation': {
    id: 'icp.validation',
    name: 'Persona Validation',
    dimension: 'icp',
    dimensionLabel: 'P1.1 ICP Quality',
    deliverable: 'D1',
    knowledgeAnchor: 'HBS Rock GTM Framework — validation separates hypothesis from market truth',
    rubric: {
      1: 'Persona is entirely hypothetical — no customer conversations or data yet',
      2: '1–2 conversations referenced but no pattern established',
      3: '3–5 conversations; early pattern visible but not yet systematically tested',
      4: '6–10 conversations with consistent patterns; founder can articulate who said yes vs who ghosted',
      5: 'Validated through 10+ conversations + buying behavior — founder knows exactly who converts and why',
    },
  },

  'icp.commercial_alignment': {
    id: 'icp.commercial_alignment',
    name: 'Commercial Alignment',
    dimension: 'icp',
    dimensionLabel: 'P1.1 ICP Quality',
    deliverable: 'D1',
    knowledgeAnchor: 'Bessemer ICP Model — ICP must map to budget authority and willingness to pay',
    rubric: {
      1: 'No evidence the ICP has budget or authority to buy',
      2: 'ICP likely has budget but no direct evidence — assumption only',
      3: 'Some evidence of budget (one paying customer or strong pilot signal)',
      4: 'Multiple paying customers from this ICP; budget pattern is clear',
      5: 'ICP is proven buyer with known deal size, budget cycle, and procurement path',
    },
  },

  'icp.iteration': {
    id: 'icp.iteration',
    name: 'Persona Iteration',
    dimension: 'icp',
    dimensionLabel: 'P1.1 ICP Quality',
    deliverable: 'D1',
    knowledgeAnchor: 'Steve Blank Customer Development — ICP refines through feedback loops',
    rubric: {
      1: 'ICP has never been updated since original hypothesis',
      2: 'ICP updated once based on early feedback',
      3: 'ICP refined 2–3 times; each iteration was triggered by a specific learning',
      4: 'Regular ICP review process exists; changes documented with rationale',
      5: 'Systematic iteration loop: defined cadence, data triggers, A/B persona testing in market',
    },
  },

  'icp.team_alignment': {
    id: 'icp.team_alignment',
    name: 'Team Alignment',
    dimension: 'icp',
    dimensionLabel: 'P1.1 ICP Quality',
    deliverable: 'D1',
    knowledgeAnchor: 'HBS Rock GTM — misaligned ICP definition fragments execution across functions',
    rubric: {
      1: 'Different team members describe the ICP differently when asked',
      2: 'Some alignment but sales and product have different assumptions',
      3: 'Core team aligned on ICP; written definition exists but not operationalized',
      4: 'ICP documented and used consistently in sales, marketing, and product discussions',
      5: 'Single ICP definition used by all functions; integrated into hiring, OKRs, and product roadmap',
    },
  },

  // ── P1.2 Customer Insight → D2 ───────────────────────────────────────────

  'insight.problem': {
    id: 'insight.problem',
    name: 'Problem Insight',
    dimension: 'insight',
    dimensionLabel: 'P1.2 Customer Insight',
    deliverable: 'D2',
    knowledgeAnchor: 'JTBD Framework — problem insight must capture the job-to-be-done, not surface symptoms',
    rubric: {
      1: 'Problem described at category level only (e.g. "they waste time on X")',
      2: 'Problem named but root cause not understood — symptoms without mechanism',
      3: 'Root cause identified through 2–3 conversations; mechanism partially understood',
      4: 'Root cause validated with 5+ examples; founder understands why the problem exists and persists',
      5: 'Deep causal model: founder knows the problem trigger, the workaround penalty, and why existing solutions fail',
    },
  },

  'insight.context': {
    id: 'insight.context',
    name: 'Customer Context Understanding',
    dimension: 'insight',
    dimensionLabel: 'P1.2 Customer Insight',
    deliverable: 'D2',
    knowledgeAnchor: 'JTBD Framework — context determines when the job becomes urgent',
    rubric: {
      1: 'No understanding of buyer\'s day-in-life or environment when the problem occurs',
      2: 'General awareness of industry context but not the specific situation triggering the problem',
      3: 'Can describe the specific scenario (meeting, process, moment) when the problem is felt',
      4: 'Detailed contextual map: who else is involved, what systems, what the cost is in real terms',
      5: 'Full contextual model: trigger event, stakeholders, process map, cost of status quo, emotional stakes',
    },
  },

  'insight.validation_depth': {
    id: 'insight.validation_depth',
    name: 'Validation Depth',
    dimension: 'insight',
    dimensionLabel: 'P1.2 Customer Insight',
    deliverable: 'D2',
    knowledgeAnchor: 'Steve Blank Customer Development — depth of validation determines signal quality',
    rubric: {
      1: 'Validation is anecdotal — one or two quotes, no systematic inquiry',
      2: 'Informal conversations only; no structured discovery questions used',
      3: 'Structured interviews with 3–5 customers; patterns emerging but not yet statistically meaningful',
      4: 'Systematic discovery: 8+ interviews, survey data, or usage analytics confirming pain patterns',
      5: 'Multi-method validation: interviews + quantitative data + behavioral evidence; pain hierarchy ranked by frequency and severity',
    },
  },

  'insight.buying': {
    id: 'insight.buying',
    name: 'Buying Insight',
    dimension: 'insight',
    dimensionLabel: 'P1.2 Customer Insight',
    deliverable: 'D2',
    knowledgeAnchor: 'Challenger Sale — understanding buying behavior is distinct from understanding the problem',
    rubric: {
      1: 'No understanding of how this ICP makes purchasing decisions',
      2: 'General knowledge of procurement process but not specific to this buyer type',
      3: 'Understands who the economic buyer is and approximate budget cycle',
      4: 'Knows the full decision-making unit (champion, economic buyer, blocker) and what triggers a budget commitment',
      5: 'Complete buying map: DMU, trigger events, evaluation criteria, competitive comparisons considered, common objections and handles',
    },
  },

  'insight.value_proof': {
    id: 'insight.value_proof',
    name: 'Value Proof Clarity',
    dimension: 'insight',
    dimensionLabel: 'P1.2 Customer Insight',
    deliverable: 'D2',
    knowledgeAnchor: 'Bessemer — value proof must be quantified to unlock enterprise deals',
    rubric: {
      1: 'Value prop is qualitative only — no metrics or quantification',
      2: 'Some directional ROI framing but not tied to specific customer outcomes',
      3: 'One customer outcome story with approximate numbers (e.g. "saved 4 hours/week")',
      4: 'Multiple customer outcomes with consistent metrics; ROI story repeatable',
      5: 'Value proof is a financial model: specific ROI, payback period, cost-of-inaction — usable in procurement justification',
    },
  },

  // ── P1.3 Channel Focus → D3 ──────────────────────────────────────────────

  'channel.clarity': {
    id: 'channel.clarity',
    name: 'Channel Clarity',
    dimension: 'channel',
    dimensionLabel: 'P1.3 Channel Focus',
    deliverable: 'D3',
    knowledgeAnchor: 'Traction — 19 traction channels; most early-stage startups spread too thin',
    rubric: {
      1: 'Trying 4+ channels simultaneously with no data on which works',
      2: 'Nominally 1–2 primary channels but execution is scattered',
      3: 'One primary channel identified; some results data but not yet consistent',
      4: 'Primary channel proven with repeatable results; secondary channel being tested systematically',
      5: 'Primary channel fully understood: CAC, conversion rate, capacity limit, and what makes it work — codified for scale',
    },
  },

  'channel.icp_fit': {
    id: 'channel.icp_fit',
    name: 'Channel–ICP Fit',
    dimension: 'channel',
    dimensionLabel: 'P1.3 Channel Focus',
    deliverable: 'D3',
    knowledgeAnchor: 'HBS Rock GTM — channel must match where the ICP actually pays attention',
    rubric: {
      1: 'Channel choice is not connected to ICP — picked based on founder preference',
      2: 'Some logic connecting channel to ICP but not validated with data',
      3: 'Channel matches where ICP spends time; at least one signal that ICP is reachable there',
      4: 'Channel validated as where ICP responds — conversion data exists to confirm fit',
      5: 'Channel–ICP fit proven: ICP response rate, conversion rate, and engagement quality all measurably better than alternatives',
    },
  },

  'channel.focus_discipline': {
    id: 'channel.focus_discipline',
    name: 'Focus Discipline',
    dimension: 'channel',
    dimensionLabel: 'P1.3 Channel Focus',
    deliverable: 'D3',
    knowledgeAnchor: 'Traction — sequential channel testing beats parallel scattershot',
    rubric: {
      1: 'No discipline — new channel ideas pursued reactively',
      2: 'Intends to be focused but adds channels when results are slow',
      3: 'Stated commitment to primary channel; occasional drift but recovers',
      4: 'Strong focus discipline: secondary channels only tested when primary is proven',
      5: 'Systematic channel discipline: explicit decision criteria for when to add a new channel; channel portfolio managed like a budget',
    },
  },

  'channel.execution_consistency': {
    id: 'channel.execution_consistency',
    name: 'Execution Consistency',
    dimension: 'channel',
    dimensionLabel: 'P1.3 Channel Focus',
    deliverable: 'D3',
    knowledgeAnchor: 'Predictable Revenue — consistency produces the data needed to optimize',
    rubric: {
      1: 'Channel execution is sporadic — no cadence or system',
      2: 'Some consistency but dependent on founder energy, not a system',
      3: 'Weekly cadence exists; execution is regular but not yet systematized for scale',
      4: 'Channel execution is systematized: templates, cadences, playbooks exist',
      5: 'Full execution system: playbooks, reps trained, metrics tracked, feedback loop active — founder not required for daily execution',
    },
  },

  'channel.learning_loop': {
    id: 'channel.learning_loop',
    name: 'Channel Learning Loop',
    dimension: 'channel',
    dimensionLabel: 'P1.3 Channel Focus',
    deliverable: 'D3',
    knowledgeAnchor: 'Lean Startup — measurement + learning drives channel improvement',
    rubric: {
      1: 'No data collected on channel performance',
      2: 'Some metrics tracked but no structured review or optimization',
      3: 'Key metrics (response rate, conversion) tracked; monthly review exists',
      4: 'Active A/B testing of messages or targeting; weekly learnings applied',
      5: 'Continuous learning loop: hypothesis → test → measure → iterate; channel KPIs tied to business outcomes',
    },
  },

  // ── P1.4 Message Clarity → D4 ────────────────────────────────────────────

  'message.simplicity': {
    id: 'message.simplicity',
    name: 'Message Simplicity',
    dimension: 'message',
    dimensionLabel: 'P1.4 Message Clarity',
    deliverable: 'D4',
    knowledgeAnchor: 'Building a StoryBrand — the customer is the hero; complexity is message death',
    rubric: {
      1: 'Message requires 3+ sentences to explain what the product does',
      2: 'Can be explained in 2 sentences but still uses jargon or features-first language',
      3: 'One sentence explanation exists; mostly clear but could be more specific about who and outcome',
      4: 'Single clear sentence: who it\'s for, what outcome it delivers, differentiated from obvious alternatives',
      5: 'Instantly understood by the ICP in one phrase — tested with real buyers who confirm they "got it" immediately',
    },
  },

  'message.proof': {
    id: 'message.proof',
    name: 'Proof Integration',
    dimension: 'message',
    dimensionLabel: 'P1.4 Message Clarity',
    deliverable: 'D4',
    knowledgeAnchor: 'Challenger Sale — proof reduces cognitive risk in evaluation',
    rubric: {
      1: 'No proof elements in messaging — claims only',
      2: 'One generic testimonial or vague social proof',
      3: 'Specific customer story or metric cited; proof is relevant to ICP pain',
      4: 'Multiple proof points matched to different buyer objections; proof is quantified',
      5: 'Proof architecture: tiered by buyer stage — awareness-stage proof, evaluation-stage ROI, decision-stage reference customers',
    },
  },

  'message.icp_relevance': {
    id: 'message.icp_relevance',
    name: 'ICP Relevance',
    dimension: 'message',
    dimensionLabel: 'P1.4 Message Clarity',
    deliverable: 'D4',
    knowledgeAnchor: 'Bessemer ICP Model — messaging must speak the ICP\'s language, not the founder\'s',
    rubric: {
      1: 'Messaging is generic — could apply to any company',
      2: 'Some ICP-specific language but primarily features/technology focused',
      3: 'Messaging references the ICP\'s job or industry; outcome-focused in parts',
      4: 'Messaging speaks the ICP\'s language: uses their terminology, names their specific pain, outcomes they care about',
      5: 'Messaging is ICP-native: validated by the ICP as "this is exactly my problem" — every word chosen for resonance with this specific buyer',
    },
  },

  'message.differentiation': {
    id: 'message.differentiation',
    name: 'Differentiation Strength',
    dimension: 'message',
    dimensionLabel: 'P1.4 Message Clarity',
    deliverable: 'D4',
    knowledgeAnchor: 'Blue Ocean Strategy — differentiation must be real and communicable',
    rubric: {
      1: 'No clear differentiation — could describe multiple competitors',
      2: 'Differentiation exists but is vague ("better", "faster", "easier")',
      3: 'Specific differentiation claim made; not yet proven in competitive conversations',
      4: 'Differentiation proven in competitive deals: specific reason why they chose us over alternatives',
      5: 'Defensible differentiation with proof: win/loss data, specific competitive advantages named by customers',
    },
  },

  'message.comprehension': {
    id: 'message.comprehension',
    name: 'Customer Comprehension',
    dimension: 'message',
    dimensionLabel: 'P1.4 Message Clarity',
    deliverable: 'D4',
    knowledgeAnchor: 'Building a StoryBrand — message only works if the customer understands it without explanation',
    rubric: {
      1: 'Never tested whether ICP understands the message',
      2: 'Shown to 1–2 people; informal feedback only',
      3: 'Tested with 3–5 ICP-profile contacts; key elements understood but some confusion',
      4: 'Tested with 8+ contacts; core message understood by >80%; iteration done based on feedback',
      5: 'Comprehension validated at scale: ICP can repeat the value prop back in their own words without prompting',
    },
  },
}

// ── Dimension groupings ───────────────────────────────────────────────────────

export const PATEL_DIMENSIONS: {
  key: IndicatorDimension
  label: string
  deliverable: DeliverableKey
  indicatorIds: string[]
}[] = [
  {
    key: 'icp',
    label: 'P1.1 ICP Quality',
    deliverable: 'D1',
    indicatorIds: ['icp.specificity', 'icp.validation', 'icp.commercial_alignment', 'icp.iteration', 'icp.team_alignment'],
  },
  {
    key: 'insight',
    label: 'P1.2 Customer Insight',
    deliverable: 'D2',
    indicatorIds: ['insight.problem', 'insight.context', 'insight.validation_depth', 'insight.buying', 'insight.value_proof'],
  },
  {
    key: 'channel',
    label: 'P1.3 Channel Focus',
    deliverable: 'D3',
    indicatorIds: ['channel.clarity', 'channel.icp_fit', 'channel.focus_discipline', 'channel.execution_consistency', 'channel.learning_loop'],
  },
  {
    key: 'message',
    label: 'P1.4 Message Clarity',
    deliverable: 'D4',
    indicatorIds: ['message.simplicity', 'message.proof', 'message.icp_relevance', 'message.differentiation', 'message.comprehension'],
  },
]

export const ALL_INDICATOR_IDS = Object.keys(PATEL_INDICATORS)

export type PatelScores = Partial<Record<string, IndicatorScore>>
export type PatelConfidence = Partial<Record<string, ConfidenceLevel>>
