"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface LearningVelocityFormProps {
  data: {
    tested: string;
    buildTime: number;
    measurement: string;
    results: string;
    learned: string;
    changed: string;
  };
  onChange: (field: string, value: string | number) => void;
}

export function LearningVelocityForm({ data, onChange }: LearningVelocityFormProps) {
  const learnedWords = data.learned.trim().split(/\s+/).filter(w => w.length > 0).length;
  const changedWords = data.changed.trim().split(/\s+/).filter(w => w.length > 0).length;

  const hasNumbers = /\d+/.test(data.results);
  const hasComparison = /(vs|compared|before|after|baseline|goal)/i.test(data.measurement + data.results);

  const getSpeedRating = () => {
    if (data.buildTime <= 7) return { text: '🔥 Weekly iterations - exceptional!', color: 'text-green-600' };
    if (data.buildTime <= 14) return { text: '✅ Bi-weekly - very good', color: 'text-blue-600' };
    if (data.buildTime <= 30) return { text: '👍 Monthly - good', color: 'text-yellow-600' };
    if (data.buildTime <= 60) return { text: '⚠️ Every 2 months - slow', color: 'text-orange-600' };
    return { text: '🐌 Too slow - speed up!', color: 'text-red-600' };
  };

  const speedRating = getSpeedRating();

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Build-Measure-Learn Cycle
        </h3>
        <p className="text-gray-600 text-sm">
          Walk us through your fastest customer feedback loop. From
          <strong> idea → prototype → customer reaction → change</strong>, how long did each step take?
        </p>
      </div>

      {/* Example */}
      <details className="bg-green-50 border border-green-200 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-green-900 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          See an example
        </summary>
        <div className="mt-3 text-sm text-green-800 space-y-2">
          <p><strong>What I tested:</strong> <em>Figma mockup of invoice-matching flow</em></p>
          <p><strong>Time to build/test:</strong> <em>3 days to design, 2 days to get 5 customer reviews = 5 days total</em></p>
          <p><strong>How I measured:</strong> <em>Confusion points (where they asked &quot;what does this do?&quot;) and time to complete test task (goal: under 2 minutes)</em></p>
          <p><strong>Results:</strong> <em>4 out of 5 customers didn&apos;t understand the &quot;Smart Match&quot; button. Average task time: 4 minutes (goal was &lt;2 min)</em></p>
          <p><strong>What I learned:</strong> <em>&quot;Smart&quot; means nothing to them. They wanted to see &quot;Auto-match 47 invoices&quot; (specific number showing what would happen)</em></p>
          <p><strong>What I changed:</strong> <em>Replaced button copy, showed count. Next test: 5/5 understood immediately, task completion dropped to 1.5 min.</em></p>
        </div>
      </details>

      {/* What you tested */}
      <div>
        <Label htmlFor="tested">What did you test? *</Label>
        <Input
          id="tested"
          placeholder="e.g., Figma mockup of checkout flow, MVP landing page, prototype feature"
          value={data.tested}
          onChange={(e) => onChange('tested', e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Build time */}
      <div>
        <Label htmlFor="build-time">How long to build and test? (days) *</Label>
        <div className="space-y-3 mt-2">
          <div className="flex items-center space-x-4">
            <input
              type="range"
              id="build-time"
              min="1"
              max="90"
              value={data.buildTime}
              onChange={(e) => onChange('buildTime', parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-2xl font-bold text-gray-900 min-w-[60px]">
                {data.buildTime}
              </span>
              <span className="text-gray-600">days</span>
            </div>
          </div>
          <p className={`text-sm ${speedRating.color} font-medium`}>
            {speedRating.text}
          </p>
        </div>
        {data.buildTime > 30 && (
          <Alert className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Top founders iterate weekly. Try breaking your tests into smaller experiments
              you can run in 7 days or less.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* How measured */}
      <div>
        <Label htmlFor="measurement">How did you measure success? *</Label>
        <Textarea
          id="measurement"
          placeholder="What metrics did you track? What was your goal/baseline?"
          value={data.measurement}
          onChange={(e) => onChange('measurement', e.target.value)}
          className="mt-1 min-h-[80px]"
          rows={4}
        />
      </div>

      {/* Results */}
      <div>
        <Label htmlFor="results">What were the results? (be specific) *</Label>
        <Textarea
          id="results"
          placeholder="Include numbers: '3 out of 5 users...', 'Conversion rate was 12%...', 'Average time: 4 minutes...'"
          value={data.results}
          onChange={(e) => onChange('results', e.target.value)}
          className="mt-1 min-h-[80px]"
          rows={4}
        />
        {hasNumbers && hasComparison ? (
          <div className="flex items-center space-x-2 mt-2 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Excellent! Quantified results with comparison</span>
          </div>
        ) : hasNumbers ? (
          <div className="flex items-center space-x-2 mt-2 text-blue-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Good! Consider adding baseline/goal for comparison</span>
          </div>
        ) : (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip:</strong> Add specific numbers (percentages, counts, times)
              to make your results measurable
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* What you learned */}
      <div>
        <Label htmlFor="learned">What did you learn? *</Label>
        <Textarea
          id="learned"
          placeholder="What insights did you gain? What surprised you?"
          value={data.learned}
          onChange={(e) => onChange('learned', e.target.value)}
          className="mt-1 min-h-[100px]"
          rows={5}
        />
        <p className={`text-sm mt-1 ${learnedWords >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
          {learnedWords} words {learnedWords < 20 && `• ${20 - learnedWords} more needed`}
        </p>
      </div>

      {/* What you changed */}
      <div>
        <Label htmlFor="changed">What did you change as a result? *</Label>
        <Textarea
          id="changed"
          placeholder="Be specific: 'Changed button text from X to Y', 'Removed feature Z', 'Added step W to onboarding...'"
          value={data.changed}
          onChange={(e) => onChange('changed', e.target.value)}
          className="mt-1 min-h-[100px]"
          rows={5}
        />
        <p className={`text-sm mt-1 ${changedWords >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
          {changedWords} words {changedWords < 20 && `• ${20 - changedWords} more needed`}
        </p>
        {data.changed.length > 30 && (
          <div>
            {/button|feature|flow|design|copy|code|page|screen|added|removed|changed/i.test(data.changed) ? (
              <div className="flex items-center space-x-2 mt-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Great! Specific changes show you took action</span>
              </div>
            ) : (
              <Alert className="mt-2">
                <AlertDescription>
                  <strong>Tip:</strong> Be more specific about what you changed
                  (e.g., &quot;button&quot;, &quot;feature&quot;, &quot;flow&quot;, &quot;copy&quot;)
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      {/* Benchmark comparison */}
      {data.buildTime > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">Your Iteration Speed</h4>
              <p className="text-sm text-blue-700 mt-1">
                You completed this cycle in <strong>{data.buildTime} days</strong>.
                {data.buildTime <= 7 && " That's faster than 90% of founders! Keep it up."}
                {data.buildTime > 7 && data.buildTime <= 14 && " That's solid. Can you get it under 7 days next time?"}
                {data.buildTime > 14 && " Try to get your next cycle under 7 days - speed is a competitive advantage."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Why we ask */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> Iteration speed is one
          of the few advantages startups have over big companies. Top YC companies iterate
          weekly. The faster you can test→learn→change, the faster you find product-market fit.
        </p>
      </div>
    </div>
  );
}
