"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Brain,
  Clock,
  Zap,
  Target,
  CheckCircle,
  Play,
  User,
  Building2,
  Rocket
} from "lucide-react";

interface OnboardingData {
  stage: string;
  funding: string;
  timeCommitment: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isComplete: boolean;
}

function OnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signUp: _signUp } = useAuth();
  const focusOnScore = searchParams.get('focus') === 'score';

  const [currentStep, setCurrentStep] = useState(0);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    stage: '',
    funding: '',
    timeCommitment: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    isComplete: false
  });

  const [showWelcome, setShowWelcome] = useState(true);

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Your Funding Journey',
      description: 'Let\'s get you connected with the right investors'
    },
    {
      id: 'quick_questions',
      title: 'Quick Questions',
      description: 'Help us understand your startup better'
    },
    {
      id: 'account_creation',
      title: 'Create Your Account',
      description: 'Secure your progress and get started'
    },
    {
      id: 'getting_started',
      title: 'Ready to Begin!',
      description: 'Your Q Score journey starts now'
    }
  ];

  const stageOptions = [
    { value: 'idea', label: 'Idea Stage', desc: 'Concept validation' },
    { value: 'mvp', label: 'MVP Built', desc: 'Minimum viable product' },
    { value: 'revenue', label: 'Revenue Generating', desc: 'Paying customers' },
    { value: 'scaling', label: 'Scaling', desc: 'Rapid growth phase' }
  ];

  const fundingOptions = [
    { value: 'pre-seed', label: 'Pre-Seed', desc: '$0-250K' },
    { value: 'seed', label: 'Seed', desc: '$250K-2M' },
    { value: 'series-a', label: 'Series A', desc: '$2M-15M' },
    { value: 'bootstrapped', label: 'Bootstrapped', desc: 'Self-funded' }
  ];

  const timeOptions = [
    { value: '15-mins', label: '15 minutes now', desc: 'Quick assessment', icon: Zap, color: 'green' },
    { value: 'save-later', label: 'Save for later', desc: 'Get reminder email', icon: Clock, color: 'blue' }
  ];

  const handleNext = async () => {
    // If on account creation step, create Supabase account via API
    if (currentStep === 2) {
      setIsCreatingAccount(true);

      // Debug: Log what we're sending
      const signupData = {
        email: data.email,
        password: data.password,
        fullName: `${data.firstName} ${data.lastName}`,
        stage: data.stage,
      };
      console.log('🔍 Signup data:', signupData);

      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupData),
        });

        const result = await response.json();
        console.log('📥 Signup response:', result);

        if (!response.ok) {
          toast.error(result.error || 'Account creation failed');
          setIsCreatingAccount(false);
          return;
        }

        toast.success('Account created successfully!');

        // Note: Supabase will send a confirmation email
        // For now, we'll continue to next step
      } catch (err) {
        console.error('Account creation error:', err);
        toast.error('Failed to create account. Please try again.');
        setIsCreatingAccount(false);
        return;
      }
      setIsCreatingAccount(false);
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding - save profile data for AI agents context
      try {
        const profileData = {
          fullName: `${data.firstName} ${data.lastName}`,
          email: data.email,
          stage: data.stage,
          funding: data.funding,
          timeCommitment: data.timeCommitment,
          // Will be enriched with startup details from assessment
        };
        localStorage.setItem('founderProfile', JSON.stringify(profileData));
      } catch (error) {
        console.error('Error saving profile:', error);
      }

      router.push('/founder/assessment');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canContinue = () => {
    switch (currentStep) {
      case 1: // Quick questions
        return data.stage && data.funding && data.timeCommitment;
      case 2: // Account creation
        return data.email && data.password && data.firstName && data.lastName && data.password.length >= 6;
      default:
        return true;
    }
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / steps.length) * 100;
  };

  // Welcome Video Modal
  if (showWelcome && currentStep === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 transform transition-transform hover:scale-105">
              <span className="text-white font-black text-xs tracking-tighter leading-none">EDGE</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {focusOnScore ? 'Discover Your Q Score' : 'Welcome to Edge Alpha'}
              </h1>
              <p className="text-lg text-gray-600">
                {focusOnScore
                  ? 'Get instant insights into your startup\'s funding readiness with our proprietary Q Score algorithm.'
                  : 'You\'re about to embark on a journey that will transform how you approach fundraising. Here\'s what to expect:'
                }
              </p>
            </div>

            <div className="bg-gray-100 rounded-xl p-6 space-y-4">
              <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 to-purple-600/80"></div>
                <div className="relative z-10 text-center space-y-4">
                  <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                  <div className="text-white">
                    <div className="font-semibold">Welcome Video</div>
                    <div className="text-sm opacity-80">30 seconds • What to expect</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Brain className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">AI Analysis</div>
                  <div className="text-gray-600">Deep startup insights</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Smart Matching</div>
                  <div className="text-gray-600">Perfect investor fit</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">15 Minutes</div>
                  <div className="text-gray-600">Complete evaluation</div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                if (focusOnScore) {
                  // For Q Score flow, skip onboarding and go directly to assessment
                  router.push('/founder/assessment?focus=score');
                } else {
                  // For full evaluation, continue with onboarding steps
                  setShowWelcome(false);
                  setCurrentStep(1);
                }
              }}
              className="w-full"
              size="lg"
            >
              {focusOnScore ? 'Calculate My Q Score' : 'Let\'s Get Started'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-gray-500">
              No credit card required • Your data is secure and private
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                <span className="text-white font-black text-[8px] tracking-tighter leading-none">EDGE</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Edge Alpha</div>
                <div className="text-xs text-gray-600">{steps[currentStep].description}</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className="w-32">
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="w-full max-w-2xl">

          {/* Step 1: Quick Questions */}
          {currentStep === 1 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Quick Questions</CardTitle>
                <p className="text-gray-600">Help us personalize your experience (takes 2 minutes)</p>
              </CardHeader>
              <CardContent className="space-y-8">

                {/* Stage Question */}
                <div className="space-y-4">
                  <Label className="text-lg font-medium">What stage is your startup?</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {stageOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateData('stage', option.value)}
                        className={`p-4 border-2 rounded-lg text-left transition-all hover:border-blue-300 ${
                          data.stage === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Funding Question */}
                <div className="space-y-4">
                  <Label className="text-lg font-medium">Current funding status?</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {fundingOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateData('funding', option.value)}
                        className={`p-4 border-2 rounded-lg text-left transition-all hover:border-blue-300 ${
                          data.funding === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Commitment */}
                <div className="space-y-4">
                  <Label className="text-lg font-medium">How much time can you dedicate right now?</Label>
                  <div className="space-y-3">
                    {timeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateData('timeCommitment', option.value)}
                        className={`w-full p-4 border-2 rounded-lg text-left flex items-center space-x-4 transition-all hover:border-blue-300 ${
                          data.timeCommitment === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          option.color === 'green' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <option.icon className={`h-6 w-6 ${
                            option.color === 'green' ? 'text-green-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Account Creation */}
          {currentStep === 2 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create Your Account</CardTitle>
                <p className="text-gray-600">Secure your progress and get personalized insights</p>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Social Login Options */}
                <div className="space-y-3">
                  <Button variant="outline" className="w-full" size="lg">
                    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </Button>

                  <Button variant="outline" className="w-full" size="lg">
                    <Building2 className="h-5 w-5 mr-3" />
                    Continue with LinkedIn
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                {/* Email Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={data.email}
                      onChange={(e) => updateData('email', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={data.password}
                      onChange={(e) => updateData('password', e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={data.firstName}
                        onChange={(e) => updateData('firstName', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        placeholder="Smith"
                        value={data.lastName}
                        onChange={(e) => updateData('lastName', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Login Link */}
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                      Sign in
                    </Link>
                  </p>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Ready to Begin */}
          {currentStep === 3 && (
            <Card className="w-full">
              <CardContent className="p-8 text-center space-y-6">
                <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Ready to Begin, {data.firstName}!
                  </h1>
                  <p className="text-lg text-gray-600">
                    Your Q Score journey starts now. We&apos;ll analyze your startup across multiple dimensions.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">What happens next:</h3>
                  <div className="space-y-3 text-sm text-left">
                    <div className="flex items-center space-x-3">
                      <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Founder Assessment (5 mins)</div>
                        <div className="text-gray-600">Cognitive tests and personality insights</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-6 w-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-3 w-3 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">Startup Deep Dive (8 mins)</div>
                        <div className="text-gray-600">Problem, solution, market, and traction</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Brain className="h-3 w-3 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">AI Enhancement (2 mins)</div>
                        <div className="text-gray-600">Optimize your pitch and materials</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  🎯 Estimated time: {data.timeCommitment === '15-mins' ? '15 minutes' : 'Flexible'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canContinue() || isCreatingAccount}
              size="lg"
            >
              {isCreatingAccount ? (
                <>Creating Account...</>
              ) : currentStep === steps.length - 1 ? (
                <>
                  Start Assessment
                  <Rocket className="ml-2 h-4 w-4" />
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
  );
}

export default function FounderOnboarding() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-black text-xs">EDGE</span>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}