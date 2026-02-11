import type { Agent } from '@/features/agents/types/agent.types';

export const sageConfig: Agent = {
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
};
