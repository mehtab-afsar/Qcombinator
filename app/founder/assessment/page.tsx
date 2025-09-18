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
  Brain,
  Clock,
  User,
  Video,
  Target,
  Zap,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Mic,
  Camera,
  Github,
  Twitter,
  Linkedin
} from "lucide-react";

interface AssessmentData {
  // About You
  location: string;
  timezone: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  role: string;
  experience: string;
  previousStartup: string;

  // Cognitive Tests
  cognitiveScores: {
    problemSolving: number;
    patternRecognition: number;
    resourceAllocation: number;
    priorityDecision: number;
  };

  // Personality
  personalityScores: {
    leadership: number;
    stressResponse: number;
    workStyle: number;
  };

  // Video
  videoRecorded: boolean;
  videoUrl: string;
}

export default function FounderAssessment() {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSubStep, setCurrentSubStep] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [data, setData] = useState<AssessmentData>({
    location: '',
    timezone: 'UTC',
    linkedinUrl: '',
    githubUrl: '',
    twitterUrl: '',
    role: '',
    experience: '',
    previousStartup: '',
    cognitiveScores: {
      problemSolving: 0,
      patternRecognition: 0,
      resourceAllocation: 0,
      priorityDecision: 0
    },
    personalityScores: {
      leadership: 0,
      stressResponse: 0,
      workStyle: 0
    },
    videoRecorded: false,
    videoUrl: ''
  });

  const steps = [
    { id: 'about', title: 'About You', time: 2, substeps: ['Basic Info', 'Experience'] },
    { id: 'cognitive', title: 'Quick Assessments', time: 5, substeps: ['Problem Solving', 'Pattern Recognition', 'Resource Allocation', 'Priority Matrix'] },
    { id: 'personality', title: 'Personality Snapshot', time: 3, substeps: ['Leadership Style', 'Stress Response', 'Work Preferences'] },
    { id: 'video', title: 'Video Introduction', time: 2, substeps: ['Record Pitch'] }
  ];

  const roleOptions = [
    { value: 'CEO', label: 'CEO / Co-Founder' },
    { value: 'CTO', label: 'CTO / Technical Co-Founder' },
    { value: 'CPO', label: 'CPO / Product Co-Founder' },
    { value: 'Other', label: 'Other Leadership Role' }
  ];

  const experienceOptions = [
    { value: '0-2', label: '0-2 years' },
    { value: '3-5', label: '3-5 years' },
    { value: '5-10', label: '5-10 years' },
    { value: '10+', label: '10+ years' }
  ];

  // Cognitive Test Questions
  const cognitiveTests = {
    problemSolving: {
      title: "Resource Optimization Challenge",
      scenario: "Your startup has $50K runway left and 3 months to reach profitability. You have 4 options:",
      options: [
        { id: 'a', text: "Cut team by 50%, focus on sales", points: 6 },
        { id: 'b', text: "Pivot to a cheaper business model", points: 8 },
        { id: 'c', text: "Raise emergency funding immediately", points: 4 },
        { id: 'd', text: "Reduce features, ship MVP faster", points: 9 }
      ]
    },
    patternRecognition: {
      title: "Market Pattern Analysis",
      scenario: "Analyze this user growth pattern: Week 1: 100 users, Week 2: 150 users, Week 3: 225 users, Week 4: ?",
      options: [
        { id: 'a', text: "300 users (linear growth)", points: 3 },
        { id: 'b', text: "338 users (50% weekly growth)", points: 9 },
        { id: 'c', text: "400 users (aggressive estimate)", points: 5 },
        { id: 'd', text: "250 users (conservative estimate)", points: 2 }
      ]
    },
    resourceAllocation: {
      title: "Team Resource Puzzle",
      scenario: "You have 40 hours of developer time this week. How do you allocate across these critical tasks?",
      tasks: [
        { name: "Fix critical bug affecting 20% of users", importance: "High", time: "12h" },
        { name: "Build feature requested by big prospect", importance: "High", time: "16h" },
        { name: "Improve app performance by 30%", importance: "Medium", time: "20h" },
        { name: "Add analytics tracking", importance: "Low", time: "8h" }
      ]
    },
    priorityDecision: {
      title: "Strategic Priority Matrix",
      scenario: "Rank these initiatives by impact vs effort (1 = highest priority, 4 = lowest):",
      initiatives: [
        "Launch referral program",
        "Expand to new market",
        "Improve onboarding flow",
        "Add premium pricing tier"
      ]
    }
  };

  // Personality Questions
  const personalityQuestions = {
    leadership: [
      {
        question: "When making tough decisions, you typically:",
        options: [
          { text: "Gather extensive data before deciding", points: { analytical: 3 } },
          { text: "Trust your gut instinct", points: { intuitive: 3 } },
          { text: "Consult with the team first", points: { collaborative: 3 } },
          { text: "Make quick decisions and adjust later", points: { decisive: 3 } }
        ]
      }
    ],
    stressResponse: [
      {
        question: "Under extreme pressure, you tend to:",
        options: [
          { text: "Become more focused and decisive", points: { thrives: 3 } },
          { text: "Take a step back and analyze", points: { analytical: 3 } },
          { text: "Rally the team for support", points: { collaborative: 3 } },
          { text: "Work longer hours to solve it", points: { persistent: 3 } }
        ]
      }
    ]
  };

  const getCurrentStepInfo = () => steps[currentStep];
  const getTotalSteps = () => steps.reduce((acc, step) => acc + step.substeps.length, 0);
  const getCurrentStepNumber = () => {
    let stepNumber = 0;
    for (let i = 0; i < currentStep; i++) {
      stepNumber += steps[i].substeps.length;
    }
    return stepNumber + currentSubStep + 1;
  };

  const handleNext = () => {
    const currentStepInfo = getCurrentStepInfo();

    if (currentSubStep < currentStepInfo.substeps.length - 1) {
      setCurrentSubStep(currentSubStep + 1);
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentSubStep(0);
    } else {
      // Complete assessment
      window.location.href = '/founder/startup-profile';
    }
  };

  const handleBack = () => {
    if (currentSubStep > 0) {
      setCurrentSubStep(currentSubStep - 1);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCurrentSubStep(steps[currentStep - 1].substeps.length - 1);
    }
  };

  const updateData = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedData = (section: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof AssessmentData],
        [field]: value
      }
    }));
  };

  const canContinue = () => {
    if (currentStep === 0) {
      if (currentSubStep === 0) {
        return data.location && data.role;
      } else {
        return data.experience;
      }
    }
    if (currentStep === 3) {
      return data.videoRecorded;
    }
    return true;
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
                <div className="font-semibold text-gray-900">Founder Assessment</div>
                <div className="text-xs text-gray-600">{getCurrentStepInfo().title} • {getCurrentStepInfo().substeps[currentSubStep]}</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {getCurrentStepNumber()} of {getTotalSteps()}
              </div>
              <div className="w-32">
                <Progress value={(getCurrentStepNumber() / getTotalSteps()) * 100} className="h-2" />
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
        <div className="w-full max-w-3xl">

          {/* Step 1: About You - Basic Info */}
          {currentStep === 0 && currentSubStep === 0 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                  <User className="h-6 w-6 text-blue-600" />
                  <span>About You</span>
                </CardTitle>
                <p className="text-gray-600">Help us understand your background and expertise</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="San Francisco, CA"
                        value={data.location}
                        onChange={(e) => updateData('location', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <select
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        value={data.timezone}
                        onChange={(e) => updateData('timezone', e.target.value)}
                      >
                        <option value="UTC">UTC</option>
                        <option value="EST">Eastern Time</option>
                        <option value="PST">Pacific Time</option>
                        <option value="CET">Central European Time</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Role in startup</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {roleOptions.map((role) => (
                          <button
                            key={role.value}
                            onClick={() => updateData('role', role.value)}
                            className={`p-3 border-2 rounded-lg text-sm transition-all ${
                              data.role === role.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {role.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Professional Profiles (boost your Q Score)</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Linkedin className="h-5 w-5 text-blue-600" />
                      <Input
                        placeholder="https://linkedin.com/in/yourname"
                        value={data.linkedinUrl}
                        onChange={(e) => updateData('linkedinUrl', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <Github className="h-5 w-5 text-gray-800" />
                      <Input
                        placeholder="https://github.com/yourusername"
                        value={data.githubUrl}
                        onChange={(e) => updateData('githubUrl', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <Twitter className="h-5 w-5 text-blue-400" />
                      <Input
                        placeholder="https://twitter.com/yourusername"
                        value={data.twitterUrl}
                        onChange={(e) => updateData('twitterUrl', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: About You - Experience */}
          {currentStep === 0 && currentSubStep === 1 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Your Experience</CardTitle>
                <p className="text-gray-600">Tell us about your background and previous ventures</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div>
                  <Label>Years of relevant experience</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {experienceOptions.map((exp) => (
                      <button
                        key={exp.value}
                        onClick={() => updateData('experience', exp.value)}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          data.experience === exp.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{exp.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="previousStartup">Previous startup experience?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <button
                      onClick={() => updateData('previousStartup', 'none')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        data.previousStartup === 'none'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">First-time founder</div>
                      <div className="text-sm text-gray-600">This is my first startup</div>
                    </button>
                    <button
                      onClick={() => updateData('previousStartup', 'yes')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        data.previousStartup === 'yes'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">Serial entrepreneur</div>
                      <div className="text-sm text-gray-600">I've founded companies before</div>
                    </button>
                  </div>
                </div>

                {data.previousStartup === 'yes' && (
                  <div>
                    <Label htmlFor="startupDetails">Tell us about your previous startup(s)</Label>
                    <Textarea
                      id="startupDetails"
                      placeholder="Company name, what happened (sold, failed, still running), key learnings..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Cognitive Tests - Problem Solving */}
          {currentStep === 1 && currentSubStep === 0 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                  <Brain className="h-6 w-6 text-purple-600" />
                  <span>Problem Solving</span>
                </CardTitle>
                <p className="text-gray-600">Test your strategic thinking under pressure</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{cognitiveTests.problemSolving.title}</h3>
                  <p className="text-gray-700">{cognitiveTests.problemSolving.scenario}</p>
                </div>

                <div className="space-y-3">
                  {cognitiveTests.problemSolving.options.map((option) => (
                    <button
                      key={option.id}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-all"
                      onClick={() => updateNestedData('cognitiveScores', 'problemSolving', option.points)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="h-6 w-6 border-2 border-gray-300 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          <span className="text-sm font-medium">{option.id.toUpperCase()}</span>
                        </div>
                        <div className="text-gray-900">{option.text}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="text-xs text-gray-500 text-center">
                  💡 There's no single right answer - we're analyzing your decision-making approach
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Pattern Recognition */}
          {currentStep === 1 && currentSubStep === 1 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Pattern Recognition</CardTitle>
                <p className="text-gray-600">Analyze trends and predict outcomes</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{cognitiveTests.patternRecognition.title}</h3>
                  <p className="text-gray-700">{cognitiveTests.patternRecognition.scenario}</p>
                </div>

                <div className="space-y-3">
                  {cognitiveTests.patternRecognition.options.map((option) => (
                    <button
                      key={option.id}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-all"
                      onClick={() => updateNestedData('cognitiveScores', 'patternRecognition', option.points)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="h-6 w-6 border-2 border-gray-300 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          <span className="text-sm font-medium">{option.id.toUpperCase()}</span>
                        </div>
                        <div className="text-gray-900">{option.text}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Video Introduction */}
          {currentStep === 3 && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                  <Video className="h-6 w-6 text-green-600" />
                  <span>Video Introduction</span>
                </CardTitle>
                <p className="text-gray-600">Record a 60-second elevator pitch (optional but recommended)</p>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center space-y-4">
                  {!data.videoRecorded ? (
                    <>
                      <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Camera className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Ready to record?</h3>
                        <p className="text-gray-600 text-sm mt-1">
                          Tell us about your startup, what problem you're solving, and why you're the right person to solve it.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Button className="bg-red-600 hover:bg-red-700">
                          <Camera className="h-4 w-4 mr-2" />
                          Start Recording
                        </Button>
                        <p className="text-xs text-gray-500">60 seconds • Your camera and microphone will be used</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-700">Video recorded successfully!</h3>
                        <p className="text-green-600 text-sm mt-1">
                          Your pitch has been analyzed for clarity, passion, and confidence.
                        </p>
                      </div>
                      <div className="flex justify-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        <Button variant="outline" size="sm">
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Re-record
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Alternative options:</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload existing pitch video
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-gray-600"
                      onClick={() => updateData('videoRecorded', true)}
                    >
                      Skip for now (complete later)
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>💡 <strong>Tips for a great pitch:</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 ml-4">
                    <li>Start with the problem you're solving</li>
                    <li>Explain your unique solution</li>
                    <li>Share your traction or validation</li>
                    <li>End with why you're the right founder</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0 && currentSubStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center space-x-4">
              {currentStep < 3 && (
                <div className="text-sm text-gray-500">
                  {currentStep === 0 ? 'Building your Q Score...' :
                   currentStep === 1 ? 'Analyzing cognitive patterns...' :
                   'Profiling your leadership style...'}
                </div>
              )}

              <Button
                onClick={handleNext}
                disabled={!canContinue()}
                size="lg"
                className="min-w-[120px]"
              >
                {currentStep === steps.length - 1 ? (
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
        </div>
      </div>
    </div>
  );
}