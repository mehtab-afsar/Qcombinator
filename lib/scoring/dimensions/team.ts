/**
 * Team Dimension Scorer
 * Sources: Problem Origin, Unique Advantage, Resilience sections
 * Scoring: Domain expertise (40), team completeness (30), resilience (30)
 */

import { AssessmentData } from '../prd-types';

export function calculateTeamScore(data: AssessmentData): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  let points = 0;
  const maxPoints = 100;

  // 1. Domain Expertise (40 points)
  // Source: Problem Origin section
  const hasOriginStory = data.problemStory && data.problemStory.length > 0;
  const originLength = data.problemStory?.length || 0;
  const hasPersonalExperience = data.problemStory?.toLowerCase().includes('i ') ||
                                 data.problemStory?.toLowerCase().includes('my ') ||
                                 data.problemStory?.toLowerCase().includes('we ');

  // Origin story quality (20 pts)
  if (hasOriginStory) {
    if (originLength >= 300 && hasPersonalExperience) {
      points += 20; // Deep personal experience, detailed story
    } else if (originLength >= 200 && hasPersonalExperience) {
      points += 17; // Good personal experience
    } else if (originLength >= 150) {
      points += 14; // Adequate understanding
    } else if (originLength >= 100) {
      points += 10; // Basic understanding
    } else {
      points += 5; // Superficial
    }
  } else {
    points += 0; // No origin story
  }

  // Unique advantage / unfair edge (20 pts)
  const hasAdvantage = data.advantageExplanation && data.advantageExplanation.length > 0;
  const advantageLength = data.advantageExplanation?.length || 0;

  // Check for specific advantage types (insider knowledge, relationships, technical expertise)
  const hasInsiderKnowledge = data.advantageExplanation?.toLowerCase().includes('experience') ||
                               data.advantageExplanation?.toLowerCase().includes('worked') ||
                               data.advantageExplanation?.toLowerCase().includes('industry');
  const hasNetwork = data.advantageExplanation?.toLowerCase().includes('network') ||
                     data.advantageExplanation?.toLowerCase().includes('connection') ||
                     data.advantageExplanation?.toLowerCase().includes('relationship');
  const hasTechnical = data.advantageExplanation?.toLowerCase().includes('technical') ||
                       data.advantageExplanation?.toLowerCase().includes('engineer') ||
                       data.advantageExplanation?.toLowerCase().includes('built');

  if (hasAdvantage) {
    const advantageCount = [hasInsiderKnowledge, hasNetwork, hasTechnical].filter(Boolean).length;

    if (advantageLength >= 200 && advantageCount >= 2) {
      points += 20; // Multiple strong advantages
    } else if (advantageLength >= 150 && advantageCount >= 2) {
      points += 17; // Multiple advantages
    } else if (advantageLength >= 100 && advantageCount >= 1) {
      points += 14; // One clear advantage
    } else if (advantageLength >= 100) {
      points += 10; // Generic advantage
    } else {
      points += 5; // Weak advantage
    }
  } else {
    points += 2; // No unique advantage articulated
  }

  // 2. Team Completeness (30 points)
  // Note: This section may not exist in current assessment yet
  // Using proxy signals from existing data

  // Check if team is mentioned in various sections
  const teamMentioned = (data.problemStory?.toLowerCase().includes('team') ||
                         data.problemStory?.toLowerCase().includes('we ') ||
                         data.problemStory?.toLowerCase().includes('us ')) ?? false;

  const hasCofounder = data.problemStory?.toLowerCase().includes('cofounder') ||
                       data.problemStory?.toLowerCase().includes('co-founder') ||
                       data.problemStory?.toLowerCase().includes('partner') ||
                       data.problemStory?.toLowerCase().includes('founded with') ||
                       false;

  const teamSize: number = 1; // Default to solo - field not in current assessment

  // Team size and composition (30 pts)
  if (teamSize >= 3) {
    points += 15; // Full founding team
  } else if (teamSize === 2) {
    points += 12; // Co-founders
  } else {
    points += 6; // Solo founder
  }

  // Complementary skills evidence (15 pts)
  if (hasCofounder) {
    const hasRoleClarity = data.advantageExplanation?.toLowerCase().includes('ceo') ||
                          data.advantageExplanation?.toLowerCase().includes('cto') ||
                          data.advantageExplanation?.toLowerCase().includes('technical') ||
                          data.advantageExplanation?.toLowerCase().includes('business') ||
                          false;

    if (hasRoleClarity && teamSize >= 2) {
      points += 15; // Clear complementary skills
    } else if (teamSize >= 2) {
      points += 10; // Team exists but unclear roles
    } else {
      points += 5; // Solo or unclear
    }
  } else if (teamSize > 1) {
    points += 8; // Team without clear cofounder structure
  } else {
    points += 3; // Solo founder, no team evidence
  }

  // 3. Resilience (30 points)
  // Source: Resilience section (failed assumptions, learning velocity)
  const failedAssumptionsText = data.failedBelief || data.failedChange || '';
  const hasFailedAssumptions = failedAssumptionsText.length > 0;
  const assumptionsLength = failedAssumptionsText.length;

  // Failed assumptions quality (15 pts)
  if (hasFailedAssumptions) {
    if (assumptionsLength >= 200) {
      points += 15; // Detailed learning from failures
    } else if (assumptionsLength >= 150) {
      points += 13; // Good reflection
    } else if (assumptionsLength >= 100) {
      points += 10; // Adequate reflection
    } else if (assumptionsLength >= 50) {
      points += 7; // Some reflection
    } else {
      points += 3; // Minimal reflection
    }
  } else {
    points += 0; // No failed assumptions shared (concerning - may not be testing)
  }

  // Learning velocity / iteration speed (15 pts)
  const buildTime = data.buildTime || 0;
  const iterationCount = data.conversationCount || 0; // Use conversation count as proxy for iteration evidence

  // Fast iteration shows resilience
  if (buildTime > 0) {
    if (buildTime <= 7 && iterationCount >= 5) {
      points += 15; // Weekly iterations, many cycles
    } else if (buildTime <= 14 && iterationCount >= 3) {
      points += 12; // Bi-weekly iterations, several cycles
    } else if (buildTime <= 30 && iterationCount >= 2) {
      points += 9; // Monthly iterations
    } else if (buildTime <= 60) {
      points += 6; // Slow iterations
    } else {
      points += 3; // Very slow iterations
    }
  } else if (iterationCount >= 3) {
    // If no build time but iteration count exists
    points += 10; // Evidence of multiple iterations
  } else {
    points += 3; // Limited iteration evidence
  }

  // Normalize to 0-100 scale
  const score = Math.min(Math.round((points / maxPoints) * 100), 100);

  return {
    score,
    rawPoints: points,
    maxPoints
  };
}
