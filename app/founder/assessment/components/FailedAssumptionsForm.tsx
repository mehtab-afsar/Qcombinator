"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, TrendingUp, CheckCircle } from "lucide-react";

interface FailedAssumptionsFormProps {
  data: {
    failedBelief: string;
    failedReasoning: string;
    failedDiscovery: string;
    failedChange: string;
  };
  onChange: (field: string, value: string) => void;
}

export function FailedAssumptionsForm({ data, onChange }: FailedAssumptionsFormProps) {
  const beliefWords = data.failedBelief.trim().split(/\s+/).filter(w => w.length > 0).length;
  const discoveryWords = data.failedDiscovery.trim().split(/\s+/).filter(w => w.length > 0).length;
  const changeWords = data.failedChange.trim().split(/\s+/).filter(w => w.length > 0).length;

  const hasImpactNumbers = /\d+%|\dx|doubled|tripled|increased|decreased/i.test(data.failedChange);

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          What You Got Wrong
        </h3>
        <p className="text-gray-600 text-sm">
          Great founders learn fast by changing their minds when presented with data.
          Tell us about an assumption that turned out to be <strong>wrong</strong>.
        </p>
      </div>

      {/* Encouraging Message */}
      <Alert className="bg-blue-50 border-blue-200">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Don't worry about looking wrong!</strong> Admitting mistakes shows learning
          velocity - one of the top traits investors look for. Every successful founder has
          a graveyard of failed assumptions.
        </AlertDescription>
      </Alert>

      {/* Example */}
      <details className="bg-green-50 border border-green-200 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-green-900 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          See an example
        </summary>
        <div className="mt-3 text-sm text-green-800 space-y-3">
          <div>
            <strong>What I believed:</strong> <em>SMBs would love AI-powered invoice categorization</em>
          </div>
          <div>
            <strong>Why I believed it:</strong> <em>Every demo of AI features gets oohs and aahs at conferences</em>
          </div>
          <div>
            <strong>What I discovered:</strong> <em>They don't trust AI with their financials. One customer said, "I need to know exactly why this got categorized as 'Travel' not 'Meals.' Black box AI scares me for taxes."</em>
          </div>
          <div>
            <strong>How it changed my approach:</strong> <em>We now show AI confidence scores and let users set rules. Adoption went from 12% to 67% in two weeks. Turns out they want "AI-assisted" not "AI-automated."</em>
          </div>
        </div>
      </details>

      {/* What you believed */}
      <div>
        <Label htmlFor="failed-belief">What did you believe about your customers or market? *</Label>
        <Textarea
          id="failed-belief"
          placeholder="I believed that customers would..."
          value={data.failedBelief}
          onChange={(e) => onChange('failedBelief', e.target.value)}
          className="mt-1 min-h-[80px]"
          rows={4}
        />
        <p className={`text-sm mt-1 ${beliefWords >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
          {beliefWords} words {beliefWords < 20 && `• ${20 - beliefWords} more needed`}
        </p>
      </div>

      {/* Why you believed it */}
      <div>
        <Label htmlFor="failed-reasoning">Why did you believe that?</Label>
        <Textarea
          id="failed-reasoning"
          placeholder="I thought this because..."
          value={data.failedReasoning}
          onChange={(e) => onChange('failedReasoning', e.target.value)}
          className="mt-1 min-h-[80px]"
          rows={4}
        />
      </div>

      {/* What you discovered */}
      <div>
        <Label htmlFor="failed-discovery">What did you discover instead? *</Label>
        <p className="text-xs text-gray-600 mt-1 mb-2">
          Include direct customer quotes if possible
        </p>
        <Textarea
          id="failed-discovery"
          placeholder='Customers actually said... "We need..." or I found that...'
          value={data.failedDiscovery}
          onChange={(e) => onChange('failedDiscovery', e.target.value)}
          className="mt-1 min-h-[100px]"
          rows={5}
        />
        <p className={`text-sm mt-1 ${discoveryWords >= 30 ? 'text-green-600' : 'text-gray-500'}`}>
          {discoveryWords} words
        </p>
        {data.failedDiscovery.includes('"') && (
          <div className="flex items-center space-x-2 mt-2 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Great! Direct quotes show you listened carefully</span>
          </div>
        )}
      </div>

      {/* How it changed your approach */}
      <div>
        <Label htmlFor="failed-change">How did this change your approach? *</Label>
        <p className="text-xs text-gray-600 mt-1 mb-2">
          What specific actions did you take? What was the impact?
        </p>
        <Textarea
          id="failed-change"
          placeholder="We changed... We now... As a result, we saw..."
          value={data.failedChange}
          onChange={(e) => onChange('failedChange', e.target.value)}
          className="mt-1 min-h-[100px]"
          rows={5}
        />
        <p className={`text-sm mt-1 ${changeWords >= 30 ? 'text-green-600' : 'text-gray-500'}`}>
          {changeWords} words
        </p>
      </div>

      {/* Impact indicator */}
      {data.failedChange.length > 30 && (
        <div>
          {hasImpactNumbers ? (
            <Alert className="bg-green-50 border-green-200">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Excellent!</strong> Quantifying the impact of your changes shows
                data-driven decision making.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                <strong>Tip:</strong> If possible, add numbers to show the impact
                (e.g., "adoption increased from 10% to 50%" or "2x faster conversion")
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Why we ask */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> Eric Ries (Lean Startup)
          found that the speed from "hypothesis → customer feedback → pivot" is the #1 predictor
          of early-stage success. Founders who can admit they were wrong and adapt quickly
          dramatically outperform those who stick to the plan.
        </p>
      </div>
    </div>
  );
}
