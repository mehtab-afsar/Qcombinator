"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, CheckCircle, AlertCircle } from "lucide-react";

interface UniqueAdvantageFormProps {
  selectedAdvantages: string[];
  explanation: string;
  onAdvantagesChange: (advantages: string[]) => void;
  onExplanationChange: (explanation: string) => void;
}

const advantages = [
  {
    id: 'industry-experience',
    label: 'Industry Experience',
    description: 'I worked in this industry for 3+ years',
    weight: 'High Impact',
  },
  {
    id: 'technical-skills',
    label: 'Technical Skills',
    description: 'I have the technical skills to build the core product myself',
    weight: 'Medium Impact',
  },
  {
    id: 'customer-relationships',
    label: 'Customer Relationships',
    description: 'I have existing relationships with target customers',
    weight: 'Highest Impact',
  },
  {
    id: 'proprietary-insight',
    label: 'Proprietary Insight',
    description: 'I discovered unique insight/data about this market',
    weight: 'High Impact',
  },
  {
    id: 'relevant-failure',
    label: 'Relevant Failure',
    description: 'I previously tried to solve this and failed (learned lessons)',
    weight: 'Medium Impact',
  },
  {
    id: 'distribution-advantage',
    label: 'Distribution Advantage',
    description: 'I have an audience, network, or partnership advantages',
    weight: 'High Impact',
  },
];

export function UniqueAdvantageForm({
  selectedAdvantages,
  explanation,
  onAdvantagesChange,
  onExplanationChange,
}: UniqueAdvantageFormProps) {
  const wordCount = explanation.trim().split(/\s+/).filter(w => w.length > 0).length;
  const minWords = 75;
  const targetWords = 150;
  const isMinimumMet = wordCount >= minWords;

  const toggleAdvantage = (id: string) => {
    if (selectedAdvantages.includes(id)) {
      onAdvantagesChange(selectedAdvantages.filter(a => a !== id));
    } else {
      onAdvantagesChange([...selectedAdvantages, id]);
    }
  };

  const strongestAdvantage = selectedAdvantages.find(id =>
    id === 'customer-relationships' || id === 'proprietary-insight'
  );

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Your Unique Advantages
        </h3>
        <p className="text-gray-600 text-sm">
          Why are <strong>YOU</strong> specifically the right person to solve this problem?
          What do you know or have access to that others don't?
        </p>
      </div>

      {/* Selection Grid */}
      <div>
        <Label className="text-base font-medium mb-3 block">
          Check all that apply (be honest - this helps us match you with the right investors)
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {advantages.map((advantage) => (
            <div
              key={advantage.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedAdvantages.includes(advantage.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleAdvantage(advantage.id)}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={selectedAdvantages.includes(advantage.id)}
                  onCheckedChange={() => toggleAdvantage(advantage.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{advantage.label}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        advantage.weight === 'Highest Impact'
                          ? 'bg-green-100 text-green-700'
                          : advantage.weight === 'High Impact'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {advantage.weight}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{advantage.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      {selectedAdvantages.length > 0 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="advantage-explanation">
              {strongestAdvantage ? 'Explain your strongest advantage' : 'Pick your strongest advantage'} with a specific example
            </Label>
            <Textarea
              id="advantage-explanation"
              placeholder="Example: 'I was a senior engineer at Stripe for 4 years working on SMB payments. I personally onboarded 200+ merchants and kept hearing the same complaint about accounting reconciliation. I stayed in touch with 15 of them as early design partners, and 8 have already signed LOIs...'"
              value={explanation}
              onChange={(e) => onExplanationChange(e.target.value)}
              className="mt-1 min-h-[150px]"
              rows={8}
            />

            {/* Word count */}
            <div className="flex items-center justify-between mt-2">
              <span className={`text-sm ${
                wordCount >= targetWords ? 'text-green-600' :
                wordCount >= minWords ? 'text-yellow-600' :
                'text-gray-500'
              }`}>
                {wordCount} words
                {wordCount < minWords && ` • ${minWords - wordCount} more needed`}
                {wordCount >= targetWords && ' • Excellent!'}
              </span>
              {isMinimumMet && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>

          {/* Guidance */}
          {explanation.length > 30 && (
            <div className="space-y-2">
              {!explanation.match(/\d+/) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tip:</strong> Add specific numbers to strengthen your example
                    (e.g., "4 years at Company X" or "200+ customers")
                  </AlertDescription>
                </Alert>
              )}

              {selectedAdvantages.includes('customer-relationships') &&
               !/loi|signed|contract|agreement|paid/i.test(explanation) && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pro tip:</strong> If any customers have signed LOIs or committed,
                    mention that! It's extremely strong validation.
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
                "Technical skills to build + Customer relationships. I was a senior engineer
                at Stripe for 4 years working on their SMB payments infrastructure. I personally
                onboarded 200+ small business merchants and kept hearing the same complaint:
                'Accounting reconciliation is a nightmare.'"
              </p>
              <p className="italic">
                "I stayed in touch with 15 of them as early design partners, and 8 have already
                signed LOIs to switch to our product once it launches. Two are former colleagues
                who now run accounting firms and can refer us to 50+ clients each."
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
      )}

      {/* Why we ask */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> "Unfair advantages"
          are what separate successful startups from the 1,000 others trying to solve the
          same problem. First Round Capital found that founders with domain expertise reach
          product-market fit 2.1x faster.
        </p>
      </div>
    </div>
  );
}
