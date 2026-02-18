"use client";

import { useState, useEffect } from "react";
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
  const _getProgressPercentage = () => ((currentSection + 1) / sections.length) * 100;

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

  // ── cream palette ──────────────────────────────────────────────────────────
  const bg    = "#F9F7F2";
  const surf  = "#F0EDE6";
  const bdr   = "#E2DDD5";
  const ink   = "#18160F";
  const muted = "#8A867C";
  const blue  = "#2563EB";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink }}>

      {/* ── sticky header ──────────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: bg, borderBottom: `1px solid ${bdr}`, padding: "14px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* logo + section name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ height: 30, width: 30, borderRadius: 7, background: blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.2 }}>Q-Score Assessment</p>
              <p style={{ fontSize: 11, color: muted }}>{currentSectionData.category}</p>
            </div>
          </div>

          {/* section pill + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: muted }}>~{currentSectionData.time} min</span>
            <div style={{ padding: "4px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 12, color: ink, fontWeight: 600 }}>
              {currentSection + 1} / {sections.length}
            </div>
          </div>
        </div>
      </div>

      {/* ── main content ───────────────────────────────────────────────── */}
      <div style={{ padding: "40px 24px 80px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 720 }}>

          {/* section header */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 8 }}>
              Section {currentSection + 1} — {currentSectionData.category}
            </p>
            <h1 style={{ fontSize: "clamp(1.5rem,3.5vw,2rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 6 }}>
              {currentSectionData.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: muted }}>
                Up to <strong style={{ color: blue, fontWeight: 600 }}>+{currentSectionData.points} pts</strong> toward your Q-Score
              </span>
              <span style={{ fontSize: 11, color: muted, opacity: 0.5 }}>·</span>
              <span style={{ fontSize: 12, color: muted }}>Auto-saved</span>
            </div>
          </div>

          {/* section content box */}
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 16, padding: "28px 28px", marginBottom: 28 }}>
            {renderSection()}
          </div>

          {/* navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={handleBack}
              disabled={currentSection === 0}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 14, color: currentSection === 0 ? bdr : muted,
                background: "none", border: "none", cursor: currentSection === 0 ? "not-allowed" : "pointer",
                transition: "color .15s",
              }}
              onMouseEnter={(e) => { if (currentSection > 0) (e.currentTarget as HTMLElement).style.color = ink; }}
              onMouseLeave={(e) => { if (currentSection > 0) (e.currentTarget as HTMLElement).style.color = muted; }}
            >
              <ArrowLeft style={{ height: 15, width: 15 }} />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!canContinue()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: canContinue() ? ink : bdr,
                color: canContinue() ? bg : muted,
                fontWeight: 500, padding: "12px 28px", borderRadius: 999,
                fontSize: 14, border: "none",
                cursor: canContinue() ? "pointer" : "not-allowed",
                transition: "opacity .15s",
                minWidth: 140,
              }}
              onMouseEnter={(e) => { if (canContinue()) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
              onMouseLeave={(e) => { if (canContinue()) (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              {currentSection === sections.length - 1 ? (
                <>Complete <CheckCircle style={{ height: 15, width: 15 }} /></>
              ) : (
                <>Continue <ArrowRight style={{ height: 15, width: 15 }} /></>
              )}
            </button>
          </div>

          {/* progress dots */}
          <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 6 }}>
            {sections.map((section, idx) => (
              <div
                key={section.id}
                title={section.title}
                style={{
                  flex: 1, height: 3, borderRadius: 999,
                  background: idx < currentSection ? "#16A34A" : idx === currentSection ? blue : bdr,
                  transition: "background .3s",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: muted }}>{currentSection} completed</span>
            <span style={{ fontSize: 11, color: muted }}>{sections.length - currentSection - 1} remaining</span>
          </div>

        </div>
      </div>
    </div>
  );
}
