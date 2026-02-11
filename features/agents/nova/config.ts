import type { Agent } from '@/features/agents/types/agent.types';

export const novaConfig: Agent = {
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
};
