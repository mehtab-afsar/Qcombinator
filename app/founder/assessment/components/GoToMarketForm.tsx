"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";

interface GoToMarketFormProps {
  data: {
    icpDescription: string;
    channelsTried: string[];
    channelResults: {
      [key: string]: { spend: number; conversions: number; cac: number };
    };
    currentCAC: number;
    targetCAC: number;
    messagingTested: boolean;
    messagingResults: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const CHANNELS = [
  { id: 'content', label: 'Content Marketing (SEO, Blog, Social)' },
  { id: 'paid-ads', label: 'Paid Ads (Google, Meta, LinkedIn)' },
  { id: 'direct-sales', label: 'Direct Sales / Outbound' },
  { id: 'partnerships', label: 'Partnerships / Referrals' },
  { id: 'product-led', label: 'Product-Led Growth (PLG)' },
  { id: 'community', label: 'Community Building' },
];

export function GoToMarketForm({ data, onChange }: GoToMarketFormProps) {
  const handleChannelToggle = (channelId: string, checked: boolean) => {
    const newChannels = checked
      ? [...data.channelsTried, channelId]
      : data.channelsTried.filter(c => c !== channelId);
    onChange('channelsTried', newChannels);
  };

  const handleChannelResult = (channelId: string, field: string, value: number) => {
    onChange('channelResults', {
      ...data.channelResults,
      [channelId]: {
        ...(data.channelResults[channelId] || { spend: 0, conversions: 0, cac: 0 }),
        [field]: value,
      },
    });
  };

  const wordCount = data.icpDescription.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* ICP Definition */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="icp" className="text-base font-medium">
            Define Your Ideal Customer Profile (ICP) *
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Who exactly are you selling to? Be specific: industry, company size, role/title, pain points, budget, buying behavior.
          </p>
        </div>

        <Textarea
          id="icp"
          value={data.icpDescription}
          onChange={(e) => onChange('icpDescription', e.target.value)}
          placeholder="Example: We sell to Series A-B SaaS companies (50-200 employees) with a product team of 5+ engineers. Our buyer is the VP of Product or Head of Engineering who is frustrated with slow user research cycles and has $50K+ annual budget for product tools. They typically evaluate tools quarterly and value speed over customization."
          className="min-h-[150px]"
        />

        <div className="flex justify-between items-center text-sm">
          <span className={wordCount >= 50 ? 'text-green-600' : 'text-gray-500'}>
            {wordCount} / 200 words {wordCount >= 50 ? '✓' : '(aim for 50+)'}
          </span>
        </div>
      </div>

      {/* Acquisition Channels */}
      <div className="space-y-3">
        <div>
          <Label className="text-base font-medium">
            Acquisition Channels Tested *
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Which channels have you tried to acquire customers? Select all that apply.
          </p>
        </div>

        <div className="space-y-3">
          {CHANNELS.map(channel => (
            <div key={channel.id} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={channel.id}
                  checked={data.channelsTried.includes(channel.id)}
                  onCheckedChange={(checked) => handleChannelToggle(channel.id, !!checked)}
                />
                <label
                  htmlFor={channel.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {channel.label}
                </label>
              </div>

              {/* Channel results - show only if checked */}
              {data.channelsTried.includes(channel.id) && (
                <Card className="ml-6 bg-gray-50">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`${channel.id}-spend`} className="text-xs">
                          Total Spend ($)
                        </Label>
                        <Input
                          id={`${channel.id}-spend`}
                          type="number"
                          min="0"
                          value={data.channelResults[channel.id]?.spend || 0}
                          onChange={(e) => handleChannelResult(channel.id, 'spend', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${channel.id}-conversions`} className="text-xs">
                          Conversions
                        </Label>
                        <Input
                          id={`${channel.id}-conversions`}
                          type="number"
                          min="0"
                          value={data.channelResults[channel.id]?.conversions || 0}
                          onChange={(e) => handleChannelResult(channel.id, 'conversions', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${channel.id}-cac`} className="text-xs">
                          CAC ($)
                        </Label>
                        <Input
                          id={`${channel.id}-cac`}
                          type="number"
                          min="0"
                          value={
                            data.channelResults[channel.id]?.conversions > 0
                              ? Math.round((data.channelResults[channel.id]?.spend || 0) / data.channelResults[channel.id].conversions)
                              : 0
                          }
                          disabled
                          className="mt-1 bg-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CAC Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="current-cac" className="text-base font-medium">
            Current Blended CAC ($) *
          </Label>
          <p className="text-sm text-gray-600">
            Average cost to acquire one customer across all channels
          </p>
          <Input
            id="current-cac"
            type="number"
            min="0"
            value={data.currentCAC || ''}
            onChange={(e) => onChange('currentCAC', parseFloat(e.target.value) || 0)}
            placeholder="e.g., 250"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-cac" className="text-base font-medium">
            Target CAC ($) *
          </Label>
          <p className="text-sm text-gray-600">
            What CAC would make your unit economics work?
          </p>
          <Input
            id="target-cac"
            type="number"
            min="0"
            value={data.targetCAC || ''}
            onChange={(e) => onChange('targetCAC', parseFloat(e.target.value) || 0)}
            placeholder="e.g., 150"
          />
        </div>
      </div>

      {/* Messaging Tests */}
      <div className="space-y-3">
        <div>
          <Label className="text-base font-medium">
            Messaging Validation *
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Have you tested different value propositions or messaging with customers?
          </p>
        </div>

        <RadioGroup
          value={data.messagingTested ? 'yes' : 'no'}
          onValueChange={(value) => onChange('messagingTested', value === 'yes')}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="messaging-yes" />
            <Label htmlFor="messaging-yes" className="font-normal cursor-pointer">
              Yes, we&apos;ve tested multiple messages
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="messaging-no" />
            <Label htmlFor="messaging-no" className="font-normal cursor-pointer">
              No, still using our first message
            </Label>
          </div>
        </RadioGroup>

        {data.messagingTested && (
          <div className="mt-3">
            <Label htmlFor="messaging-results" className="text-sm font-medium">
              What did you learn from messaging tests?
            </Label>
            <Textarea
              id="messaging-results"
              value={data.messagingResults}
              onChange={(e) => onChange('messagingResults', e.target.value)}
              placeholder="Example: We tested 3 headlines in our ads. 'Save 10 hours/week' had 2x higher CTR than 'Automate your research' or 'Better insights faster'. Customers care more about time savings than quality improvements."
              className="min-h-[100px] mt-2"
            />
          </div>
        )}
      </div>

      {/* Tip Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Pro Tip:</strong> Strong GTM scores come from testing multiple channels systematically and having clear data on what works. If you haven&apos;t tested 2-3 channels yet, that&apos;s your next step!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
