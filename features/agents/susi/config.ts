import type { Agent } from '@/features/agents/types/agent.types';

export const susiConfig: Agent = {
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
};
