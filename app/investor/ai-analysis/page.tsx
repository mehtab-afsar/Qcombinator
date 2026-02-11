"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  Users,
  Zap,
  LineChart,
  BarChart3,
  PieChart,
  Activity,
  Sparkles,
  ChevronRight,
  Download
} from "lucide-react";

interface AIInsight {
  id: string;
  type: "opportunity" | "risk" | "trend" | "recommendation";
  title: string;
  description: string;
  confidence: number;
  impact: "high" | "medium" | "low";
  category: string;
  timestamp: string;
}

interface CompanyAnalysis {
  id: string;
  name: string;
  qScore: number;
  overallRating: number;
  strengths: string[];
  risks: string[];
  marketSize: string;
  competitivePosition: string;
  founderScore: number;
  teamScore: number;
  tractionScore: number;
  marketScore: number;
}

const mockInsights: AIInsight[] = [
  {
    id: "1",
    type: "opportunity",
    title: "High-growth AI/ML Sector Opportunity",
    description: "3 new startups in your target AI/ML sector with 90%+ match scores have entered the pipeline in the last 48 hours. Market timing is optimal with recent enterprise adoption trends.",
    confidence: 94,
    impact: "high",
    category: "Market Intelligence",
    timestamp: "2 hours ago"
  },
  {
    id: "2",
    type: "risk",
    title: "Market Saturation Alert: FinTech",
    description: "Your FinTech portfolio concentration (35%) exceeds recommended diversification threshold. Consider rebalancing or adjusting deal flow filters.",
    confidence: 88,
    impact: "medium",
    category: "Portfolio Risk",
    timestamp: "5 hours ago"
  },
  {
    id: "3",
    type: "trend",
    title: "Healthcare Tech Momentum Building",
    description: "Healthcare sector showing 180% increase in high-quality deal flow. Average Q scores increased from 742 to 819 in last quarter.",
    confidence: 91,
    impact: "high",
    category: "Sector Trends",
    timestamp: "1 day ago"
  },
  {
    id: "4",
    type: "recommendation",
    title: "Portfolio Company Follow-on Opportunity",
    description: "TechFlow AI (Portfolio) shows strong signals for Series B readiness. Metrics exceed projected targets by 40%. Consider pro-rata follow-on.",
    confidence: 96,
    impact: "high",
    category: "Portfolio Insights",
    timestamp: "1 day ago"
  },
  {
    id: "5",
    type: "opportunity",
    title: "Undervalued CleanTech Opportunity",
    description: "GreenEnergy Labs valuation 30% below market comparables with superior founder profile and traction metrics. Limited time window.",
    confidence: 87,
    impact: "medium",
    category: "Valuation Analysis",
    timestamp: "2 days ago"
  }
];

const mockCompanyAnalysis: CompanyAnalysis = {
  id: "1",
  name: "TechFlow AI",
  qScore: 847,
  overallRating: 8.9,
  strengths: [
    "Exceptional founding team with deep domain expertise (Ex-Google, Stanford)",
    "Strong product-market fit evidenced by 180% YoY growth",
    "High customer retention rate (94%) and NPS score (72)",
    "Clear competitive moat through proprietary ML algorithms",
    "Efficient capital deployment with strong unit economics"
  ],
  risks: [
    "Customer concentration: Top 3 clients represent 45% of revenue",
    "Competitive pressure from well-funded incumbents",
    "Key person dependency on technical co-founder",
    "Limited geographic diversification (80% revenue from US)"
  ],
  marketSize: "$45B TAM, $8.5B SAM, Growing at 32% CAGR",
  competitivePosition: "Top 3 player in mid-market segment with defensible IP",
  founderScore: 9.2,
  teamScore: 8.7,
  tractionScore: 8.9,
  marketScore: 8.4
};

export default function AIAnalysisPage() {
  const [selectedTab, setSelectedTab] = useState("insights");

  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "opportunity":
        return <Target className="w-5 h-5 text-green-600" />;
      case "risk":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "trend":
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case "recommendation":
        return <Sparkles className="w-5 h-5 text-purple-600" />;
    }
  };

  const getImpactColor = (impact: AIInsight["impact"]) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Intelligence Hub</h1>
          <p className="text-gray-600 mt-1">Deep insights powered by advanced machine learning</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Brain className="w-4 h-4 mr-2" />
            Generate Analysis
          </Button>
        </div>
      </div>

      {/* AI Insights Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Opportunities</p>
                <p className="text-2xl font-bold text-green-700">
                  {mockInsights.filter(i => i.type === "opportunity").length}
                </p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Risk Alerts</p>
                <p className="text-2xl font-bold text-orange-700">
                  {mockInsights.filter(i => i.type === "risk").length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trends</p>
                <p className="text-2xl font-bold text-blue-700">
                  {mockInsights.filter(i => i.type === "trend").length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recommendations</p>
                <p className="text-2xl font-bold text-purple-700">
                  {mockInsights.filter(i => i.type === "recommendation").length}
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="deep-dive">Deep Dive Analysis</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="comparables">Comparables</TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2 text-blue-600" />
                Latest Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockInsights.map((insight) => (
                <Card key={insight.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          {getInsightIcon(insight.type)}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg text-gray-900">{insight.title}</h3>
                            <Badge variant="outline" className={getImpactColor(insight.impact)}>
                              {insight.impact.toUpperCase()} IMPACT
                            </Badge>
                          </div>

                          <p className="text-gray-600">{insight.description}</p>

                          <div className="flex items-center space-x-6 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">Confidence:</span>
                              <div className="flex items-center space-x-2">
                                <Progress value={insight.confidence} className="w-24 h-2" />
                                <span className="font-semibold text-gray-900">{insight.confidence}%</span>
                              </div>
                            </div>

                            <Badge variant="secondary">{insight.category}</Badge>

                            <span className="text-gray-400">{insight.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deep Dive Analysis Tab */}
        <TabsContent value="deep-dive" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Comprehensive Company Analysis: {mockCompanyAnalysis.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-700 text-lg px-3 py-1">
                    Q Score: {mockCompanyAnalysis.qScore}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 text-lg px-3 py-1">
                    Rating: {mockCompanyAnalysis.overallRating}/10
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Score Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-2 border-blue-100">
                  <CardContent className="p-6 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="text-3xl font-bold text-blue-600">{mockCompanyAnalysis.founderScore}</div>
                    <div className="text-sm text-gray-600 mt-1">Founder</div>
                    <Progress value={mockCompanyAnalysis.founderScore * 10} className="mt-3" />
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-100">
                  <CardContent className="p-6 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <div className="text-3xl font-bold text-purple-600">{mockCompanyAnalysis.teamScore}</div>
                    <div className="text-sm text-gray-600 mt-1">Team</div>
                    <Progress value={mockCompanyAnalysis.teamScore * 10} className="mt-3" />
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-100">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <div className="text-3xl font-bold text-green-600">{mockCompanyAnalysis.tractionScore}</div>
                    <div className="text-sm text-gray-600 mt-1">Traction</div>
                    <Progress value={mockCompanyAnalysis.tractionScore * 10} className="mt-3" />
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-100">
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                    <div className="text-3xl font-bold text-orange-600">{mockCompanyAnalysis.marketScore}</div>
                    <div className="text-sm text-gray-600 mt-1">Market</div>
                    <Progress value={mockCompanyAnalysis.marketScore * 10} className="mt-3" />
                  </CardContent>
                </Card>
              </div>

              {/* Strengths & Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-green-50/50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-800">
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Key Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockCompanyAnalysis.strengths.map((strength, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{strength}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-orange-50/50 border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-orange-800">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Risk Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockCompanyAnalysis.risks.map((risk, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{risk}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Market & Position */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChart className="w-5 h-5 mr-2 text-blue-600" />
                      Market Opportunity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{mockCompanyAnalysis.marketSize}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-purple-600" />
                      Competitive Position
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{mockCompanyAnalysis.competitivePosition}</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                AI-Powered Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <LineChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Predictive Analytics Coming Soon</p>
                <p className="text-sm">Advanced forecasting models are being calibrated with your portfolio data</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparables Tab */}
        <TabsContent value="comparables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
                Market Comparables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Comparable Analysis</p>
                <p className="text-sm">Benchmarking against similar companies in sector and stage</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
