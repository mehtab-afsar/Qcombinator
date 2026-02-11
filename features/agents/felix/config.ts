import type { Agent } from '@/features/agents/types/agent.types';

export const felixConfig: Agent = {
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
};
