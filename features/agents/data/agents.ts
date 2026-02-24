import { Agent, AgentPillar } from "@/features/agents/types/agent.types";

/**
 * Edge Alpha AI Agents
 * 9 specialized AI advisors across 3 pillars
 */

export const agents: Agent[] = [
  // ============================================================================
  // PILLAR 1: SALES & MARKETING
  // ============================================================================
  {
    id: 'patel',
    name: 'Patel',
    pillar: 'sales-marketing',
    specialty: 'Go-to-Market Strategy',
    avatar: 'P',
    description: 'Expert in ICP definition, channel strategy, and GTM execution. Patel helps you validate your ideal customer profile and build repeatable acquisition playbooks.',
    suggestedPrompts: [
      'Help me define my ICP for a B2B SaaS product',
      'Which acquisition channels should I test first?',
      'How do I calculate and improve my CAC?',
      'Create a 90-day GTM launch plan',
      'What\'s the best way to validate product-market fit?',
      'Should I focus on outbound or inbound first?',
      'How do I build a sales playbook from scratch?'
    ],
    improvesScore: 'goToMarket',
    color: 'blue'
  },
  {
    id: 'susi',
    name: 'Susi',
    pillar: 'sales-marketing',
    specialty: 'Sales & Lead Generation',
    avatar: 'S',
    description: 'Sales process architect specializing in outbound, qualification, and conversion optimization. Susi builds repeatable systems that turn prospects into customers.',
    suggestedPrompts: [
      'Design a cold outreach sequence for my product',
      'Help me qualify leads better',
      'What should my sales process look like?',
      'How do I handle objections about price?',
      'Build a sales deck template for enterprise deals',
      'What metrics should I track in my sales funnel?',
      'How do I scale from founder-led sales?'
    ],
    improvesScore: 'traction',
    color: 'blue'
  },
  {
    id: 'maya',
    name: 'Maya',
    pillar: 'sales-marketing',
    specialty: 'Brand & Content Marketing',
    avatar: 'M',
    description: 'Brand storyteller and content strategist. Maya helps you craft compelling narratives, build thought leadership, and create content that converts.',
    suggestedPrompts: [
      'Create a content strategy for my startup',
      'Help me write compelling positioning',
      'What channels should I prioritize for content?',
      'Build a 30-day LinkedIn content calendar',
      'How do I develop thought leadership?',
      'What makes a great founder story?',
      'Should I invest in SEO or paid content?'
    ],
    improvesScore: 'goToMarket',
    color: 'blue'
  },

  // ============================================================================
  // PILLAR 2: OPERATIONS & FINANCE
  // ============================================================================
  {
    id: 'felix',
    name: 'Felix',
    pillar: 'operations-finance',
    specialty: 'Financial Modeling & Metrics',
    avatar: 'F',
    description: 'Financial strategy expert who helps you build models, track unit economics, and make data-driven decisions. Felix translates numbers into actionable insights.',
    suggestedPrompts: [
      'Build a financial model for my SaaS startup',
      'How do I improve my unit economics?',
      'What KPIs should I track at seed stage?',
      'Calculate my runway and burn rate',
      'Should I raise money or bootstrap longer?',
      'How do I forecast ARR growth?',
      'What metrics do investors care about most?'
    ],
    improvesScore: 'financial',
    color: 'green'
  },
  {
    id: 'leo',
    name: 'Leo',
    pillar: 'operations-finance',
    specialty: 'Legal & Compliance',
    avatar: 'L',
    description: 'Startup lawyer specializing in incorporation, contracts, IP protection, and regulatory compliance. Leo keeps you legally sound without breaking the bank.',
    suggestedPrompts: [
      'What legal structure should I choose?',
      'How do I protect my intellectual property?',
      'Review my customer contract template',
      'What compliance do I need for my industry?',
      'How should I structure founder equity?',
      'What terms should be in my Terms of Service?',
      'Do I need a trademark for my brand?'
    ],
    improvesScore: 'team',
    color: 'green'
  },
  {
    id: 'harper',
    name: 'Harper',
    pillar: 'operations-finance',
    specialty: 'HR & Team Building',
    avatar: 'H',
    description: 'People operations expert focused on hiring, culture, and team scaling. Harper helps you build high-performing teams and avoid common hiring mistakes.',
    suggestedPrompts: [
      'Help me hire my first engineer',
      'Create a hiring process for early-stage startups',
      'How do I build a strong company culture?',
      'What compensation should I offer at seed stage?',
      'Should I hire full-time or use contractors?',
      'How do I structure equity for employees?',
      'What makes a great first 10 hires?'
    ],
    improvesScore: 'team',
    color: 'green'
  },

  // ============================================================================
  // PILLAR 3: PRODUCT & STRATEGY
  // ============================================================================
  {
    id: 'nova',
    name: 'Nova',
    pillar: 'product-strategy',
    specialty: 'Product-Market Fit',
    avatar: 'N',
    description: 'Product strategist obsessed with finding PMF. Nova helps you validate assumptions, prioritize features, and build what customers actually want.',
    suggestedPrompts: [
      'How do I know if I have product-market fit?',
      'Help me prioritize my product roadmap',
      'Design a customer validation framework',
      'What features should I build first?',
      'How do I collect better customer feedback?',
      'Should I pivot or persevere?',
      'Build a feature prioritization matrix'
    ],
    improvesScore: 'product',
    color: 'purple'
  },
  {
    id: 'atlas',
    name: 'Atlas',
    pillar: 'product-strategy',
    specialty: 'Competitive Intelligence',
    avatar: 'A',
    description: 'Market researcher and competitive analyst. Atlas maps your competitive landscape, identifies positioning gaps, and finds your unfair advantage.',
    suggestedPrompts: [
      'Analyze my competitive landscape',
      'What\'s my unique positioning vs competitors?',
      'How do I find my unfair advantage?',
      'Research emerging trends in my market',
      'Should I be worried about this competitor?',
      'How do I differentiate in a crowded market?',
      'Create a competitive battle card'
    ],
    improvesScore: 'market',
    color: 'purple'
  },
  {
    id: 'sage',
    name: 'Sage',
    pillar: 'product-strategy',
    specialty: 'Strategic Planning',
    avatar: 'S',
    description: 'Long-term strategist who helps you think 3-5 years ahead. Sage builds strategic roadmaps, evaluates opportunities, and guides big decisions.',
    suggestedPrompts: [
      'Build a 12-month strategic roadmap',
      'Should I expand internationally?',
      'Evaluate this partnership opportunity',
      'How do I think about platform vs feature?',
      'Should I build, buy, or partner?',
      'What milestones matter for Series A?',
      'Create an OKR framework for my startup'
    ],
    improvesScore: 'market',
    color: 'purple'
  }
];

/**
 * Get agents by pillar
 */
export function getAgentsByPillar(pillar: AgentPillar): Agent[] {
  return agents.filter(agent => agent.pillar === pillar);
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): Agent | undefined {
  return agents.find(agent => agent.id === id);
}

/**
 * Get agents by Q-Score dimension they improve
 */
export function getAgentsByDimension(dimension: string): Agent[] {
  return agents.filter(agent => agent.improvesScore === dimension);
}
