'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Target,
  MessageCircle,
  BookOpen,
  ArrowRight,
  Lock,
  Unlock,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DimensionScore {
  name: string;
  score: number;
  weight: number;
  icon: string;
  color: string;
  recommendations: string[];
  agentId?: string;
  agentName?: string;
}

export default function ImproveQScorePage() {
  const router = useRouter();
  const [currentScore, setCurrentScore] = useState(58); // Mock - will fetch from API
  const targetScore = 65;
  const pointsNeeded = targetScore - currentScore;

  const dimensions: DimensionScore[] = [
    {
      name: 'Go-to-Market',
      score: 35,
      weight: 17,
      icon: '🚀',
      color: 'orange',
      recommendations: [
        'Define your ICP (Ideal Customer Profile) clearly',
        'Test at least 2-3 acquisition channels',
        'Document your messaging and value proposition',
        'Calculate your Customer Acquisition Cost (CAC)'
      ],
      agentId: 'patel',
      agentName: 'Patel'
    },
    {
      name: 'Financial',
      score: 42,
      weight: 18,
      icon: '💰',
      color: 'green',
      recommendations: [
        'Build a basic financial model with revenue projections',
        'Calculate your unit economics (LTV, CAC, margins)',
        'Track your monthly burn rate and runway',
        'Document key assumptions behind your projections'
      ],
      agentId: 'felix',
      agentName: 'Felix'
    },
    {
      name: 'Product',
      score: 58,
      weight: 18,
      icon: '⚡',
      color: 'purple',
      recommendations: [
        'Get more customer validation and testimonials',
        'Increase your iteration speed (weekly builds)',
        'Document customer feedback and learnings',
        'Show clear product-market fit signals'
      ],
      agentId: 'nova',
      agentName: 'Nova'
    },
    {
      name: 'Market',
      score: 65,
      weight: 20,
      icon: '🎯',
      color: 'blue',
      recommendations: [
        'Refine your TAM/SAM/SOM calculations',
        'Research market growth trends',
        'Identify key competitors and differentiators',
        'Validate market timing and trends'
      ],
      agentId: 'atlas',
      agentName: 'Atlas'
    },
    {
      name: 'Team',
      score: 72,
      weight: 15,
      icon: '👥',
      color: 'indigo',
      recommendations: [
        'Demonstrate deep domain expertise',
        'Show complementary skills across team',
        'Document your resilience and adaptability',
        'Highlight key advisor relationships'
      ],
      agentId: 'harper',
      agentName: 'Harper'
    },
    {
      name: 'Traction',
      score: 48,
      weight: 12,
      icon: '📈',
      color: 'pink',
      recommendations: [
        'Increase number of customer conversations',
        'Get more paying customers or LOIs',
        'Show consistent growth momentum',
        'Document key traction milestones'
      ],
      agentId: 'susi',
      agentName: 'Susi'
    }
  ];

  // Sort by lowest score first
  const sortedDimensions = [...dimensions].sort((a, b) => a.score - b.score);
  const lowestThree = sortedDimensions.slice(0, 3);

  const getColorClasses = (color: string) => {
    const colors = {
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const calculatePotentialScore = (dimension: DimensionScore) => {
    // Improving a dimension from current score to 80 (good target)
    const improvement = (80 - dimension.score) * (dimension.weight / 100);
    return Math.round(improvement);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Improve Your Q-Score</h1>
            <p className="text-gray-600 mt-1">Unlock the investor marketplace at Q-Score 65+</p>
          </div>
          <Link href="/founder/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Current Status Card */}
        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="h-6 w-6 text-yellow-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Marketplace Access Locked
                </h3>
                <p className="text-yellow-800 mb-4">
                  Your current Q-Score is <span className="font-bold">{currentScore}/100</span>.
                  You need <span className="font-bold">{pointsNeeded} more points</span> to reach the minimum
                  score of 65 and access the investor marketplace.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-yellow-800">
                    <span>Progress to marketplace access</span>
                    <span className="font-medium">{currentScore}/65</span>
                  </div>
                  <Progress value={(currentScore / 65) * 100} className="h-3" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Priority Actions */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Top 3 Priority Actions
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {lowestThree.map((dimension, index) => {
              const potentialGain = calculatePotentialScore(dimension);
              return (
                <Card key={dimension.name} className="border-2 hover:border-blue-300 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{dimension.icon}</span>
                        <CardTitle className="text-lg">{dimension.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Current Score</span>
                        <span className="font-bold text-gray-900">{dimension.score}/100</span>
                      </div>
                      <Progress value={dimension.score} className="h-2" />
                    </div>

                    <div className={`p-3 rounded-lg border ${getColorClasses(dimension.color)}`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-medium text-sm">Potential Impact</span>
                      </div>
                      <p className="text-sm">
                        Improving this could add <span className="font-bold">+{potentialGain} points</span> to your overall score
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center">
                        <Lightbulb className="h-4 w-4 mr-1 text-yellow-600" />
                        Quick Wins
                      </h4>
                      <ul className="space-y-1.5">
                        {dimension.recommendations.slice(0, 2).map((rec, idx) => (
                          <li key={idx} className="text-xs text-gray-700 flex items-start">
                            <CheckCircle2 className="h-3 w-3 mr-1.5 mt-0.5 text-green-600 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {dimension.agentId && (
                      <Link href={`/founder/agents/${dimension.agentId}`}>
                        <Button size="sm" className="w-full">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Talk to {dimension.agentName}
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* All Dimensions Breakdown */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">All Q-Score Dimensions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {sortedDimensions.map((dimension) => (
              <Card key={dimension.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{dimension.icon}</span>
                      <CardTitle className="text-base">{dimension.name}</CardTitle>
                    </div>
                    <Badge variant="outline">{dimension.weight}% weight</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Score</span>
                      <span className={`font-bold ${dimension.score < 50 ? 'text-red-600' : dimension.score < 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {dimension.score}/100
                      </span>
                    </div>
                    <Progress value={dimension.score} className="h-2" />
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">How to Improve:</h4>
                    <ul className="space-y-1">
                      {dimension.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-xs text-gray-700 flex items-start">
                          <span className="mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {dimension.agentId && (
                    <Link href={`/founder/agents/${dimension.agentId}`}>
                      <Button size="sm" variant="outline" className="w-full">
                        Get Help from {dimension.agentName}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Additional Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Link href="/founder/academy">
                <Button variant="outline" className="w-full justify-start">
                  <span className="mr-2">🎓</span>
                  Attend Academy Workshops
                </Button>
              </Link>
              <Link href="/founder/agents">
                <Button variant="outline" className="w-full justify-start">
                  <span className="mr-2">🤖</span>
                  Chat with AI Agents
                </Button>
              </Link>
              <Link href="/founder/assessment">
                <Button variant="outline" className="w-full justify-start">
                  <span className="mr-2">📋</span>
                  Retake Assessment
                </Button>
              </Link>
              <Link href="/founder/dashboard">
                <Button variant="outline" className="w-full justify-start">
                  <span className="mr-2">📊</span>
                  View Full Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Success Preview */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Unlock className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  What You'll Unlock at Q-Score 65+
                </h3>
                <ul className="space-y-2 text-green-800">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Access to 500+ vetted investors
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    AI-powered investor matching
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Direct connection requests
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Priority workshop access
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Investor profile visibility
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
