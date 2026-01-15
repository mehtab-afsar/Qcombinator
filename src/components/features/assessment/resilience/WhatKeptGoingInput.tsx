/**
 * WhatKeptGoingInput Component
 * Clean component: ~47 lines, single responsibility
 * Displays motivation textarea with intrinsic motivation detection
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Heart } from 'lucide-react';

interface WhatKeptGoingInputProps {
  value: string;
  onChange: (value: string) => void;
  wordCount: number;
  hasIntrinsicMotivation: boolean;
}

export function WhatKeptGoingInput({
  value,
  onChange,
  wordCount,
  hasIntrinsicMotivation,
}: WhatKeptGoingInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="what-kept-going">
        What kept you going? Why didn&apos;t you quit? *
      </Label>
      <p className="text-xs text-gray-600 mt-1 mb-2">
        Be specific about your motivation. What made you push through?
      </p>
      <Textarea
        id="what-kept-going"
        placeholder="I kept going because... / I realized that... / The customers told me..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-[120px]"
        rows={6}
      />
      <div className="flex items-center justify-between mt-2">
        <span className={`text-sm ${wordCount >= 30 ? 'text-green-600' : 'text-gray-500'}`}>
          {wordCount} words {wordCount < 30 && `• ${30 - wordCount} more needed`}
        </span>
        {hasIntrinsicMotivation && (
          <div className="flex items-center space-x-2 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Strong intrinsic motivation detected</span>
          </div>
        )}
      </div>

      {!hasIntrinsicMotivation && value.length > 30 && (
        <Alert>
          <AlertDescription>
            <strong>Tip:</strong> Connect to your deeper &quot;why&quot; - belief in the mission,
            commitment to customers, or the importance of the problem. Intrinsic motivation
            outlasts external rewards.
          </AlertDescription>
        </Alert>
      )}

      {value.length > 50 && (
        <div
          className={`rounded-lg p-4 border-2 ${
            hasIntrinsicMotivation
              ? 'bg-green-50 border-green-300'
              : 'bg-yellow-50 border-yellow-300'
          }`}
        >
          <div className="flex items-start space-x-3">
            {hasIntrinsicMotivation ? (
              <>
                <Heart className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Intrinsic Motivation Detected</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your motivation comes from within - belief in the mission, commitment to
                    solving the problem. This is the kind of drive that gets through the hardest
                    times.
                  </p>
                </div>
              </>
            ) : (
              <AlertDescription className="text-yellow-800">
                <strong>Consider your deeper &quot;why&quot;:</strong> What would make you keep going even
                if the business struggled? Connection to the problem, belief in the mission, or
                commitment to your customers?
              </AlertDescription>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
