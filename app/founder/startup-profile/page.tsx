"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Upload,
  Link,
  Calendar,
  Globe,
  CheckCircle,
  AlertCircle,
  Zap,
  Brain
} from "lucide-react";

interface StartupData {
  // Basics
  companyName: string;
  website: string;
  incorporation: string;
  foundedDate: string;
  industry: string;
  subIndustry: string;
  oneLiner: string;
  stage: string;

  // Problem & Solution
  problemStatement: string;
  whyNow: string;
  solution: string;
  uniquePosition: string;
  moat: string;

  // Market & Competition
  tamSize: string;
  customerPersona: string;
  businessModel: string;
  competitors: string[];
  differentiation: string;
  marketGrowth: string;

  // Traction & Metrics
  tractionType: string;
  mrr: string;
  arr: string;
  growthRate: string;
  customerCount: string;
  churnRate: string;
  cac: string;
  ltv: string;
  userInterviews: string;
  lois: string;
  pilots: string;
  waitlist: string;

  // Team
  coFounders: Array<{ name: string; role: string; linkedin?: string; equity: number }>;
  advisors: string[];
  teamSize: string;
  keyHires: string[];
  equitySplit: string;

  // Fundraising
  raisingAmount: string;
  useOfFunds: string;
  previousFunding: string;
  runwayRemaining: string;
  targetCloseDate: string;
}

export default function StartupProfile() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<StartupData>({
    companyName: '',
    website: '',
    incorporation: '',
    foundedDate: '',
    industry: '',
    subIndustry: '',
    oneLiner: '',
    stage: '',
    problemStatement: '',
    whyNow: '',
    solution: '',
    uniquePosition: '',
    moat: '',
    tamSize: '',
    customerPersona: '',
    businessModel: '',
    competitors: [],
    differentiation: '',
    marketGrowth: '',
    tractionType: '',
    mrr: '',
    arr: '',
    growthRate: '',
    customerCount: '',
    churnRate: '',
    cac: '',
    ltv: '',
    userInterviews: '',
    lois: '',
    pilots: '',
    waitlist: '',
    coFounders: [],
    advisors: [],
    teamSize: '',
    keyHires: [],
    equitySplit: '',
    raisingAmount: '',
    useOfFunds: '',
    previousFunding: '',
    runwayRemaining: '',
    targetCloseDate: ''
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('startupProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed);
      } catch (e) {
        console.error('Failed to load saved startup profile:', e);
      }
    }
  }, []);

  // Save to localStorage on data change
  useEffect(() => {
    localStorage.setItem('startupProfile', JSON.stringify(data));
  }, [data]);

  const steps = [
    { id: 'basics', title: 'Company Basics', time: 3, icon: Building2 },
    { id: 'problem-solution', title: 'Problem & Solution', time: 5, icon: Target },
    { id: 'market', title: 'Market & Competition', time: 3, icon: TrendingUp },
    { id: 'traction', title: 'Traction & Metrics', time: 2, icon: Zap },
    { id: 'team', title: 'Team', time: 2, icon: Users },
    { id: 'fundraising', title: 'Fundraising', time: 1, icon: DollarSign }
  ];

  const industries = [
    'AI/ML', 'SaaS', 'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'Marketplace',
    'DevTools', 'Cybersecurity', 'Climate Tech', 'Food Tech', 'PropTech', 'Gaming',
    'Consumer Apps', 'Enterprise Software', 'Hardware', 'Biotech', 'Other'
  ];

  const incorporationTypes = [
    { value: 'delaware-corp', label: 'Delaware C-Corporation', recommended: true },
    { value: 'llc', label: 'LLC' },
    { value: 'other-corp', label: 'Other Corporation' },
    { value: 'not-incorporated', label: 'Not Yet Incorporated' }
  ];

  const stages = [
    { value: 'pre-product', label: 'Pre-Product', desc: 'Idea validation stage' },
    { value: 'mvp', label: 'MVP', desc: 'Minimum viable product built' },
    { value: 'beta', label: 'Beta', desc: 'Testing with early users' },
    { value: 'launched', label: 'Launched', desc: 'Product is live' },
    { value: 'growing', label: 'Growing', desc: 'Scaling and expanding' }
  ];

  const businessModels = [
    'B2B SaaS', 'B2C Subscription', 'Marketplace', 'E-commerce', 'Advertising',
    'Transaction Fees', 'Freemium', 'Enterprise Licensing', 'Usage-based', 'Other'
  ];

  const useOfFundsOptions = [
    'Product Development', 'Sales & Marketing', 'Team Expansion', 'Operations',
    'Technology Infrastructure', 'Market Expansion', 'Inventory', 'Working Capital'
  ];

  const getCurrentStepInfo = () => steps[currentStep];
  const getProgressPercentage = () => ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete startup profile
      window.location.href = '/founder/ai-enhancement';
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (field: keyof StartupData, value: string | number | string[]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: keyof StartupData, value: string) => {
    setData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value]
    }));
  };

  const removeFromArray = (field: keyof StartupData, index: number) => {
    setData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  // Set to true to disable validation during development
  const DEV_MODE = true;

  const canContinue = () => {
    if (DEV_MODE) return true; // Skip validation in dev mode

    switch (currentStep) {
      case 0:
        return data.companyName && data.industry && data.oneLiner && data.stage;
      case 1:
        return data.problemStatement && data.solution;
      case 2:
        return data.tamSize && data.customerPersona && data.businessModel;
      case 3:
        return data.tractionType;
      case 4:
        return data.teamSize;
      case 5:
        return data.raisingAmount && data.useOfFunds;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Startup Deep Dive</div>
                <div className="text-xs text-gray-600">{getCurrentStepInfo().title}</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className="w-32">
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>
              <div className="text-sm font-medium text-blue-600">
                ~{getCurrentStepInfo().time} min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="w-full max-w-4xl">

          {/* Step 1: Company Basics */}
          {currentStep === 0 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <span>Company Basics</span>
                </CardTitle>
                <p className="text-gray-600">Tell us about your startup fundamentals</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="companyName">Company name *</Label>
                      <Input
                        id="companyName"
                        placeholder="Acme Inc."
                        value={data.companyName}
                        onChange={(e) => updateData('companyName', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <div className="flex items-center mt-1">
                        <Globe className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
                        <Input
                          id="website"
                          placeholder="https://acme.com"
                          value={data.website}
                          onChange={(e) => updateData('website', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="foundedDate">Founded date</Label>
                      <div className="flex items-center mt-1">
                        <Calendar className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
                        <Input
                          id="foundedDate"
                          type="month"
                          value={data.foundedDate}
                          onChange={(e) => updateData('foundedDate', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Incorporation status</Label>
                      <div className="space-y-2 mt-2">
                        {incorporationTypes.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => updateData('incorporation', type.value)}
                            className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                              data.incorporation === type.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{type.label}</span>
                              {type.recommended && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                  Recommended
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Industry *</Label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
                    {industries.map((industry) => (
                      <button
                        key={industry}
                        onClick={() => updateData('industry', industry)}
                        className={`p-3 border-2 rounded-lg text-sm transition-all ${
                          data.industry === industry
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="oneLiner">One-line description *</Label>
                  <Input
                    id="oneLiner"
                    placeholder="We help SMBs automate their accounting with AI-powered bookkeeping"
                    value={data.oneLiner}
                    onChange={(e) => updateData('oneLiner', e.target.value)}
                    className="mt-1"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {data.oneLiner.length}/100 characters
                  </p>
                </div>

                <div>
                  <Label>Current stage *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                    {stages.map((stage) => (
                      <button
                        key={stage.value}
                        onClick={() => updateData('stage', stage.value)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          data.stage === stage.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{stage.label}</div>
                        <div className="text-sm text-gray-600">{stage.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Problem & Solution */}
          {currentStep === 1 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                  <Target className="h-6 w-6 text-orange-600" />
                  <span>Problem & Solution</span>
                </CardTitle>
                <p className="text-gray-600">The core of your startup&apos;s value proposition</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div>
                  <Label htmlFor="problemStatement">What problem are you solving? *</Label>
                  <Textarea
                    id="problemStatement"
                    placeholder="Describe the specific problem your target customers face. Be concrete and quantify if possible..."
                    value={data.problemStatement}
                    onChange={(e) => updateData('problemStatement', e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">Be specific and customer-focused</p>
                    <p className="text-xs text-gray-500">{data.problemStatement.length} characters</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="whyNow">Why is this problem important NOW?</Label>
                  <Textarea
                    id="whyNow"
                    placeholder="What recent trends, technologies, or market changes make this the right time to solve this problem?"
                    value={data.whyNow}
                    onChange={(e) => updateData('whyNow', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="solution">Your solution *</Label>
                  <Textarea
                    id="solution"
                    placeholder="Describe how your product/service solves this problem. What makes your approach unique?"
                    value={data.solution}
                    onChange={(e) => updateData('solution', e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                  <div className="flex items-center mt-2">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload pitch deck
                    </Button>
                    <p className="text-xs text-gray-500 ml-3">Optional: Upload your existing pitch deck</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="uniquePosition">Why are you uniquely positioned to solve this?</Label>
                  <Textarea
                    id="uniquePosition"
                    placeholder="Your background, team expertise, insights, or resources that give you an advantage..."
                    value={data.uniquePosition}
                    onChange={(e) => updateData('uniquePosition', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="moat">Secret sauce / competitive moat</Label>
                  <Textarea
                    id="moat"
                    placeholder="What prevents competitors from easily copying you? (technology, network effects, data, brand, etc.)"
                    value={data.moat}
                    onChange={(e) => updateData('moat', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">AI Writing Assistant</h4>
                      <p className="text-sm text-blue-700">
                        Need help articulating your value proposition? Our AI can help you refine your messaging based on successful startups.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 border-blue-300 text-blue-700">
                        Get AI Suggestions
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Market & Competition */}
          {currentStep === 2 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <span>Market & Competition</span>
                </CardTitle>
                <p className="text-gray-600">Size the opportunity and competitive landscape</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="tamSize">Target market size (TAM) *</Label>
                    <div className="flex items-center mt-1">
                      <DollarSign className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
                      <Input
                        id="tamSize"
                        placeholder="e.g., $50B annually"
                        value={data.tamSize}
                        onChange={(e) => updateData('tamSize', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Total Addressable Market</p>
                  </div>

                  <div>
                    <Label htmlFor="marketGrowth">Market growth rate</Label>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
                      <Input
                        id="marketGrowth"
                        placeholder="e.g., 25% YoY"
                        value={data.marketGrowth}
                        onChange={(e) => updateData('marketGrowth', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Customer persona *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                    <button
                      onClick={() => updateData('customerPersona', 'B2B')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        data.customerPersona === 'B2B'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">B2B</div>
                      <div className="text-sm text-gray-600">Business customers</div>
                    </button>
                    <button
                      onClick={() => updateData('customerPersona', 'B2C')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        data.customerPersona === 'B2C'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">B2C</div>
                      <div className="text-sm text-gray-600">Individual consumers</div>
                    </button>
                    <button
                      onClick={() => updateData('customerPersona', 'B2B2C')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        data.customerPersona === 'B2B2C'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">B2B2C</div>
                      <div className="text-sm text-gray-600">Both business & consumer</div>
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Business model *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                    {businessModels.map((model) => (
                      <button
                        key={model}
                        onClick={() => updateData('businessModel', model)}
                        className={`p-3 border-2 rounded-lg text-sm transition-all ${
                          data.businessModel === model
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="competitors">Direct competitors (AI will suggest others)</Label>
                  <div className="space-y-3 mt-2">
                    <Input
                      placeholder="Type competitor name and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value && !data.competitors.includes(value)) {
                            addToArray('competitors', value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {data.competitors.map((competitor, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                        >
                          {competitor}
                          <button
                            onClick={() => removeFromArray('competitors', index)}
                            className="ml-2 text-gray-500 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="differentiation">How are you different from competitors?</Label>
                  <Textarea
                    id="differentiation"
                    placeholder="What makes your approach unique compared to existing solutions?"
                    value={data.differentiation}
                    onChange={(e) => updateData('differentiation', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Traction & Metrics */}
          {currentStep === 3 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                  <Zap className="h-6 w-6 text-purple-600" />
                  <span>Traction & Metrics</span>
                </CardTitle>
                <p className="text-gray-600">Show us your progress and validation</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div>
                  <Label>What&apos;s your current traction status? *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <button
                      onClick={() => updateData('tractionType', 'pre-revenue')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        data.tractionType === 'pre-revenue'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">Pre-Revenue</div>
                      <div className="text-sm text-gray-600">Validating with users, no revenue yet</div>
                    </button>
                    <button
                      onClick={() => updateData('tractionType', 'revenue')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        data.tractionType === 'revenue'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">Generating Revenue</div>
                      <div className="text-sm text-gray-600">Have paying customers</div>
                    </button>
                  </div>
                </div>

                {data.tractionType === 'pre-revenue' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="userInterviews">User interviews conducted</Label>
                      <Input
                        id="userInterviews"
                        placeholder="e.g., 50+"
                        value={data.userInterviews}
                        onChange={(e) => updateData('userInterviews', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lois">Letters of Intent (LOIs)</Label>
                      <Input
                        id="lois"
                        placeholder="e.g., 5 signed"
                        value={data.lois}
                        onChange={(e) => updateData('lois', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pilots">Pilot customers</Label>
                      <Input
                        id="pilots"
                        placeholder="e.g., 3 active pilots"
                        value={data.pilots}
                        onChange={(e) => updateData('pilots', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="waitlist">Waitlist size</Label>
                      <Input
                        id="waitlist"
                        placeholder="e.g., 500 users"
                        value={data.waitlist}
                        onChange={(e) => updateData('waitlist', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {data.tractionType === 'revenue' && (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="mrr">Monthly Recurring Revenue (MRR)</Label>
                        <div className="flex items-center mt-1">
                          <DollarSign className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
                          <Input
                            id="mrr"
                            placeholder="50,000"
                            value={data.mrr}
                            onChange={(e) => updateData('mrr', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="growthRate">Month-over-month growth</Label>
                        <Input
                          id="growthRate"
                          placeholder="e.g., 15%"
                          value={data.growthRate}
                          onChange={(e) => updateData('growthRate', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="customerCount">Customer count</Label>
                        <Input
                          id="customerCount"
                          placeholder="e.g., 150"
                          value={data.customerCount}
                          onChange={(e) => updateData('customerCount', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="churnRate">Monthly churn rate</Label>
                        <Input
                          id="churnRate"
                          placeholder="e.g., 3%"
                          value={data.churnRate}
                          onChange={(e) => updateData('churnRate', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="cac">Customer Acquisition Cost (CAC)</Label>
                        <div className="flex items-center mt-1">
                          <DollarSign className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
                          <Input
                            id="cac"
                            placeholder="250"
                            value={data.cac}
                            onChange={(e) => updateData('cac', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="ltv">Customer Lifetime Value (LTV)</Label>
                        <div className="flex items-center mt-1">
                          <DollarSign className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
                          <Input
                            id="ltv"
                            placeholder="1,500"
                            value={data.ltv}
                            onChange={(e) => updateData('ltv', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-900">Integration Options</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1 mb-3">
                        Connect your data sources to auto-verify these metrics
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="border-green-300 text-green-700">
                          Connect Stripe
                        </Button>
                        <Button variant="outline" size="sm" className="border-green-300 text-green-700">
                          Link Google Analytics
                        </Button>
                        <Button variant="outline" size="sm" className="border-green-300 text-green-700">
                          Upload Statements
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Team */}
          {currentStep === 4 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                  <Users className="h-6 w-6 text-indigo-600" />
                  <span>Team</span>
                </CardTitle>
                <p className="text-gray-600">The people building this startup</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div>
                  <Label htmlFor="teamSize">Current team size *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {['Just me', '2-3 people', '4-6 people', '7+ people'].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateData('teamSize', size)}
                        className={`p-3 border-2 rounded-lg text-sm transition-all ${
                          data.teamSize === size
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Co-founder Information</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Add co-founder details including their LinkedIn profiles, roles, and equity split. This helps us understand your team&apos;s complementary skills.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Key team members & advisors</Label>
                  <p className="text-sm text-gray-600 mb-3">List any notable team members, advisors, or domain experts</p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Type name and role, press Enter (e.g., Jane Smith - Former VP Eng at Google)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value && !data.advisors.includes(value)) {
                            addToArray('advisors', value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="space-y-2">
                      {data.advisors.map((advisor, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 text-gray-800 text-sm px-4 py-3 rounded-lg"
                        >
                          <span>{advisor}</span>
                          <button
                            onClick={() => removeFromArray('advisors', index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="equitySplit">Equity split among co-founders</Label>
                  <Input
                    id="equitySplit"
                    placeholder="e.g., 50/50 between 2 co-founders, or 40/30/30"
                    value={data.equitySplit}
                    onChange={(e) => updateData('equitySplit', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional but recommended for transparency</p>
                </div>

                <div>
                  <Label>Key hires needed in next 12 months</Label>
                  <p className="text-sm text-gray-600 mb-3">What critical roles do you need to fill?</p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Type role and press Enter (e.g., Head of Sales, Senior Backend Engineer)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value && !data.keyHires.includes(value)) {
                            addToArray('keyHires', value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {data.keyHires.map((hire, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full"
                        >
                          {hire}
                          <button
                            onClick={() => removeFromArray('keyHires', index)}
                            className="ml-2 text-indigo-500 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Fundraising */}
          {currentStep === 5 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <span>Fundraising</span>
                </CardTitle>
                <p className="text-gray-600">Your current funding needs and situation</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="raisingAmount">How much are you raising? *</Label>
                    <div className="flex items-center mt-1">
                      <DollarSign className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
                      <Input
                        id="raisingAmount"
                        placeholder="e.g., $500,000"
                        value={data.raisingAmount}
                        onChange={(e) => updateData('raisingAmount', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="targetCloseDate">Target close date</Label>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 text-gray-400 absolute ml-3 z-10" />
                      <Input
                        id="targetCloseDate"
                        type="month"
                        value={data.targetCloseDate}
                        onChange={(e) => updateData('targetCloseDate', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="useOfFunds">Use of funds *</Label>
                  <p className="text-sm text-gray-600 mb-3">Break down how you&apos;ll allocate the capital</p>
                  <Textarea
                    id="useOfFunds"
                    placeholder="Example:&#10;• Product Development (40%) - $200K&#10;• Sales & Marketing (30%) - $150K&#10;• Team Expansion (20%) - $100K&#10;• Operations & Runway (10%) - $50K"
                    value={data.useOfFunds}
                    onChange={(e) => updateData('useOfFunds', e.target.value)}
                    className="mt-1"
                    rows={6}
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <p className="text-xs text-gray-500 w-full mb-1">Quick add common categories:</p>
                    {useOfFundsOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          const current = data.useOfFunds;
                          const newLine = current ? '\n' : '';
                          updateData('useOfFunds', `${current}${newLine}• ${option}: `);
                        }}
                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                      >
                        + {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="previousFunding">Previous funding raised</Label>
                  <Input
                    id="previousFunding"
                    placeholder="e.g., $100K from friends & family, or 'Bootstrapped'"
                    value={data.previousFunding}
                    onChange={(e) => updateData('previousFunding', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="runwayRemaining">Current runway remaining</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {['Less than 3 months', '3-6 months', '6-12 months', '12+ months'].map((runway) => (
                      <button
                        key={runway}
                        onClick={() => updateData('runwayRemaining', runway)}
                        className={`p-3 border-2 rounded-lg text-sm transition-all ${
                          data.runwayRemaining === runway
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {runway}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Investor Matching</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Based on your profile, we&apos;ll match you with relevant investors in our network who invest in your stage, industry, and geography.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Almost done!</h3>
                  <p className="text-gray-600 mb-4">
                    Complete your startup profile to unlock AI-powered insights and investor matching
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Building your startup profile... 🔥
              </div>

              <Button
                onClick={handleNext}
                disabled={!canContinue()}
                size="lg"
                className="min-w-[120px]"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Complete Profile
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}