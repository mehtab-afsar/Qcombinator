/**
 * UniqueAdvantageContainer Component
 * Clean component: ~41 lines, orchestrates child components
 * Uses useUniqueAdvantage hook for state management
 */

'use client';

import { useUniqueAdvantage, ADVANTAGE_OPTIONS } from '@/src/hooks/use-unique-advantage';
import { AdvantageGrid } from './AdvantageGrid';
import { AdvantageExplanation } from './AdvantageExplanation';

export function UniqueAdvantageContainer() {
  const {
    selectedAdvantages,
    explanation,
    wordCount,
    validation,
    toggleAdvantage,
    updateExplanation,
  } = useUniqueAdvantage();

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Unique Advantages</h3>
        <p className="text-gray-600 text-sm">
          Why are <strong>YOU</strong> specifically the right person to solve this problem? What do
          you know or have access to that others don&apos;t?
        </p>
      </div>

      <AdvantageGrid
        options={ADVANTAGE_OPTIONS}
        selected={selectedAdvantages}
        onToggle={toggleAdvantage}
      />

      {selectedAdvantages.length > 0 && (
        <AdvantageExplanation
          value={explanation}
          onChange={updateExplanation}
          wordCount={wordCount}
          validation={validation}
          selectedAdvantages={selectedAdvantages}
        />
      )}

      {/* Why we ask */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> &quot;Unfair advantages&quot; are what
          separate successful startups from the 1,000 others trying to solve the same problem.
          First Round Capital found that founders with domain expertise reach product-market fit
          2.1x faster.
        </p>
      </div>
    </div>
  );
}
