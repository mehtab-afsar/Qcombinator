import type { Agent } from '@/features/agents/types/agent.types';

export const leoConfig: Agent = {
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
};
