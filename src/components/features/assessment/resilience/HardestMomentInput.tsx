/**
 * HardestMomentInput Component
 * Clean component: ~35 lines, single responsibility
 * Displays textarea with word count and adversity detection
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

interface HardestMomentInputProps {
  value: string;
  onChange: (value: string) => void;
  wordCount: number;
  hasAdversity: boolean;
}

export function HardestMomentInput({
  value,
  onChange,
  wordCount,
  hasAdversity,
}: HardestMomentInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="hardest-moment">
        Tell us about the hardest moment in your startup journey so far *
      </Label>
      <p className="text-xs text-gray-600">
        What was the situation? What happened? How did it feel?
      </p>
      <Textarea
        id="hardest-moment"
        placeholder="During my first startup, we were weeks from running out of money. Our lead investor backed out at the last minute..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-[150px]"
        rows={8}
      />
      <div className="flex items-center justify-between">
        <span className={`text-sm ${wordCount >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
          {wordCount} words {wordCount < 50 && `• ${50 - wordCount} more needed`}
        </span>
        {hasAdversity && (
          <div className="flex items-center space-x-2 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Real adversity detected</span>
          </div>
        )}
      </div>

      {!hasAdversity && value.length > 50 && (
        <Alert>
          <AlertDescription>
            <strong>Tip:</strong> Include words that show real difficulty (&quot;failed&quot;, &quot;rejected&quot;,
            &quot;ran out of money&quot;, &quot;crisis&quot;, etc.). We want to understand the true challenges you faced.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
