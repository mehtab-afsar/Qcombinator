/**
 * Problem-Fit Scoring Service
 * Clean, testable service for calculating founder-problem fit scores
 * Max: 200 points (20% of total founder score)
 */

import {
  countWords,
  extractNumbers,
  hasPersonalExperience,
  hasValidationIndicators,
  hasQuantification,
  parseDuration,
  getWordCount,
  hasSpecificExamples,
} from '@/lib/utils/text-analysis';

// ============================================================================
// INTERFACES
// ============================================================================

interface ProblemOriginScore {
  total: number;
  breakdown: {
    personalExperience: number;
    quantification: number;
    validation: number;
    detail: number;
  };
}

interface UniqueAdvantageScore {
  total: number;
  breakdown: {
    selectionScore: number;
    explanationDepth: number;
    specificity: number;
  };
}

// ============================================================================
// PROBLEM-FIT SCORER SERVICE
// ============================================================================

export class ProblemFitScorer {
  /**
   * Score Problem Origin Story
   * Max: 100 points
   */
  static scoreProblemOrigin(story: string, followUpAnswers?: string[]): ProblemOriginScore {
    const breakdown = {
      personalExperience: this.scorePersonalExperience(story),
      quantification: this.scoreQuantification(story),
      validation: this.scoreValidation(story),
      detail: this.scoreDetail(story),
    };

    return {
      total: Object.values(breakdown).reduce((sum, val) => sum + val, 0),
      breakdown,
    };
  }

  /**
   * Score Unique Advantage
   * Max: 100 points
   */
  static scoreUniqueAdvantage(
    selections: string[],
    explanation: string
  ): UniqueAdvantageScore {
    const breakdown = {
      selectionScore: this.scoreAdvantageSelection(selections),
      explanationDepth: this.scoreExplanationDepth(explanation),
      specificity: this.scoreSpecificity(explanation),
    };

    let total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    // Cross-validation bonus (0-10 points)
    if (selections.includes('customer-relationships')) {
      const commitmentWords = ['loi', 'letter of intent', 'signed', 'contract', 'agreement'];
      const hasCommitment = commitmentWords.some((word) =>
        explanation.toLowerCase().includes(word)
      );

      if (hasCommitment) {
        total += 10; // Strong validation
      } else if (hasValidationIndicators(explanation)) {
        total += 5; // Weak validation
      }
    }

    return {
      total: Math.min(total, 100),
      breakdown,
    };
  }

  // Private helper methods
  private static scorePersonalExperience(story: string): number {
    let score = 0;

    if (hasPersonalExperience(story)) {
      score += 25; // Base points for personal experience

      // Time depth bonus (0-15 points)
      const timeMatch = story.match(/(\d+)\s*(year|month|week)/gi);
      if (timeMatch) {
        const duration = parseDuration(timeMatch[0]);
        if (duration >= 12) score += 15; // 1+ year
        else if (duration >= 6) score += 10; // 6+ months
        else if (duration >= 3) score += 5; // 3+ months
      }
    } else {
      // Observed problem (weaker signal)
      const observationWords = ['i saw', 'i noticed', 'i observed', 'i found'];
      const hasObservation = observationWords.some((word) =>
        story.toLowerCase().includes(word)
      );
      score += hasObservation ? 10 : 5;
    }

    return Math.min(score, 40);
  }

  private static scoreQuantification(story: string): number {
    let score = 0;

    const hasNumbers = extractNumbers(story).length > 0;

    if (hasQuantification(story)) {
      score += 20; // Quantified impact with units

      // Specificity bonus for multiple numbers
      const numberCount = extractNumbers(story).length;
      score += Math.min(numberCount * 2, 10); // Up to 10 bonus points
    } else if (hasNumbers) {
      score += 10; // Some quantification
    }

    return Math.min(score, 30);
  }

  private static scoreValidation(story: string): number {
    let score = 0;

    if (hasValidationIndicators(story)) {
      score += 12;

      // Evidence of quantified demand
      const demandPattern = /\d+\s*(people|customers|companies|users|requests|asked)/i;
      if (demandPattern.test(story)) {
        score += 8; // Quantified validation
      }
    }

    return Math.min(score, 20);
  }

  private static scoreDetail(story: string): number {
    const wordCount = getWordCount(story);

    if (wordCount >= 200) return 10;
    if (wordCount >= 150) return 7;
    if (wordCount >= 100) return 5;
    if (wordCount >= 50) return 2;
    return 0;
  }

  private static scoreAdvantageSelection(selections: string[]): number {
    const advantageWeights: Record<string, number> = {
      'industry-experience': 15,
      'technical-skills': 12,
      'customer-relationships': 20, // Strongest signal
      'proprietary-insight': 18,
      'relevant-failure': 12,
      'distribution-advantage': 15,
    };

    const selectedScore = selections.reduce(
      (sum, sel) => sum + (advantageWeights[sel] || 0),
      0
    );

    return Math.min(selectedScore, 50);
  }

  private static scoreExplanationDepth(explanation: string): number {
    const wordCount = getWordCount(explanation);

    if (wordCount >= 150) return 20;
    if (wordCount >= 100) return 15;
    if (wordCount >= 50) return 10;
    if (wordCount >= 25) return 5;
    return 0;
  }

  private static scoreSpecificity(explanation: string): number {
    let score = 0;

    // Company names (proper capitalization)
    if (/\b(at|worked|joined|from)\s+[A-Z]\w+/g.test(explanation)) {
      score += 5;
    }

    // Numbers with context
    if (/\d+\s*(year|customer|user|client|partner|company)/gi.test(explanation)) {
      score += 7;
    }

    // Proper names (people)
    if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(explanation)) {
      score += 3;
    }

    // Legal commitments
    if (/(LOI|letter of intent|contract|signed|agreement)/i.test(explanation)) {
      score += 5;
    }

    return Math.min(score, 20);
  }

  /**
   * Calculate total problem-fit score
   * Max: 200 points
   */
  static calculateTotal(
    problemOrigin: ProblemOriginScore,
    uniqueAdvantage: UniqueAdvantageScore
  ): number {
    return problemOrigin.total + uniqueAdvantage.total;
  }
}
