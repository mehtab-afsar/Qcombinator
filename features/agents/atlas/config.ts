import type { Agent } from '@/features/agents/types/agent.types';

export const atlasConfig: Agent = {
  id: 'atlas',
  name: 'Atlas',
  pillar: 'product-strategy',
  specialty: 'Competitive Intelligence',
  avatar: 'A',
  description: 'Market researcher and competitive analyst. Atlas maps your competitive landscape, identifies positioning gaps, and finds your unfair advantage.',
  suggestedPrompts: [
    'Analyze my competitive landscape',
    "What's my unique positioning vs competitors?",
    'How do I find my unfair advantage?',
    'Research emerging trends in my market',
    'Should I be worried about this competitor?',
    'How do I differentiate in a crowded market?',
    'Create a competitive battle card'
  ],
  improvesScore: 'market',
  color: 'purple'
};
