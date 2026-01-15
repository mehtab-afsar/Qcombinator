/**
 * ProblemOriginContainer Component
 * Clean component: ~38 lines, orchestrates child components
 * Uses useProblemOrigin hook for state management
 */

'use client';

import { useProblemOrigin } from '@/src/hooks/use-problem-origin';
import { ProblemStoryInput } from './ProblemStoryInput';

export function ProblemOriginContainer() {
  const { problemStory, wordCount, validation, updateProblemStory } = useProblemOrigin();

  return (
    <div className="space-y-4">
      {/* Title & Instructions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Problem Origin Story</h3>
        <p className="text-gray-600 text-sm">
          Tell us the story of how you discovered this problem.
          <strong> Be specific:</strong> When, where, and what was happening?
        </p>
      </div>

      <ProblemStoryInput
        value={problemStory}
        onChange={updateProblemStory}
        wordCount={wordCount}
        validation={validation}
      />

      {/* Why we ask this */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> Investors look for founders
          who are &quot;in the problem&quot; - you&apos;ve personally experienced the pain and understand it
          deeply. This is the #1 predictor of startup success according to Y Combinator&apos;s analysis
          of 3,000+ companies.
        </p>
      </div>
    </div>
  );
}
