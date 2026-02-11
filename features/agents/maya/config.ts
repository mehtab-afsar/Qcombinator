import type { Agent } from '@/features/agents/types/agent.types';

export const mayaConfig: Agent = {
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
};
