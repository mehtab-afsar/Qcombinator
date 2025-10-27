"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Mountain, CheckCircle, Flame } from "lucide-react";
import { FeatureFlags } from "@/lib/feature-flags";
import { ResilienceContainer } from "@/src/components/features/assessment/resilience/ResilienceContainer";

interface ResilienceFormProps {
  data: {
    hardestMoment: string;
    quitScale: number;
    whatKeptGoing: string;
  };
  onChange: (field: string, value: any) => void;
}

export function ResilienceForm({ data, onChange }: ResilienceFormProps) {
  // Feature flag: Use new clean architecture components
  if (FeatureFlags.USE_NEW_RESILIENCE) {
    return <ResilienceContainer />;
  }

  // Legacy implementation below
  const storyWords = data.hardestMoment.trim().split(/\s+/).filter(w => w.length > 0).length;
  const reasonWords = data.whatKeptGoing.trim().split(/\s+/).filter(w => w.length > 0).length;

  const hasAdversity = /failed|rejected|lost|quit|fired|broke|ran out|couldn't|crisis|disaster|wrong|mistake|terrible/i.test(data.hardestMoment);

  const getQuitScaleDescription = () => {
    if (data.quitScale <= 2) return { text: 'Never really considered it', emoji: '😊', color: 'text-blue-600' };
    if (data.quitScale <= 4) return { text: 'Thought about it briefly', emoji: '🤔', color: 'text-yellow-600' };
    if (data.quitScale <= 6) return { text: 'Seriously considered it', emoji: '😰', color: 'text-orange-600' };
    if (data.quitScale <= 8) return { text: 'Very close to quitting', emoji: '😫', color: 'text-red-600' };
    return { text: 'Almost gave up entirely', emoji: '💀', color: 'text-red-700' };
  };

  const quitDescription = getQuitScaleDescription();

  const hasIntrinsicMotivation = /believe|mission|customers need|problem matters|committed|won't give up|have to solve|passion|care about|important|make a difference/i.test(data.whatKeptGoing);

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
          <Mountain className="h-6 w-6 mr-2 text-gray-700" />
          Your Hardest Moment
        </h3>
        <p className="text-gray-600 text-sm">
          Every founder faces moments when quitting seems easier than continuing.
          Tell us about yours.
        </p>
      </div>

      {/* Supportive Message */}
      <Alert className="bg-purple-50 border-purple-200">
        <Heart className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          <strong>You're not alone.</strong> Every successful founder has an "almost quit" story.
          What matters is what kept you going.
        </AlertDescription>
      </Alert>

      {/* Example */}
      <details className="bg-green-50 border border-green-200 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-green-900 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          See an example
        </summary>
        <div className="mt-3 text-sm text-green-800 space-y-2">
          <p><strong>Hardest moment:</strong> <em>After 8 months of building, our first 5 beta customers churned within 2 weeks. One literally said "this is unusable." I had quit my $200K job at Google, burned through $50K in savings, and my co-founder was questioning if we should shut down. I spent 3 days questioning everything.</em></p>
          <p><strong>How close to quitting:</strong> <em>8/10 - Very close. Had the "we're shutting down" email drafted.</em></p>
          <p><strong>What kept me going:</strong> <em>I called all 5 churned customers for exit interviews. Each said the same thing: "The problem is massive, we just needed X feature." I realized we'd built for what WE thought they needed, not what they actually needed. The problem was real, our solution was wrong. That's fixable. We rebuilt in 3 weeks with those insights, and 3 of those 5 came back.</em></p>
        </div>
      </details>

      {/* Hardest Moment Story */}
      <div>
        <Label htmlFor="hardest-moment">
          What's been the hardest moment in your startup journey so far? *
        </Label>
        <p className="text-xs text-gray-600 mt-1 mb-2">
          Be honest and specific. When? What happened? How did you feel?
        </p>
        <Textarea
          id="hardest-moment"
          placeholder="After [time period], [what happened]... I felt..."
          value={data.hardestMoment}
          onChange={(e) => onChange('hardestMoment', e.target.value)}
          className="mt-1 min-h-[150px]"
          rows={8}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-sm ${storyWords >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
            {storyWords} words {storyWords < 50 && `• ${50 - storyWords} more needed`}
          </span>
          {hasAdversity && (
            <div className="flex items-center space-x-2 text-blue-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Real adversity - exactly what we're looking for</span>
            </div>
          )}
        </div>
      </div>

      {!hasAdversity && data.hardestMoment.length > 50 && (
        <Alert>
          <AlertDescription>
            <strong>Tip:</strong> Include words that show real difficulty ("failed", "rejected",
            "ran out of money", "crisis", etc.). We want to understand the true challenges you faced.
          </AlertDescription>
        </Alert>
      )}

      {/* Quit Scale */}
      <div>
        <Label htmlFor="quit-scale">
          On a scale of 1-10, how close did you come to quitting? *
        </Label>
        <p className="text-xs text-gray-600 mt-1 mb-3">
          1 = Never considered it, 10 = Had one foot out the door
        </p>
        <div className="space-y-3">
          <input
            type="range"
            id="quit-scale"
            min="1"
            max="10"
            value={data.quitScale}
            onChange={(e) => onChange('quitScale', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`text-4xl font-bold ${quitDescription.color}`}>
                {data.quitScale}
              </span>
              <div>
                <p className={`text-lg font-medium ${quitDescription.color}`}>
                  {quitDescription.emoji} {quitDescription.text}
                </p>
                {data.quitScale >= 7 && (
                  <p className="text-xs text-green-600 mt-1">
                    <Flame className="h-3 w-3 inline mr-1" />
                    Facing near-quit moments and pushing through = true determination
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-700">
            <strong>Note:</strong> 7-9 scores highly. It shows you faced real adversity but
            persevered. A score of 1-2 might mean you haven't been tested yet.
          </p>
        </div>
      </div>

      {/* What Kept You Going */}
      <div>
        <Label htmlFor="what-kept-going">
          What kept you going? Why didn't you quit? *
        </Label>
        <p className="text-xs text-gray-600 mt-1 mb-2">
          Be specific about your motivation. What made you push through?
        </p>
        <Textarea
          id="what-kept-going"
          placeholder="I kept going because... / I realized that... / The customers told me..."
          value={data.whatKeptGoing}
          onChange={(e) => onChange('whatKeptGoing', e.target.value)}
          className="mt-1 min-h-[120px]"
          rows={6}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-sm ${reasonWords >= 30 ? 'text-green-600' : 'text-gray-500'}`}>
            {reasonWords} words {reasonWords < 30 && `• ${30 - reasonWords} more needed`}
          </span>
          {hasIntrinsicMotivation && (
            <div className="flex items-center space-x-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Strong intrinsic motivation detected</span>
            </div>
          )}
        </div>
      </div>

      {!hasIntrinsicMotivation && data.whatKeptGoing.length > 30 && (
        <Alert>
          <AlertDescription>
            <strong>Tip:</strong> Connect to your deeper "why" - belief in the mission,
            commitment to customers, or the importance of the problem. Intrinsic motivation
            outlasts external rewards.
          </AlertDescription>
        </Alert>
      )}

      {/* Motivation Type Indicator */}
      {data.whatKeptGoing.length > 50 && (
        <div className={`rounded-lg p-4 border-2 ${
          hasIntrinsicMotivation
            ? 'bg-green-50 border-green-300'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-start space-x-3">
            {hasIntrinsicMotivation ? (
              <>
                <Heart className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Intrinsic Motivation Detected</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your motivation comes from within - belief in the mission, commitment to
                    solving the problem. This is the kind of drive that gets through the hardest times.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertDescription className="text-yellow-800">
                  <strong>Consider your deeper "why":</strong> What would make you keep going even
                  if the business struggled? Connection to the problem, belief in the mission, or
                  commitment to your customers?
                </AlertDescription>
              </>
            )}
          </div>
        </div>
      )}

      {/* Why we ask */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> Startups are brutal.
          The average founder faces rejection hundreds of times. What separates successful
          founders from failed ones isn't avoiding adversity - it's the determination to push
          through it. Investors want to know you won't quit when things get hard (and they will).
        </p>
      </div>
    </div>
  );
}
