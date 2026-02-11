"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  Target,
  Users,
  Zap,
  TrendingUp,
  Heart,
  CheckCircle,
  Brain,
} from "lucide-react";

// Import new components
import { ProblemOriginForm } from "@/features/founder/components/assessment/ProblemOriginForm";
import { UniqueAdvantageForm } from "@/features/founder/components/assessment/UniqueAdvantageForm";
import { CustomerEvidenceForm } from "@/features/founder/components/assessment/CustomerEvidenceForm";
import { FailedAssumptionsForm } from "@/features/founder/components/assessment/FailedAssumptionsForm";
import { LearningVelocityForm } from "@/features/founder/components/assessment/LearningVelocityForm";
import { MarketCalculator } from "@/features/founder/components/assessment/MarketCalculator";
import { GoToMarketForm } from "@/features/founder/components/assessment/GoToMarketForm";
import { FinancialHealthForm } from "@/features/founder/components/assessment/FinancialHealthForm";
import { ResilienceForm } from "@/features/founder/components/assessment/ResilienceForm";

interface NewAssessmentData {
  // Section A: Founder-Problem Fit
  problemStory: string;
  problemFollowUps: string[];
  advantages: string[];
  advantageExplanation: string;

  // Section B: Customer Understanding
  customerType: string;
  conversationDate: Date | null;
  customerQuote: string;
  customerSurprise: string;
  customerCommitment: string;
  conversationCount: number;
  customerList: string[];

  // Failed Assumptions
  failedBelief: string;
  failedReasoning: string;
  failedDiscovery: string;
  failedChange: string;

  // Section C: Execution
  tested: string;
  buildTime: number;
  measurement: string;
  results: string;
  learned: string;
  changed: string;

  // Section D: Market Realism
  targetCustomers: number;
  talkToCount: number;
  conversionRate: number;
  avgContractValue: number;
  customerLifetimeMonths: number;
  validationChecks: string[];

  // Section E: Go-to-Market
  icpDescription: string;
  channelsTried: string[];
  channelResults: {
    [key: string]: { spend: number; conversions: number; cac: number };
  };
  currentCAC: number;
  targetCAC: number;
  messagingTested: boolean;
  messagingResults: string;

  // Section F: Financial Health
  revenueModel: string;
  mrr: number;
  arr: number;
  monthlyBurn: number;
  runway: number;
  cogs: number;
  averageDealSize: number;
  projectedRevenue12mo: number;
  revenueAssumptions: string;
  previousMrr?: number;

  // Section G: Resilience
  hardestMoment: string;
  quitScale: number;
  whatKeptGoing: string;
}

export default function FounderAssessment() {
  const [currentSection, setCurrentSection] = useState(0);
  const [data, setData] = useState<NewAssessmentData>({
    // Section A
    problemStory: '',
    problemFollowUps: [],
    advantages: [],
    advantageExplanation: '',

    // Section B
    customerType: '',
    conversationDate: null,
    customerQuote: '',
    customerSurprise: '',
    customerCommitment: '',
    conversationCount: 0,
    customerList: [],
    failedBelief: '',
    failedReasoning: '',
    failedDiscovery: '',
    failedChange: '',

    // Section C
    tested: '',
    buildTime: 7,
    measurement: '',
    results: '',
    learned: '',
    changed: '',

    // Section D
    targetCustomers: 0,
    talkToCount: 0,
    conversionRate: 5,
    avgContractValue: 0,
    customerLifetimeMonths: 12,
    validationChecks: [],

    // Section E: GTM
    icpDescription: '',
    channelsTried: [],
    channelResults: {},
    currentCAC: 0,
    targetCAC: 0,
    messagingTested: false,
    messagingResults: '',

    // Section F: Financial
    revenueModel: 'none',
    mrr: 0,
    arr: 0,
    monthlyBurn: 0,
    runway: 0,
    cogs: 0,
    averageDealSize: 0,
    projectedRevenue12mo: 0,
    revenueAssumptions: '',
    previousMrr: 0,

    // Section G: Resilience
    hardestMoment: '',
    quitScale: 5,
    whatKeptGoing: '',
  });

  // Load from localStorage AND API on mount
  useEffect(() => {
    // Try to load from API first
    const loadDraft = async () => {
      try {
        const response = await fetch('/api/assessment/save');
        if (response.ok) {
          const { draft } = await response.json();
          if (draft && draft.assessment_data) {
            setData(draft.assessment_data);
            return;
          }
        }
      } catch (_e) {
        console.log('Could not load from API, trying localStorage');
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('founderAssessment');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData(parsed);
        } catch (e) {
          console.error('Failed to load saved assessment:', e);
        }
      }
    };

    loadDraft();
  }, []);

  // Auto-save to API and localStorage
  useEffect(() => {
    // Save to localStorage immediately
    localStorage.setItem('founderAssessment', JSON.stringify(data));

    // Debounce API save (save after 2 seconds of no changes)
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/assessment/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentData: data }),
        });
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [data]);

  const sections = [
    {
      id: 'problem-origin',
      title: 'Problem Origin Story',
      category: 'Founder-Problem Fit',
      time: 3,
      icon: Target,
      points: 100,
    },
    {
      id: 'unique-advantage',
      title: 'Your Unique Advantages',
      category: 'Founder-Problem Fit',
      time: 3,
      icon: Zap,
      points: 100,
    },
    {
      id: 'customer-evidence',
      title: 'Customer Evidence',
      category: 'Customer Understanding',
      time: 4,
      icon: Users,
      points: 200,
    },
    {
      id: 'failed-assumptions',
      title: 'Failed Assumptions',
      category: 'Customer Understanding',
      time: 2,
      icon: Brain,
      points: 100,
    },
    {
      id: 'learning-velocity',
      title: 'Build-Measure-Learn',
      category: 'Execution Speed',
      time: 4,
      icon: Zap,
      points: 150,
    },
    {
      id: 'market-sizing',
      title: 'Market Sizing',
      category: 'Market Realism',
      time: 2,
      icon: TrendingUp,
      points: 150,
    },
    {
      id: 'go-to-market',
      title: 'Go-to-Market Strategy',
      category: 'GTM & Distribution',
      time: 4,
      icon: Target,
      points: 170,
    },
    {
      id: 'financial-health',
      title: 'Financial Health',
      category: 'Unit Economics & Runway',
      time: 3,
      icon: TrendingUp,
      points: 180,
    },
    {
      id: 'resilience',
      title: 'Hardest Moment',
      category: 'Resilience',
      time: 2,
      icon: Heart,
      points: 100,
    },
  ];

  const getCurrentSection = () => sections[currentSection];
  const getProgressPercentage = () => ((currentSection + 1) / sections.length) * 100;

  const handleNext = async () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Complete assessment - save for AI agent context and submit to API
      try {
        // Save assessment data to localStorage for AI agents to use
        localStorage.setItem('assessmentData', JSON.stringify(data));

        // Also update founder profile with startup details from assessment
        const existingProfile = JSON.parse(localStorage.getItem('founderProfile') || '{}');
        const enrichedProfile = {
          ...existingProfile,
          startupName: existingProfile.startupName || 'My Startup',
          industry: existingProfile.industry || 'Technology',
          description: data.problemStory?.substring(0, 200) || '',
        };
        localStorage.setItem('founderProfile', JSON.stringify(enrichedProfile));

        const response = await fetch('/api/assessment/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentData: data }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Assessment submitted successfully:', result);

          // Navigate to dashboard
          window.location.href = '/founder/dashboard';
        } else {
          console.error('Failed to submit assessment');
          // Still navigate but show error
          alert('There was an issue submitting your assessment. Please try again later.');
          window.location.href = '/founder/dashboard';
        }
      } catch (error) {
        console.error('Error submitting assessment:', error);
        // Still navigate but show error
        alert('There was an issue submitting your assessment. Please try again later.');
        window.location.href = '/founder/dashboard';
      }
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updateData = (field: keyof NewAssessmentData, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Validation logic for each section
  // Set to true to disable validation during development
  const DEV_MODE = true;

  const canContinue = () => {
    if (DEV_MODE) return true; // Skip validation in dev mode

    switch (currentSection) {
      case 0: // Problem Origin
        return data.problemStory.split(/\s+/).length >= 100;
      case 1: // Unique Advantage
        return data.advantages.length > 0 && data.advantageExplanation.split(/\s+/).length >= 75;
      case 2: // Customer Evidence
        return data.customerQuote.length >= 50 && data.conversationCount > 0;
      case 3: // Failed Assumptions
        return data.failedBelief.length >= 20 && data.failedDiscovery.length >= 20;
      case 4: // Learning Velocity
        return data.tested.length >= 20 && data.learned.length >= 20;
      case 5: // Market Sizing
        return data.targetCustomers > 0 && data.talkToCount > 0 && data.avgContractValue > 0;
      case 6: // Go-to-Market
        return data.icpDescription.split(/\s+/).length >= 30 && data.channelsTried.length > 0;
      case 7: // Financial Health
        return data.monthlyBurn > 0 && data.runway > 0;
      case 8: // Resilience
        return data.hardestMoment.length >= 50 && data.whatKeptGoing.length >= 20;
      default:
        return true;
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case 0: // Problem Origin Story
        return (
          <ProblemOriginForm
            value={data.problemStory}
            onChange={(value) => updateData('problemStory', value)}
          />
        );

      case 1: // Unique Advantage
        return (
          <UniqueAdvantageForm
            selectedAdvantages={data.advantages}
            explanation={data.advantageExplanation}
            onAdvantagesChange={(advantages) => updateData('advantages', advantages)}
            onExplanationChange={(explanation) => updateData('advantageExplanation', explanation)}
          />
        );

      case 2: // Customer Evidence
        return (
          <CustomerEvidenceForm
            data={{
              customerType: data.customerType,
              conversationDate: data.conversationDate,
              customerQuote: data.customerQuote,
              customerSurprise: data.customerSurprise,
              customerCommitment: data.customerCommitment,
              conversationCount: data.conversationCount,
              customerList: data.customerList,
            }}
            onChange={(field, value) => updateData(field as keyof NewAssessmentData, value)}
          />
        );

      case 3: // Failed Assumptions
        return (
          <FailedAssumptionsForm
            data={{
              failedBelief: data.failedBelief,
              failedReasoning: data.failedReasoning,
              failedDiscovery: data.failedDiscovery,
              failedChange: data.failedChange,
            }}
            onChange={(field, value) => updateData(field as keyof NewAssessmentData, value)}
          />
        );

      case 4: // Learning Velocity
        return (
          <LearningVelocityForm
            data={{
              tested: data.tested,
              buildTime: data.buildTime,
              measurement: data.measurement,
              results: data.results,
              learned: data.learned,
              changed: data.changed,
            }}
            onChange={(field, value) => updateData(field as keyof NewAssessmentData, value)}
          />
        );

      case 5: // Market Sizing
        return (
          <MarketCalculator
            data={{
              targetCustomers: data.targetCustomers,
              talkToCount: data.talkToCount,
              conversionRate: data.conversionRate,
              avgContractValue: data.avgContractValue,
              customerLifetimeMonths: data.customerLifetimeMonths,
              validationChecks: data.validationChecks,
            }}
            onChange={(field, value) => updateData(field as keyof NewAssessmentData, value)}
          />
        );

      case 6: // Go-to-Market
        return (
          <GoToMarketForm
            data={{
              icpDescription: data.icpDescription,
              channelsTried: data.channelsTried,
              channelResults: data.channelResults,
              currentCAC: data.currentCAC,
              targetCAC: data.targetCAC,
              messagingTested: data.messagingTested,
              messagingResults: data.messagingResults,
            }}
            onChange={(field, value) => updateData(field as keyof NewAssessmentData, value)}
          />
        );

      case 7: // Financial Health
        return (
          <FinancialHealthForm
            data={{
              revenueModel: data.revenueModel,
              mrr: data.mrr,
              arr: data.arr,
              monthlyBurn: data.monthlyBurn,
              runway: data.runway,
              cogs: data.cogs,
              averageDealSize: data.averageDealSize,
              projectedRevenue12mo: data.projectedRevenue12mo,
              revenueAssumptions: data.revenueAssumptions,
              previousMrr: data.previousMrr,
            }}
            onChange={(field, value) => updateData(field as keyof NewAssessmentData, value)}
          />
        );

      case 8: // Resilience
        return (
          <ResilienceForm
            data={{
              hardestMoment: data.hardestMoment,
              quitScale: data.quitScale,
              whatKeptGoing: data.whatKeptGoing,
            }}
            onChange={(field, value) => updateData(field as keyof NewAssessmentData, value)}
          />
        );

      default:
        return null;
    }
  };

  const currentSectionData = getCurrentSection();

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
                <div className="font-semibold text-gray-900">Founder Assessment</div>
                <div className="text-xs text-gray-600">
                  {currentSectionData.category} • {currentSectionData.title}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Section {currentSection + 1} of {sections.length}
              </div>
              <div className="w-32">
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>
              <div className="text-sm font-medium text-blue-600">
                ~{currentSectionData.time} min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-start justify-center min-h-[calc(100vh-80px)] p-6 py-12">
        <div className="w-full max-w-3xl">
          {/* Section Card */}
          <Card className="w-full">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    currentSection === 0 || currentSection === 1 ? 'bg-blue-100' :
                    currentSection === 2 || currentSection === 3 ? 'bg-purple-100' :
                    currentSection === 4 ? 'bg-green-100' :
                    currentSection === 5 ? 'bg-orange-100' :
                    currentSection === 6 ? 'bg-indigo-100' :
                    currentSection === 7 ? 'bg-emerald-100' :
                    'bg-pink-100'
                  }`}>
                    <currentSectionData.icon className={`h-6 w-6 ${
                      currentSection === 0 || currentSection === 1 ? 'text-blue-600' :
                      currentSection === 2 || currentSection === 3 ? 'text-purple-600' :
                      currentSection === 4 ? 'text-green-600' :
                      currentSection === 5 ? 'text-orange-600' :
                      currentSection === 6 ? 'text-indigo-600' :
                      currentSection === 7 ? 'text-emerald-600' :
                      'text-pink-600'
                    }`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{currentSectionData.title}</CardTitle>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-sm text-gray-600">{currentSectionData.category}</span>
                      <span className="text-sm font-medium text-blue-600">
                        +{currentSectionData.points} points
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {renderSection()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentSection === 0}
              size="lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {currentSection < 2 ? 'Building your founder profile...' :
                 currentSection < 5 ? 'Analyzing your approach...' :
                 'Almost done!'}
              </div>

              <Button
                onClick={handleNext}
                disabled={!canContinue()}
                size="lg"
                className="min-w-[140px]"
              >
                {currentSection === sections.length - 1 ? (
                  <>
                    Complete
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

          {/* Progress Overview */}
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Your Progress</h4>
            <div className="grid grid-cols-9 gap-2">
              {sections.map((section, idx) => (
                <div
                  key={section.id}
                  className={`h-2 rounded-full ${
                    idx < currentSection ? 'bg-green-500' :
                    idx === currentSection ? 'bg-blue-500' :
                    'bg-gray-200'
                  }`}
                  title={section.title}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-600">
                {currentSection} completed
              </span>
              <span className="text-xs text-gray-600">
                {sections.length - currentSection - 1} remaining
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
