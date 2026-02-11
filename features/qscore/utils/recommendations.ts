import { QScore, QScoreDimension, Recommendation } from '@/features/qscore/types/qscore.types';
import { getAgentsByDimension } from '@/features/agents/data/agents';

/**
 * Recommendation Engine
 * Generates personalized action recommendations based on Q-Score analysis
 */

/**
 * Format dimension name for display
 */
export const formatDimension = (dimension: string): string => {
  const names: Record<string, string> = {
    market: 'Market',
    product: 'Product',
    goToMarket: 'Go-to-Market',
    financial: 'Financial',
    team: 'Team',
    traction: 'Traction'
  };
  return names[dimension] || dimension;
};

/**
 * Get action description for dimension
 */
const getActionForDimension = (dimension: QScoreDimension, score: number): string => {
  const actions: Record<QScoreDimension, string> = {
    market: score < 40
      ? 'Define your TAM/SAM/SOM and validate market size with data'
      : 'Refine competitive positioning and identify market gaps',
    product: score < 40
      ? 'Focus on core features and get to MVP faster'
      : 'Improve product differentiation and scalability',
    goToMarket: score < 40
      ? 'Define your ICP and test initial acquisition channels'
      : 'Optimize channel performance and improve conversion rates',
    financial: score < 40
      ? 'Build a basic financial model and understand unit economics'
      : 'Improve profitability metrics and extend runway',
    team: score < 40
      ? 'Add key roles and strengthen founder expertise'
      : 'Improve team completeness and add strategic advisors',
    traction: score < 40
      ? 'Get your first paying customers and prove demand'
      : 'Accelerate growth and improve retention metrics'
  };
  return actions[dimension];
};

/**
 * Get CTA text for dimension
 */
const getCTAForDimension = (dimension: QScoreDimension): string => {
  const ctas: Record<QScoreDimension, string> = {
    market: 'Analyze Market',
    product: 'Improve Product',
    goToMarket: 'Talk to Jocelyn',
    financial: 'Talk to Sam',
    team: 'Talk to Lauren',
    traction: 'Boost Traction'
  };
  return ctas[dimension];
};

/**
 * Get link for dimension action
 */
const getLinkForDimension = (dimension: QScoreDimension): string => {
  const links: Record<QScoreDimension, string> = {
    market: '/founder/agents/roman',
    product: '/founder/agents/cristina',
    goToMarket: '/founder/agents/jocelyn',
    financial: '/founder/agents/sam',
    team: '/founder/agents/lauren',
    traction: '/founder/metrics'
  };
  return links[dimension];
};

/**
 * Get icon for dimension
 */
export const getIconForDimension = (dimension: QScoreDimension): string => {
  const icons: Record<QScoreDimension, string> = {
    market: 'Target',
    product: 'Zap',
    goToMarket: 'TrendingUp',
    financial: 'DollarSign',
    team: 'Users',
    traction: 'BarChart3'
  };
  return icons[dimension];
};

/**
 * Generate top 3 action recommendations based on Q-Score
 */
export const generateRecommendations = (qScore: QScore): Recommendation[] => {
  // Get dimensions sorted by score (lowest first)
  const dimensions = Object.entries(qScore.breakdown)
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 3); // Top 3 lowest scores

  // Map to recommendations
  return dimensions.map(([dim, data], index) => {
    const dimension = dim as QScoreDimension;
    const potentialImprovement = Math.round((100 - data.score) * 0.15); // 15% of gap

    return {
      id: `rec-${index}`,
      title: `Improve ${formatDimension(dimension)} Score`,
      description: getActionForDimension(dimension, data.score),
      impact: `+${potentialImprovement} points`,
      priority: data.score < 40 ? 'high' : data.score < 70 ? 'medium' : 'low',
      dimension,
      ctaText: getCTAForDimension(dimension),
      ctaLink: getLinkForDimension(dimension),
      icon: getIconForDimension(dimension),
      completed: false
    };
  });
};

/**
 * Generate agent recommendations (which agents to talk to)
 */
export const generateAgentRecommendations = (qScore: QScore) => {
  // Get lowest dimension
  const lowestDimension = Object.entries(qScore.breakdown)
    .sort(([, a], [, b]) => a.score - b.score)[0];

  if (!lowestDimension) return [];

  const [dimKey, dimData] = lowestDimension;
  const agents = getAgentsByDimension(dimKey as QScoreDimension);

  if (agents.length === 0) return [];

  // Return recommendation for first agent (primary expert for this dimension)
  const agent = agents[0];
  const potentialGain = Math.round((100 - dimData.score) * 0.15);

  return [{
    agent,
    message: `Talk to ${agent.name} to improve your ${formatDimension(dimKey)} Score by ~${potentialGain} points`,
    score: dimData.score,
    dimension: dimKey as QScoreDimension,
    potentialGain
  }];
};

/**
 * Get color class for priority
 */
export const getPriorityColor = (priority: Recommendation['priority']): { bg: string; text: string; border: string } => {
  const colors = {
    high: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200'
    },
    medium: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      border: 'border-yellow-200'
    },
    low: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200'
    }
  };
  return colors[priority];
};

/**
 * Get trend indicator for dimension
 */
export const getTrendIndicator = (trend: 'up' | 'down' | 'neutral'): { icon: string; color: string } => {
  const indicators = {
    up: { icon: 'TrendingUp', color: 'text-green-500' },
    down: { icon: 'TrendingDown', color: 'text-red-500' },
    neutral: { icon: 'Minus', color: 'text-gray-400' }
  };
  return indicators[trend];
};

/**
 * Calculate Q-Score health status
 */
export const getQScoreHealth = (score: number): { status: string; color: string; message: string } => {
  if (score >= 80) {
    return {
      status: 'Excellent',
      color: 'text-green-600',
      message: 'You\'re in great shape for Series A fundraising'
    };
  } else if (score >= 70) {
    return {
      status: 'Good',
      color: 'text-blue-600',
      message: 'You\'re seed-ready and building momentum'
    };
  } else if (score >= 60) {
    return {
      status: 'Fair',
      color: 'text-yellow-600',
      message: 'Focus on key improvements to unlock investor interest'
    };
  } else {
    return {
      status: 'Needs Work',
      color: 'text-orange-600',
      message: 'Strengthen fundamentals before approaching investors'
    };
  }
};
