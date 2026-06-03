/**
 * Formalized skill registry — each skill is a named workflow that any agent
 * can trigger. Skills are invoked by typing a slash command in the chat UI
 * (e.g. /competitor-scan TechCorp) which pre-fills a structured prompt.
 *
 * Agents see the skill's prompt as the user message and execute it using their
 * existing tool loop (web_research, lead_enrich, apollo_search, etc.).
 *
 * Adding a new skill: add an entry to SKILLS. No other wiring needed.
 */

export interface Skill {
  /** Slash command without the leading slash, e.g. "competitor-scan" */
  command: string
  /** Short label shown in the autocomplete dropdown */
  label: string
  /** One-line description shown under the label */
  description: string
  /** Agents that can execute this skill (empty = all agents) */
  agents: string[]
  /** Argument placeholder shown after the slash command, e.g. "[company name]" */
  argPlaceholder?: string
  /** The expanded prompt template sent to the agent. ${arg} is replaced with user input. */
  promptTemplate: string
  /** Emoji icon for the dropdown */
  icon: string
}

export const SKILLS: Skill[] = [
  {
    command:        'competitor-scan',
    label:          'Competitor Scan',
    description:    'Deep research on a competitor — funding, product, positioning, weaknesses',
    agents:         ['atlas', 'patel'],
    argPlaceholder: '[company name]',
    promptTemplate: 'Run a deep competitor analysis on ${arg}. Cover: their product positioning, key differentiators, pricing model, recent funding, customer reviews (G2/Capterra if SaaS), and the 2-3 specific weaknesses we can exploit. Give me the battle card in full.',
    icon:           '🔭',
  },
  {
    command:        'pitch-feedback',
    label:          'Pitch Feedback',
    description:    'Score your pitch deck against YC and a16z investment criteria',
    agents:         ['sage'],
    argPlaceholder: '[describe your pitch or paste the deck link]',
    promptTemplate: 'Review my pitch and give me structured feedback against YC and a16z criteria. Evaluate: problem clarity, market size, solution differentiation, traction, team, and business model. Score each section 1-10 and give specific improvements. Here is my pitch: ${arg}',
    icon:           '🎯',
  },
  {
    command:        'icp-validate',
    label:          'ICP Validate',
    description:    'Validate your ICP against real market signals — are these buyers real?',
    agents:         ['patel'],
    argPlaceholder: '[describe your ICP]',
    promptTemplate: 'Validate this ICP against real market signals: ${arg}. Check: does this buyer segment exist at scale? What are their actual buying triggers and budget authority? What objections will they raise? Use lead enrichment to find 3-5 real companies that match. Tell me if this ICP is tight enough or needs narrowing.',
    icon:           '🎯',
  },
  {
    command:        'runway-model',
    label:          'Runway Model',
    description:    'Build an 18-month runway model from your current numbers',
    agents:         ['felix'],
    argPlaceholder: '[current MRR, burn, team size, hiring plan]',
    promptTemplate: 'Build an 18-month runway model for me. Use these inputs: ${arg}. Give me: month-by-month burn projection, break-even point, how much runway we have, and 3 scenarios (conservative / base / aggressive). Flag the top 2 financial risks and what I should do about them.',
    icon:           '📊',
  },
  {
    command:        'hiring-plan',
    label:          'Hiring Plan',
    description:    'Generate a hiring plan with JD, comp benchmarks, and sourcing strategy',
    agents:         ['harper'],
    argPlaceholder: '[role title and context]',
    promptTemplate: 'Create a full hiring plan for: ${arg}. Include: job description (lead with the mission, not requirements), compensation benchmark for our stage and location, equity range, must-have vs nice-to-have qualifications, top 3 sourcing channels for this role, and the 5 interview questions that predict success. Make it specific to an early-stage startup.',
    icon:           '👥',
  },
  {
    command:        'pmf-survey',
    label:          'PMF Survey',
    description:    'Generate a Superhuman-style PMF survey + analysis framework',
    agents:         ['nova'],
    argPlaceholder: '[product description and target customer]',
    promptTemplate: 'Generate a Superhuman-style PMF survey for: ${arg}. Include the 5 core questions (including the "how disappointed" question), the follow-up questions that surface the must-have use case, and the exact analysis method to calculate our PMF score. Also give me the 3 questions I should be asking in 1-on-1 customer calls this week.',
    icon:           '🔬',
  },
  {
    command:        'market-analysis',
    label:          'Market Analysis',
    description:    'Size the market, map segments, and identify the best entry wedge',
    agents:         ['atlas', 'sage'],
    argPlaceholder: '[market or problem space]',
    promptTemplate: 'Do a thorough market analysis for: ${arg}. Cover: TAM/SAM/SOM with methodology (not made-up numbers), the 3-5 distinct customer segments, which segment is the best entry wedge and why, macro tailwinds driving this market, and the regulatory or structural risks we need to plan for.',
    icon:           '🌍',
  },
  {
    command:        'outreach-sequence',
    label:          'Outreach Sequence',
    description:    'Write a 3-touch cold outreach sequence for a specific ICP',
    agents:         ['susi', 'patel'],
    argPlaceholder: '[target persona and value prop]',
    promptTemplate: 'Write a 3-touch cold email sequence for this target: ${arg}. Touch 1: pattern interrupt opener, specific pain point, one-line CTA. Touch 2: social proof or case study angle, reply to thread. Touch 3: breakup email with low-friction ask. Each email under 75 words. Give me 2 subject line variants per email.',
    icon:           '✉️',
  },
]

/** Find skills available for a given agent (or all skills if agentId is empty) */
export function getSkillsForAgent(agentId: string): Skill[] {
  return SKILLS.filter(s => s.agents.length === 0 || s.agents.includes(agentId))
}

/** Expand a skill's prompt template, replacing ${arg} with the user's argument */
export function expandSkillPrompt(skill: Skill, arg: string): string {
  return skill.promptTemplate.replace(/\$\{arg\}/g, arg.trim() || (skill.argPlaceholder ?? ''))
}
