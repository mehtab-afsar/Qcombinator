"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, AlertCircle, CheckCircle } from "lucide-react";
import { FeatureFlags } from "@/lib/feature-flags";
import { ProblemOriginContainer } from "@/src/components/features/assessment/problem-origin/ProblemOriginContainer";

interface ProblemOriginFormProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProblemOriginForm({ value, onChange }: ProblemOriginFormProps) {
  // Feature flag: Use new clean architecture components
  if (FeatureFlags.USE_NEW_PROBLEM_ORIGIN) {
    return <ProblemOriginContainer />;
  }

  // Legacy implementation below
  const wordCount = value.trim().split(/\s+/).filter(w => w.length > 0).length;
  const minWords = 100;
  const targetWords = 200;
  const isMinimumMet = wordCount >= minWords;

  const getProgressColor = () => {
    if (wordCount >= targetWords) return "text-green-600";
    if (wordCount >= minWords) return "text-yellow-600";
    return "text-gray-500";
  };

  const getProgressMessage = () => {
    if (wordCount >= targetWords) return "Excellent detail!";
    if (wordCount >= minWords) return "Good - adding more detail will improve your score";
    return `${minWords - wordCount} more words needed`;
  };

  return (
    <div className="space-y-4">
      {/* Title & Instructions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Problem Origin Story
        </h3>
        <p className="text-gray-600 text-sm">
          Tell us the story of how you discovered this problem.
          <strong> Be specific:</strong> When, where, and what was happening?
        </p>
      </div>

      {/* Example of strong answer */}
      <details className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-blue-900 flex items-center">
          <Brain className="h-4 w-4 mr-2" />
          See an example of a strong answer
        </summary>
        <div className="mt-3 text-sm text-blue-800 space-y-2">
          <p className="italic">
            "In 2022, I was running procurement for a 200-person startup.
            Every month, our finance team spent 40+ hours manually reconciling
            purchase orders with invoices across 15 different vendor systems.
            We had $2M in duplicate payments in one year because of this chaos."
          </p>
          <p className="italic">
            "I built a spreadsheet automation that saved us 30 hours/month,
            and when I shared it on LinkedIn, 50 other procurement managers
            asked for it within 48 hours. That's when I realized this wasn't
            just our problem."
          </p>
          <p className="font-medium text-blue-900 mt-2">
            Why this is strong:
          </p>
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
          <span className={`text-sm ${getProgressColor()}`}>
            {wordCount} words • {getProgressMessage()}
          </span>
          {isMinimumMet && (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
        </div>
      </div>

      {/* Guidance based on content */}
      {value.length > 50 && (
        <div className="space-y-2">
          {!value.match(/\d+/) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Add specific numbers to make your story more concrete
                (e.g., "spent 20 hours/week" or "$50K/year wasted")
              </AlertDescription>
            </Alert>
          )}

          {!/(I|my|me|we)/i.test(value) && (
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

      {/* Why we ask this */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> Investors look for
          founders who are "in the problem" - you've personally experienced the pain and
          understand it deeply. This is the #1 predictor of startup success according to
          Y Combinator's analysis of 3,000+ companies.
        </p>
      </div>
    </div>
  );
}
