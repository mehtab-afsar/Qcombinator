/**
 * ResilienceContainer Component
 * Clean component: ~44 lines, orchestrates child components
 * Uses useResilience hook for state management
 */

'use client';

import { useResilience } from '@/src/hooks/use-resilience';
import { HardestMomentInput } from './HardestMomentInput';
import { QuitScaleSlider } from './QuitScaleSlider';
import { WhatKeptGoingInput } from './WhatKeptGoingInput';

export function ResilienceContainer() {
  const {
    data,
    storyWords,
    reasonWords,
    hasAdversity,
    hasIntrinsicMotivation,
    quitScaleDescription,
    updateHardestMoment,
    updateQuitScale,
    updateWhatKeptGoing,
  } = useResilience();

  return (
    <div className="space-y-6">
      <HardestMomentInput
        value={data.hardestMoment}
        onChange={updateHardestMoment}
        wordCount={storyWords}
        hasAdversity={hasAdversity}
      />

      <QuitScaleSlider
        value={data.quitScale}
        onChange={updateQuitScale}
        description={quitScaleDescription}
      />

      <WhatKeptGoingInput
        value={data.whatKeptGoing}
        onChange={updateWhatKeptGoing}
        wordCount={reasonWords}
        hasIntrinsicMotivation={hasIntrinsicMotivation}
      />

      {/* Why we ask */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> Startups are brutal. The
          average founder faces rejection hundreds of times. What separates successful founders
          from failed ones isn&apos;t avoiding adversity - it&apos;s the determination to push through it.
          Investors want to know you won&apos;t quit when things get hard (and they will).
        </p>
      </div>
    </div>
  );
}
