"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, AlertTriangle, CheckCircle, Calculator } from "lucide-react";

interface MarketCalculatorProps {
  data: {
    targetCustomers: number;
    talkToCount: number;
    conversionRate: number;
    avgContractValue: number;
    customerLifetimeMonths: number;
    validationChecks: string[];
  };
  onChange: (field: string, value: number | string[]) => void;
}

export function MarketCalculator({ data, onChange }: MarketCalculatorProps) {
  const [calculations, setCalculations] = useState({
    projectedRevenue: 0,
    customerCount: 0,
    revenuePerConversation: 0,
    dailyConversations: 0,
    ltv: 0,
    ltvCacRatio: 0,
  });

  const [warnings, setWarnings] = useState<string[]>([]);

  // Recalculate whenever data changes
  useEffect(() => {
    const customerCount = data.talkToCount * (data.conversionRate / 100);
    const projectedRevenue = customerCount * data.avgContractValue;
    const revenuePerConversation = data.talkToCount > 0 ? projectedRevenue / data.talkToCount : 0;
    const dailyConversations = data.talkToCount / (18 * 20); // 18 months, 20 work days

    const assumedCAC = 500;
    const ltv = data.avgContractValue * data.customerLifetimeMonths;
    const ltvCacRatio = ltv / assumedCAC;

    setCalculations({
      projectedRevenue,
      customerCount,
      revenuePerConversation,
      dailyConversations,
      ltv,
      ltvCacRatio,
    });

    // Generate warnings
    const newWarnings: string[] = [];
    if (dailyConversations > 5) {
      newWarnings.push(`${dailyConversations.toFixed(1)} conversations/day is very ambitious. Have a plan to reach that many prospects?`);
    }
    if (data.conversionRate > 15) {
      newWarnings.push(`${data.conversionRate}% conversion rate is unusually high for cold outreach (typical: 2-8%)`);
    }
    if (ltvCacRatio < 3) {
      newWarnings.push('LTV:CAC ratio below 3:1 suggests challenging unit economics');
    }
    if (projectedRevenue < 100000 && data.talkToCount > 0) {
      newWarnings.push('Revenue under $100K in 18 months may be too small to attract institutional investors');
    }
    if (data.talkToCount < 50 && data.talkToCount > 0) {
      newWarnings.push('Talking to 50+ prospects shows commitment and thoroughness');
    }

    setWarnings(newWarnings);
  }, [data]);

  const validationOptions = [
    { id: 'reach-plan', label: 'I have a plan to reach this many prospects' },
    { id: 'conversion-validated', label: 'My conversion rate is based on actual early conversations' },
    { id: 'pricing-validated', label: 'My pricing is validated with at least 3 customers' },
  ];

  const toggleCheck = (id: string) => {
    if (data.validationChecks.includes(id)) {
      onChange('validationChecks', data.validationChecks.filter(c => c !== id));
    } else {
      onChange('validationChecks', [...data.validationChecks, id]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Bottom-Up Market Sizing
        </h3>
        <p className="text-gray-600 text-sm">
          Let&apos;s calculate your realistic 18-month revenue target. Use <strong>conservative numbers</strong>
          — investors prefer honesty over optimism.
        </p>
      </div>

      {/* Step 1: Target Customer Definition */}
      <div className="bg-white border-2 border-blue-500 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
          Define Your Target Customer
        </h4>
        <div className="space-y-3">
          <div>
            <Label htmlFor="target-customers">
              How many potential customers exist in your initial market? *
            </Label>
            <Input
              id="target-customers"
              type="number"
              min="0"
              placeholder="e.g., 10000"
              value={data.targetCustomers || ''}
              onChange={(e) => onChange('targetCustomers', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
            <p className="text-xs text-gray-600 mt-1">
              Be specific: &quot;500-person tech companies in the US&quot; not &quot;all SMBs&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Step 2: Conversion Assumptions */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
          Conversion Assumptions
        </h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="talk-to-count">
              How many will you TALK TO in 18 months? *
            </Label>
            <Input
              id="talk-to-count"
              type="number"
              min="0"
              placeholder="e.g., 200"
              value={data.talkToCount || ''}
              onChange={(e) => onChange('talkToCount', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
            {calculations.dailyConversations > 0 && (
              <p className={`text-xs mt-1 ${
                calculations.dailyConversations <= 3 ? 'text-green-600' :
                calculations.dailyConversations <= 5 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                That&apos;s {calculations.dailyConversations.toFixed(1)} conversations per work day
                {calculations.dailyConversations > 5 && ' - is this realistic?'}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="conversion-rate">
              What % will convert to customers?
            </Label>
            <div className="space-y-2 mt-2">
              <input
                type="range"
                id="conversion-rate"
                min="1"
                max="30"
                value={data.conversionRate}
                onChange={(e) => onChange('conversionRate', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between items-center">
                <span className={`text-2xl font-bold ${
                  data.conversionRate >= 2 && data.conversionRate <= 8 ? 'text-green-600' :
                  data.conversionRate < 2 ? 'text-blue-600' :
                  data.conversionRate <= 15 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {data.conversionRate}%
                </span>
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  Industry avg for B2B: 2-5%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Revenue Per Customer */}
      <div className="bg-white border-2 border-green-500 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">3</span>
          Revenue Per Customer
        </h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="contract-value">
              Average contract value *
            </Label>
            <div className="flex items-center mt-1">
              <DollarSign className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
              <Input
                id="contract-value"
                type="number"
                min="0"
                placeholder="e.g., 10000"
                value={data.avgContractValue || ''}
                onChange={(e) => onChange('avgContractValue', parseInt(e.target.value) || 0)}
                className="pl-10"
              />
              <span className="ml-2 text-gray-600">per year</span>
            </div>
          </div>

          <div>
            <Label htmlFor="lifetime-months">
              Expected customer lifetime
            </Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                id="lifetime-months"
                type="number"
                min="1"
                max="120"
                value={data.customerLifetimeMonths}
                onChange={(e) => onChange('customerLifetimeMonths', parseInt(e.target.value) || 12)}
                className="w-24"
              />
              <span className="text-gray-600">months</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              How long will the average customer stay? (Default: 12 months)
            </p>
          </div>
        </div>
      </div>

      {/* Calculated Results */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calculator className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">Your 18-Month Projections</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">18-Month Revenue</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(calculations.projectedRevenue)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Expected Customers</p>
            <p className="text-2xl font-bold text-purple-600">
              {calculations.customerCount.toFixed(0)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Revenue per Conversation</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(calculations.revenuePerConversation)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">LTV:CAC Ratio</p>
            <p className={`text-2xl font-bold ${
              calculations.ltvCacRatio >= 3 ? 'text-green-600' :
              calculations.ltvCacRatio >= 2 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {calculations.ltvCacRatio.toFixed(1)}:1
            </p>
            <p className="text-xs text-gray-600 mt-1">
              (Assuming ${500} CAC)
            </p>
          </div>
        </div>

        {calculations.projectedRevenue >= 500000 && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-sm text-green-800 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              <strong>Strong revenue target!</strong> ${(calculations.projectedRevenue / 1000000).toFixed(1)}M+ will attract investor interest
            </p>
          </div>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, idx) => (
            <Alert key={idx} className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {warning}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Validation Checks */}
      <div>
        <Label className="text-base font-medium mb-3 block">
          Validate Your Assumptions
        </Label>
        <div className="space-y-3">
          {validationOptions.map((option) => (
            <div
              key={option.id}
              className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                data.validationChecks.includes(option.id)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleCheck(option.id)}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={data.validationChecks.includes(option.id)}
                  onCheckedChange={() => toggleCheck(option.id)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-900">{option.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why we ask */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Why we ask this:</strong> Inflated market sizing
          is the #1 red flag for investors. Bottom-up calculations (your actual capacity to
          reach customers) are much more credible than top-down TAM claims. This shows you&apos;ve
          thought through the execution realistically.
        </p>
      </div>
    </div>
  );
}
