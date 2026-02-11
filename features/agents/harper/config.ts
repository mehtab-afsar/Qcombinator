import type { Agent } from '@/features/agents/types/agent.types';

export const harperConfig: Agent = {
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
};
