"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  FileText,
  Zap,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Download,
  Edit,
  Play,
  BarChart3,
  Target,
  Lightbulb,
  RefreshCw
} from "lucide-react";

interface AIAnalysis {
  overallScore: number;
  categoryScores: {
    market: number;
    team: number;
    product: number;
    traction: number;
    financials: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence: 'high' | 'medium' | 'low';
}

export default function AIEnhancementStation() {
  const [currentTab, setCurrentTab] = useState('analysis');
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  const [aiAnalysis] = useState<AIAnalysis>({
    overallScore: 742,
    categoryScores: {
      market: 85,
      team: 78,
      product: 82,
      traction: 65,
      financials: 58
    },
    strengths: [
      "Strong technical team with proven experience",
      "Large and growing market opportunity ($50B TAM)",
      "Unique AI-powered approach to problem",
      "Early traction with pilot customers",
      "Clear monetization strategy"
    ],
    weaknesses: [
      "Limited financial data and projections",
      "Small customer base needs expansion",
      "Competitive market with established players",
      "Fundraising timeline is ambitious"
    ],
    recommendations: [
      "Strengthen financial projections with detailed unit economics",
      "Expand pilot program to demonstrate scalability",
      "Develop more detailed go-to-market strategy",
      "Build strategic advisor network for credibility"
    ],
    confidence: 'high'
  });

  useEffect(() => {
    // Simulate AI analysis
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);


  const practiceQuestions = [
    {
      category: "Market",
      question: "How do you plan to compete with established accounting software companies?",
      difficulty: "hard"
    },
    {
      category: "Traction",
      question: "What metrics prove that customers will pay for this solution?",
      difficulty: "medium"
    },
    {
      category: "Team",
      question: "Why is your team uniquely positioned to succeed in this space?",
      difficulty: "easy"
    }
  ];

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
              <Brain className="h-8 w-8 text-white" />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900">AI Analysis in Progress</h1>
              <p className="text-lg text-gray-600">
                Our AI is analyzing your startup across multiple dimensions
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Processing startup data...</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Market analysis...</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Team assessment...</span>
                <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Generating recommendations...</span>
                <div className="h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full" />
              </div>
            </div>

            <Progress value={75} className="h-3" />

            <p className="text-sm text-gray-500">
              This usually takes 2-3 minutes • Analyzing 50+ data points
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">AI Enhancement Station</div>
                <div className="text-xs text-gray-600">Optimize your pitch and materials</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">Analysis Complete</div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Q Score Header */}
        <Card className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold mb-2">{aiAnalysis.overallScore}/1000</div>
                <div className="text-lg font-medium opacity-90">Your Q Score</div>
                <div className="text-sm opacity-75">Top 15% of startups</div>
              </div>

              <div className="text-right space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm opacity-75">Confidence Level</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    aiAnalysis.confidence === 'high' ? 'bg-green-500/20 text-green-100' :
                    aiAnalysis.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-100' :
                    'bg-red-500/20 text-red-100'
                  }`}>
                    {aiAnalysis.confidence.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm opacity-75">Analysis based on 50+ factors</div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4 mt-6">
              {Object.entries(aiAnalysis.categoryScores).map(([category, score]) => (
                <div key={category} className="text-center">
                  <div className="text-2xl font-bold">{score}</div>
                  <div className="text-xs opacity-75 capitalize">{category}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border">
            <TabsTrigger value="analysis" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>AI Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Generated Materials</span>
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center space-x-2">
              <Play className="h-4 w-4" />
              <span>Practice Mode</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4" />
              <span>Recommendations</span>
            </TabsTrigger>
          </TabsList>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">

              {/* Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span>Key Strengths</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiAnalysis.strengths.map((strength, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-gray-700 text-sm">{strength}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-orange-700">
                    <AlertCircle className="h-5 w-5" />
                    <span>Areas for Improvement</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiAnalysis.weaknesses.map((weakness, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="h-2 w-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-gray-700 text-sm">{weakness}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(aiAnalysis.categoryScores).map(([category, score]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`h-4 w-4 rounded ${
                            category === 'market' ? 'bg-blue-500' :
                            category === 'team' ? 'bg-green-500' :
                            category === 'product' ? 'bg-purple-500' :
                            category === 'traction' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`} />
                          <span className="capitalize font-medium">{category}</span>
                        </div>
                        <span className="font-bold">{score}/100</span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generated Materials Tab */}
          <TabsContent value="materials" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">

              {/* One-Pager */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>One-Pager</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto" />
                      <div className="text-sm font-medium">TechCorp AI</div>
                      <div className="text-xs text-gray-500">Investment Summary</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span className="text-green-600 font-medium">Generated</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Quality</span>
                      <span className="text-blue-600 font-medium">Excellent</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Pitch Deck */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span>Pitch Deck</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg h-32 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <FileText className="h-8 w-8 text-purple-600 mx-auto" />
                      <div className="text-sm font-medium">12 Slides</div>
                      <div className="text-xs text-gray-600">Series A Ready</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Slides</span>
                      <span className="font-medium">12 slides</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Template</span>
                      <span className="font-medium">Series A</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-1" />
                      Customize
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Model */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    <span>Financial Model</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-lg h-32 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <BarChart3 className="h-8 w-8 text-green-600 mx-auto" />
                      <div className="text-sm font-medium">5-Year Model</div>
                      <div className="text-xs text-gray-600">Revenue & Costs</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Projections</span>
                      <span className="font-medium">5 years</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Scenarios</span>
                      <span className="font-medium">3 cases</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-1" />
                      Adjust
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Material Quality Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Material Quality Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Content Quality</h4>
                    <p className="text-sm text-gray-600">All materials meet VC standards</p>
                  </div>
                  <div className="text-center">
                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Target className="h-8 w-8 text-blue-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Investor-Ready</h4>
                    <p className="text-sm text-gray-600">Optimized for Series A pitch</p>
                  </div>
                  <div className="text-center">
                    <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Zap className="h-8 w-8 text-purple-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">AI Enhanced</h4>
                    <p className="text-sm text-gray-600">Powered by successful pitch data</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Practice Mode Tab */}
          <TabsContent value="practice" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Play className="h-5 w-5 text-green-600" />
                  <span>Mock Investor Q&A</span>
                </CardTitle>
                <p className="text-gray-600">Practice with AI-generated questions based on your profile</p>
              </CardHeader>
              <CardContent className="space-y-6">

                {practiceQuestions.map((q, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          q.category === 'Market' ? 'bg-blue-100 text-blue-700' :
                          q.category === 'Traction' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {q.category}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-900 mb-4">{q.question}</p>

                    <div className="flex space-x-2">
                      <Button size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Practice Answer
                      </Button>
                      <Button size="sm" variant="outline">
                        Get AI Tips
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="text-center">
                  <Button>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate More Questions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <div className="grid gap-6">
              {aiAnalysis.recommendations.map((recommendation, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 mb-3">{recommendation}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Priority:</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            index < 2 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {index < 2 ? 'High' : 'Medium'}
                          </span>
                          <span className="text-sm text-gray-500">Impact:</span>
                          <span className="text-sm font-medium text-green-600">+{10 + index * 5} Q points</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Next Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for Your Dashboard?</h3>
                <p className="text-gray-600">
                  Your Q Score analysis is complete. Start connecting with investors and tracking your progress.
                </p>
              </div>
              <Button size="lg" onClick={() => window.location.href = '/founder/dashboard'}>
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}