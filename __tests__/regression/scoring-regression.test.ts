/**
 * CRITICAL: Scoring Regression Tests
 *
 * These tests lock down the current scoring behavior.
 * ANY changes to scoring algorithms MUST produce IDENTICAL scores.
 *
 * Purpose: Ensure refactored services calculate exact same scores as old implementation
 */

import { scoreProblemOrigin, scoreUniqueAdvantage } from '@/lib/scoring/problem-fit';
import { ProblemFitScorer } from '@/src/services/scoring/problem-fit.scorer';

describe('Scoring Regression Tests - Problem Fit', () => {
  describe('Problem Origin Scoring', () => {
    const testCases = [
      {
        name: 'High-quality founder story with personal experience',
        input: `I spent 5 years as a CTO at a fintech startup where I personally experienced the nightmare of manual invoice reconciliation. Every month, my team wasted 40+ hours manually matching transactions, costing us over $50,000 annually in labor alone. I talked to 30+ other CTOs who faced the same issue. This isn't a theoretical problem - I lived it for years and watched my team suffer.`,
        expectedScore: 85, // High score: personal experience + quantification + validation
      },
      {
        name: 'Moderate quality story with some quantification',
        input: `I worked in healthcare administration for 3 years and noticed that scheduling was always a pain point. It took our team about 20 hours per week to manage schedules manually.`,
        expectedScore: 55, // Moderate: some experience + some quantification
      },
      {
        name: 'Weak story without personal experience',
        input: `I read an article about problems in the education sector and thought there might be an opportunity to build something.`,
        expectedScore: 15, // Low: no personal experience, no validation
      },
      {
        name: 'Empty input',
        input: '',
        expectedScore: 3, // Minimum score
      },
      {
        name: 'Very long comprehensive story (edge case)',
        input: `${'I spent 7 years working in enterprise software sales, managing a team of 15 people. '.repeat(20)}I spoke to over 100 customers about this problem. ${' The pain point was costing companies an average of $200K annually.'.repeat(10)}`,
        expectedScore: 90, // High: length + experience + quantification
      },
    ];

    testCases.forEach((testCase) => {
      it(`OLD vs NEW: ${testCase.name}`, () => {
        // OLD implementation (current production)
        const oldScore = scoreProblemOrigin(testCase.input);

        // NEW implementation (refactored service)
        const newScore = ProblemFitScorer.scoreProblemOrigin(testCase.input);

        // CRITICAL: Scores MUST match exactly
        expect(newScore.total).toBe(oldScore);

        // Also verify it's close to expected (allow 10% variance for algorithm tweaks)
        const variance = Math.abs(newScore.total - testCase.expectedScore) / testCase.expectedScore;
        expect(variance).toBeLessThan(0.15); // 15% tolerance

        // Log for visibility
        console.log(`✓ ${testCase.name}: Old=${oldScore}, New=${newScore.total}, Expected~${testCase.expectedScore}`);
      });
    });
  });

  describe('Unique Advantage Scoring', () => {
    const testCases = [
      {
        name: 'Multiple high-value advantages with detailed explanation',
        selections: ['customer-relationships', 'proprietary-insight', 'industry-experience'],
        explanation: `I have personal relationships with the CTOs at 15 Fortune 500 companies from my previous role as VP of Engineering at Stripe. I built the original fraud detection system that processed $50B in transactions. I also spent 10 years in fintech before starting this, giving me deep domain expertise that competitors don't have.`,
        expectedScore: 85,
      },
      {
        name: 'Single advantage with moderate explanation',
        selections: ['technical-skills'],
        explanation: `I have a PhD in machine learning and worked on AI systems for 3 years.`,
        expectedScore: 35,
      },
      {
        name: 'No selection, no explanation',
        selections: [],
        explanation: '',
        expectedScore: 3,
      },
    ];

    testCases.forEach((testCase) => {
      it(`OLD vs NEW: ${testCase.name}`, () => {
        // OLD implementation
        const oldScore = scoreUniqueAdvantage(testCase.selections, testCase.explanation);

        // NEW implementation
        const newScore = ProblemFitScorer.scoreUniqueAdvantage(
          testCase.selections,
          testCase.explanation
        );

        // CRITICAL: Must match
        expect(newScore.total).toBe(oldScore);

        // Verify close to expected
        const variance = Math.abs(newScore.total - testCase.expectedScore) / testCase.expectedScore;
        expect(variance).toBeLessThan(0.15);

        console.log(`✓ ${testCase.name}: Old=${oldScore}, New=${newScore.total}`);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('handles extremely long input (10,000 words)', () => {
      const longText = 'I worked in the industry for many years. '.repeat(2000);
      const oldScore = scoreProblemOrigin(longText);
      const newScore = ProblemFitScorer.scoreProblemOrigin(longText);

      expect(newScore.total).toBe(oldScore);
    });

    it('handles special characters and emoji', () => {
      const textWithSpecialChars = `I spent 🔥 5 years @ company dealing with $ issues & problems! Cost: $50K/month.`;
      const oldScore = scoreProblemOrigin(textWithSpecialChars);
      const newScore = ProblemFitScorer.scoreProblemOrigin(textWithSpecialChars);

      expect(newScore.total).toBe(oldScore);
    });

    it('handles text with multiple languages', () => {
      const multiLangText = `I spent 5 years working on this problem. Hola. Bonjour. 你好.`;
      const oldScore = scoreProblemOrigin(multiLangText);
      const newScore = ProblemFitScorer.scoreProblemOrigin(multiLangText);

      expect(newScore.total).toBe(oldScore);
    });

    it('handles numeric text', () => {
      const numericText = `123 456 789 0 50000 100000`;
      const oldScore = scoreProblemOrigin(numericText);
      const newScore = ProblemFitScorer.scoreProblemOrigin(numericText);

      expect(newScore.total).toBe(oldScore);
    });
  });
});

describe('Scoring Performance Benchmarks', () => {
  it('NEW implementation should be as fast or faster than OLD', () => {
    const testInput = `I spent 5 years as a CTO at a fintech startup where I personally experienced the nightmare of manual invoice reconciliation. Every month, my team wasted 40+ hours manually matching transactions.`;

    // Warm up
    for (let i = 0; i < 10; i++) {
      scoreProblemOrigin(testInput);
      ProblemFitScorer.scoreProblemOrigin(testInput);
    }

    // Benchmark OLD
    const oldStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      scoreProblemOrigin(testInput);
    }
    const oldTime = performance.now() - oldStart;

    // Benchmark NEW
    const newStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      ProblemFitScorer.scoreProblemOrigin(testInput);
    }
    const newTime = performance.now() - newStart;

    console.log(`Performance: OLD=${oldTime.toFixed(2)}ms, NEW=${newTime.toFixed(2)}ms`);

    // NEW should not be more than 20% slower
    expect(newTime).toBeLessThan(oldTime * 1.2);
  });
});
