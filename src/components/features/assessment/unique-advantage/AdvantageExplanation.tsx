/**
 * AdvantageExplanation Component
 * Clean component: ~48 lines, single responsibility
 * Displays explanation textarea with validation feedback
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, CheckCircle, AlertCircle } from 'lucide-react';
import type { UniqueAdvantageValidation } from '@/src/hooks/use-unique-advantage';

interface AdvantageExplanationProps {
  value: string;
  onChange: (value: string) => void;
  wordCount: number;
  validation: UniqueAdvantageValidation;
  selectedAdvantages: string[];
}

export function AdvantageExplanation({
  value,
  onChange,
  wordCount,
  validation,
  selectedAdvantages,
}: AdvantageExplanationProps) {
  const { strongestAdvantage, isMinimumMet, hasNumbers, hasCommitments, progressColor, progressMessage } = validation;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="advantage-explanation">
          {strongestAdvantage ? 'Explain your strongest advantage' : 'Pick your strongest advantage'} with a specific example
        </Label>
        <Textarea
          id="advantage-explanation"
          placeholder="Example: &apos;I was a senior engineer at Stripe for 4 years working on SMB payments. I personally onboarded 200+ merchants and kept hearing the same complaint about accounting reconciliation. I stayed in touch with 15 of them as early design partners, and 8 have already signed LOIs...&apos;"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 min-h-[150px]"
          rows={8}
        />

        {/* Word count */}
        <div className="flex items-center justify-between mt-2">
          <span className={`text-sm ${progressColor}`}>
            {wordCount} words{progressMessage}
          </span>
          {isMinimumMet && <CheckCircle className="h-4 w-4 text-green-600" />}
        </div>
      </div>

      {/* Guidance */}
      {value.length > 30 && (
        <div className="space-y-2">
          {!hasNumbers && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Add specific numbers to strengthen your example (e.g., &quot;4
                years at Company X&quot; or &quot;200+ customers&quot;)
              </AlertDescription>
            </Alert>
          )}

          {selectedAdvantages.includes('customer-relationships') && !hasCommitments && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>Pro tip:</strong> If any customers have signed LOIs or committed, mention
                that! It&apos;s extremely strong validation.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Example of strong answer */}
      <details className="bg-green-50 border border-green-200 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-green-900 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          See an example of a strong answer
        </summary>
        <div className="mt-3 text-sm text-green-800 space-y-2">
          <p className="italic">
            &quot;Technical skills to build + Customer relationships. I was a senior engineer at Stripe
            for 4 years working on their SMB payments infrastructure. I personally onboarded 200+
            small business merchants and kept hearing the same complaint: &apos;Accounting
            reconciliation is a nightmare.&apos;&quot;
          </p>
          <p className="italic">
            &quot;I stayed in touch with 15 of them as early design partners, and 8 have already signed
            LOIs to switch to our product once it launches. Two are former colleagues who now run
            accounting firms and can refer us to 50+ clients each.&quot;
          </p>
          <p className="font-medium text-green-900 mt-2">Why this is strong:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Multiple advantages combined (technical + relationships)</li>
            <li>Specific company name (Stripe) adds credibility</li>
            <li>Quantified experience (4 years, 200+ merchants)</li>
            <li>Hard commitments (8 signed LOIs)</li>
            <li>Distribution path (referrals from accounting firms)</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
