"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";

interface FinancialHealthFormProps {
  data: {
    revenueModel: string; // 'mrr' | 'arr' | 'one-time' | 'none'
    mrr: number;
    arr: number;
    monthlyBurn: number;
    runway: number; // Auto-calculated
    cogs: number;
    averageDealSize: number;
    projectedRevenue12mo: number;
    revenueAssumptions: string;
    previousMrr?: number; // For growth rate calculation
  };
  onChange: (field: string, value: unknown) => void;
}

export function FinancialHealthForm({ data, onChange }: FinancialHealthFormProps) {
  // Calculate gross margin
  const grossMargin = data.averageDealSize > 0 && data.cogs >= 0
    ? ((data.averageDealSize - data.cogs) / data.averageDealSize * 100).toFixed(1)
    : '0';

  // Calculate growth rate if previous MRR exists
  const growthRate = data.previousMrr && data.mrr > 0
    ? (((data.mrr - data.previousMrr) / data.previousMrr) * 100).toFixed(1)
    : null;

  const wordCount = data.revenueAssumptions.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Revenue Model */}
      <div className="space-y-3">
        <div>
          <Label className="text-base font-medium">
            Revenue Model *
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            What type of revenue does your business generate?
          </p>
        </div>

        <RadioGroup
          value={data.revenueModel || 'none'}
          onValueChange={(value) => onChange('revenueModel', value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mrr" id="model-mrr" />
            <Label htmlFor="model-mrr" className="font-normal cursor-pointer">
              Recurring (MRR/ARR) - Subscription business
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="one-time" id="model-onetime" />
            <Label htmlFor="model-onetime" className="font-normal cursor-pointer">
              One-time sales - Transaction business
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="model-none" />
            <Label htmlFor="model-none" className="font-normal cursor-pointer">
              Pre-revenue - No paying customers yet
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Revenue Metrics - Show if not pre-revenue */}
      {data.revenueModel !== 'none' && (
        <div className="space-y-4">
          {data.revenueModel === 'mrr' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mrr" className="text-base font-medium">
                    Monthly Recurring Revenue (MRR) *
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="mrr"
                      type="number"
                      min="0"
                      value={data.mrr || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        onChange('mrr', value);
                        onChange('arr', value * 12); // Auto-calculate ARR
                      }}
                      placeholder="5000"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arr" className="text-base font-medium">
                    Annual Recurring Revenue (ARR)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="arr"
                      type="number"
                      value={data.arr || data.mrr * 12 || ''}
                      disabled
                      className="pl-9 bg-gray-50"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Auto-calculated from MRR</p>
                </div>
              </div>

              {/* Optional: Previous MRR for growth calculation */}
              <div className="space-y-2">
                <Label htmlFor="previous-mrr" className="text-sm font-medium">
                  MRR 30 Days Ago (optional - for growth rate)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="previous-mrr"
                    type="number"
                    min="0"
                    value={data.previousMrr || ''}
                    onChange={(e) => onChange('previousMrr', parseFloat(e.target.value) || 0)}
                    placeholder="4000"
                    className="pl-9"
                  />
                </div>
                {growthRate && (
                  <div className="flex items-center space-x-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      {growthRate}% MoM growth
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {data.revenueModel === 'one-time' && (
            <div className="space-y-2">
              <Label htmlFor="monthly-revenue" className="text-base font-medium">
                Average Monthly Revenue *
              </Label>
              <p className="text-sm text-gray-600">
                Total revenue in last 30 days
              </p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="monthly-revenue"
                  type="number"
                  min="0"
                  value={data.mrr || ''}
                  onChange={(e) => onChange('mrr', parseFloat(e.target.value) || 0)}
                  placeholder="15000"
                  className="pl-9"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unit Economics */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">
            Unit Economics
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Understand your per-customer profitability
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="average-deal" className="text-sm font-medium">
              Average Deal Size ($) *
            </Label>
            <p className="text-xs text-gray-500">
              First payment or annual contract value
            </p>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="average-deal"
                type="number"
                min="0"
                value={data.averageDealSize || ''}
                onChange={(e) => onChange('averageDealSize', parseFloat(e.target.value) || 0)}
                placeholder="500"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cogs" className="text-sm font-medium">
              COGS per Sale ($) *
            </Label>
            <p className="text-xs text-gray-500">
              Direct costs to deliver (hosting, licenses, etc.)
            </p>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="cogs"
                type="number"
                min="0"
                value={data.cogs || ''}
                onChange={(e) => onChange('cogs', parseFloat(e.target.value) || 0)}
                placeholder="50"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Gross Margin Display */}
        {data.averageDealSize > 0 && (
          <Card className={`border-2 ${
            parseFloat(grossMargin) >= 70 ? 'bg-green-50 border-green-200' :
            parseFloat(grossMargin) >= 50 ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Gross Margin</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Aim for 70%+ for SaaS, 50%+ for marketplaces
                  </p>
                </div>
                <div className="text-3xl font-bold">
                  {grossMargin}%
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Runway & Burn */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">
            Cash Runway
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            How long can you operate before running out of money?
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthly-burn" className="text-sm font-medium">
            Monthly Burn Rate ($) *
          </Label>
          <p className="text-xs text-gray-500">
            Total expenses per month (payroll, tools, marketing, etc.)
          </p>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="monthly-burn"
              type="number"
              min="0"
              value={data.monthlyBurn || ''}
              onChange={(e) => onChange('monthlyBurn', parseFloat(e.target.value) || 0)}
              placeholder="10000"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="runway" className="text-sm font-medium">
            Runway (Months) *
          </Label>
          <p className="text-xs text-gray-500">
            How many months until you run out of cash?
          </p>
          <Input
            id="runway"
            type="number"
            min="0"
            value={data.runway || ''}
            onChange={(e) => onChange('runway', parseInt(e.target.value) || 0)}
            placeholder="12"
          />
        </div>

        {/* Runway Alert */}
        {data.runway > 0 && data.runway < 6 && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Critical Runway</p>
                  <p className="text-xs text-red-700 mt-1">
                    With {data.runway} months runway, you should be actively fundraising or reducing burn.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 12-Month Projections */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">
            12-Month Revenue Projection
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Based on your current trajectory, where do you expect to be?
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="projected-revenue" className="text-sm font-medium">
            Projected Revenue (12 months from now) *
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="projected-revenue"
              type="number"
              min="0"
              value={data.projectedRevenue12mo || ''}
              onChange={(e) => onChange('projectedRevenue12mo', parseFloat(e.target.value) || 0)}
              placeholder="100000"
              className="pl-9"
            />
          </div>
          {data.arr > 0 && data.projectedRevenue12mo > 0 && (
            <p className="text-xs text-gray-600">
              That&apos;s {(((data.projectedRevenue12mo - data.arr) / data.arr) * 100).toFixed(0)}% growth from current ARR
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assumptions" className="text-sm font-medium">
            Key Assumptions Behind Your Projection *
          </Label>
          <p className="text-xs text-gray-500">
            What needs to be true for you to hit this number? Be specific about conversion rates, sales velocity, retention, etc.
          </p>
          <Textarea
            id="assumptions"
            value={data.revenueAssumptions}
            onChange={(e) => onChange('revenueAssumptions', e.target.value)}
            placeholder="Example: We assume 20 inbound leads/month (vs 12 today) at 15% conversion (vs 10% today). Churn stays at 3%/mo. We'll launch 2 new features increasing ACV from $500 to $750. No paid acquisition needed until month 6."
            className="min-h-[120px]"
          />
          <div className="flex justify-between items-center text-sm">
            <span className={wordCount >= 50 ? 'text-green-600' : 'text-gray-500'}>
              {wordCount} words {wordCount >= 50 ? '✓' : '(aim for 50+)'}
            </span>
          </div>
        </div>
      </div>

      {/* Tip Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Pro Tip:</strong> Investors care about unit economics (gross margin 70%+), sustainable burn (18+ months runway), and realistic projections (2-5x growth, not 10-100x). Show you understand the numbers!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
