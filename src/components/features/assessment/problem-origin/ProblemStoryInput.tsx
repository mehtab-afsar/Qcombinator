/**
 * ProblemStoryInput Component
 * Clean component: ~48 lines, single responsibility
 * Displays problem story textarea with validation feedback
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, AlertCircle, CheckCircle } from 'lucide-react';
import type { ProblemOriginValidation } from '@/src/hooks/use-problem-origin';

interface ProblemStoryInputProps {
  value: string;
  onChange: (value: string) => void;
  wordCount: number;
  validation: ProblemOriginValidation;
}

export function ProblemStoryInput({
  value,
  onChange,
  wordCount,
  validation,
}: ProblemStoryInputProps) {
  return (
    <div className="space-y-4">
      {/* Example of strong answer */}
      <details className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-blue-900 flex items-center">
          <Brain className="h-4 w-4 mr-2" />
          See an example of a strong answer
        </summary>
        <div className="mt-3 text-sm text-blue-800 space-y-2">
          <p className="italic">
            "In 2022, I was running procurement for a 200-person startup. Every month, our finance
            team spent 40+ hours manually reconciling purchase orders with invoices across 15
            different vendor systems. We had $2M in duplicate payments in one year because of this
            chaos."
          </p>
          <p className="italic">
            "I built a spreadsheet automation that saved us 30 hours/month, and when I shared it
            on LinkedIn, 50 other procurement managers asked for it within 48 hours. That's when I
            realized this wasn't just our problem."
          </p>
          <p className="font-medium text-blue-900 mt-2">Why this is strong:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Personal experience (not just observation)</li>
            <li>Specific numbers ($2M, 40+ hours, 15 systems, 50 requests)</li>
            <li>Clear pain point (duplicate payments, time waste)</li>
            <li>Early validation (50 people asked for solution)</li>
          </ul>
        </div>
      </details>

      {/* Main textarea */}
      <div>
        <Label htmlFor="problem-story">Your Story</Label>
        <Textarea
          id="problem-story"
          placeholder="Start with: 'In [year], I was [doing what]...'"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 min-h-[200px]"
          rows={10}
        />

        {/* Word count indicator */}
        <div className="flex items-center justify-between mt-2">
          <span className={`text-sm ${validation.progressColor}`}>
            {wordCount} words • {validation.progressMessage}
          </span>
          {validation.isMinimumMet && <CheckCircle className="h-4 w-4 text-green-600" />}
        </div>
      </div>

      {/* Guidance based on content */}
      {value.length > 50 && (
        <div className="space-y-2">
          {!validation.hasNumbers && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Add specific numbers to make your story more concrete (e.g.,
                "spent 20 hours/week" or "$50K/year wasted")
              </AlertDescription>
            </Alert>
          )}

          {!validation.hasPersonalExperience && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Describe YOUR personal experience with this problem.
                First-hand experience is much stronger than observation.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
