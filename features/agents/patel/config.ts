import type { Agent } from '@/features/agents/types/agent.types';

export const patelConfig: Agent = {
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
    "What's the best way to validate product-market fit?",
    'Should I focus on outbound or inbound first?',
    'How do I build a sales playbook from scratch?'
  ],
  improvesScore: 'goToMarket',
  color: 'blue'
};
