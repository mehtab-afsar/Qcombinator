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
  const hasOriginStory = data.problemOrigin && data.problemOrigin.length > 0;
  const originLength = data.problemOrigin?.length || 0;
  const hasPersonalExperience = data.problemOrigin?.toLowerCase().includes('i ') ||
                                 data.problemOrigin?.toLowerCase().includes('my ') ||
                                 data.problemOrigin?.toLowerCase().includes('we ');

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
  const hasAdvantage = data.uniqueAdvantage && data.uniqueAdvantage.length > 0;
  const advantageLength = data.uniqueAdvantage?.length || 0;

  // Check for specific advantage types (insider knowledge, relationships, technical expertise)
  const hasInsiderKnowledge = data.uniqueAdvantage?.toLowerCase().includes('experience') ||
                               data.uniqueAdvantage?.toLowerCase().includes('worked') ||
                               data.uniqueAdvantage?.toLowerCase().includes('industry');
  const hasNetwork = data.uniqueAdvantage?.toLowerCase().includes('network') ||
                     data.uniqueAdvantage?.toLowerCase().includes('connection') ||
                     data.uniqueAdvantage?.toLowerCase().includes('relationship');
  const hasTechnical = data.uniqueAdvantage?.toLowerCase().includes('technical') ||
                       data.uniqueAdvantage?.toLowerCase().includes('engineer') ||
                       data.uniqueAdvantage?.toLowerCase().includes('built');

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
  const teamMentioned = (data.problemOrigin?.toLowerCase().includes('team') ||
                         data.problemOrigin?.toLowerCase().includes('we ') ||
                         data.problemOrigin?.toLowerCase().includes('us ')) ?? false;

  const hasCofounder = data.problemOrigin?.toLowerCase().includes('cofounder') ||
                       data.problemOrigin?.toLowerCase().includes('co-founder') ||
                       data.problemOrigin?.toLowerCase().includes('partner') ||
                       data.problemOrigin?.toLowerCase().includes('founded with') ||
                       false;

  const teamSize = data.teamSize || 1; // Default to solo if not specified

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
    const hasRoleClarity = data.uniqueAdvantage?.toLowerCase().includes('ceo') ||
                          data.uniqueAdvantage?.toLowerCase().includes('cto') ||
                          data.uniqueAdvantage?.toLowerCase().includes('technical') ||
                          data.uniqueAdvantage?.toLowerCase().includes('business') ||
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
  const hasFailedAssumptions = data.failedAssumptions && data.failedAssumptions.length > 0;
  const assumptionsLength = data.failedAssumptions?.length || 0;

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
  const iterationCount = data.iterationCount || 0;

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
