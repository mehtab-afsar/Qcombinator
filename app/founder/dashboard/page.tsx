"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Target,
  Brain,
  Eye,
  MessageSquare,
  Star,
  ArrowRight,
  Clock,
  FileText,
  BarChart3,
  Calendar,
  Filter,
  Search,
  Plus,
  Share2,
  Download,
  RefreshCw
} from "lucide-react";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import { AgentConversations } from "@/components/dashboard/AgentConversations";
import { WorkshopsPreview } from "@/components/dashboard/WorkshopsPreview";
import { InvestorNotifications } from "@/components/dashboard/InvestorNotifications";
import { generateRecommendations } from "@/lib/recommendation-engine";
import { getUpcomingWorkshops } from "@/lib/mock-data/workshops";
import { QScore } from "@/app/types/edge-alpha";
import { useAuth } from "@/contexts/AuthContext";
import { useQScore } from "@/contexts/QScoreContext";
import Link from "next/link";

export default function FounderDashboard() {
  const [_selectedTimeframe, _setSelectedTimeframe] = useState('7d');
  const { loading: authLoading } = useAuth();
  const { qScore: realQScore, loading: qScoreLoading } = useQScore();

  // Show loading state
  if (authLoading || qScoreLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show assessment prompt if no Q-Score yet
  if (!realQScore) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Complete Your Q-Score Assessment
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get your personalized Q-Score and unlock access to our investor marketplace, AI agents, and exclusive workshops.
            </p>
            <Link href="/founder/assessment">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                Start Assessment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert PRDQScore to QScore format for existing components
  const qScore: QScore = {
    overall: realQScore.overall,
    previousWeek: realQScore.overall,
    percentile: realQScore.percentile || 50,
    breakdown: {
      market: {
        score: realQScore.breakdown.market.score,
        change: realQScore.breakdown.market.change || 0,
        trend: realQScore.breakdown.market.trend || 'neutral'
      },
      product: {
        score: realQScore.breakdown.product.score,
        change: realQScore.breakdown.product.change || 0,
        trend: realQScore.breakdown.product.trend || 'neutral'
      },
      goToMarket: {
        score: realQScore.breakdown.goToMarket.score,
        change: realQScore.breakdown.goToMarket.change || 0,
        trend: realQScore.breakdown.goToMarket.trend || 'neutral'
      },
      financial: {
        score: realQScore.breakdown.financial.score,
        change: realQScore.breakdown.financial.change || 0,
        trend: realQScore.breakdown.financial.trend || 'neutral'
      },
      team: {
        score: realQScore.breakdown.team.score,
        change: realQScore.breakdown.team.change || 0,
        trend: realQScore.breakdown.team.trend || 'neutral'
      },
      traction: {
        score: realQScore.breakdown.traction.score,
        change: realQScore.breakdown.traction.change || 0,
        trend: realQScore.breakdown.traction.trend || 'neutral'
      }
    }
  };

  const metrics = {
    profileViews: { current: 0, previous: 0, change: 0 },
    investorInterest: { current: 0, previous: 0, change: 0 },
    messages: { current: 0, previous: 0, change: 0 },
    matches: { current: 0, previous: 0, change: 0 }
  };

  type ActivityItem = {
    id: number;
    icon: React.ComponentType<{ className?: string }>;
    investor: string;
    message: string;
    time: string;
    priority: 'high' | 'medium' | 'low';
    type: string;
  };

  const recentActivity: ActivityItem[] = [];

  // Sample investor match data - one example
  const investorMatches = [
    {
      id: 1,
      name: 'Benchmark Capital',
      logo: 'BC',
      matchScore: 95,
      thesisFit: 'Perfect fit for AI-powered enterprise tools',
      checkSize: '$5M-15M',
      stage: 'Series A-B',
      status: 'interested',
      lastActivity: '2 hours ago',
      portfolio: ['Uber', 'Discord', 'Snapchat'],
      response: 'high'
    }
  ];

  const actionItems = [
    {
      id: 1,
      task: 'Update financial projections',
      description: 'Add Q2 actuals and revise Q3-Q4 forecast',
      impact: '+15 Q points',
      priority: 'high',
      timeEstimate: '30 min',
      category: 'financials'
    },
    {
      id: 2,
      task: 'Respond to Benchmark Capital',
      description: 'They asked about your go-to-market strategy',
      impact: 'Potential meeting',
      priority: 'high',
      timeEstimate: '15 min',
      category: 'communication'
    },
    {
      id: 3,
      task: 'Add customer testimonials',
      description: 'Upload 2-3 customer success stories',
      impact: '+8 Q points',
      priority: 'medium',
      timeEstimate: '20 min',
      category: 'traction'
    },
    {
      id: 4,
      task: 'Complete team profiles',
      description: 'Add detailed profiles for CTO and VP Sales',
      impact: '+5 Q points',
      priority: 'medium',
      timeEstimate: '25 min',
      category: 'team'
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: 'Demo Day Practice',
      type: 'event',
      date: 'Today, 3:00 PM',
      description: 'Final rehearsal for TechStars Demo Day'
    },
    {
      id: 2,
      title: 'Investor Call',
      type: 'meeting',
      date: 'Tomorrow, 10:00 AM',
      description: 'Initial call with Acme Ventures partner'
    },
    {
      id: 3,
      title: 'Q Score Update',
      type: 'system',
      date: 'Friday, 9:00 AM',
      description: 'Weekly Q Score refresh with new data'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'interested': return 'bg-green-100 text-green-800 border-green-200';
      case 'reviewing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'new_match': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, Alex! 👋</h1>
          <p className="text-gray-600 mt-1">TechFlow AI • Series A Ready • Your funding journey continues</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share Profile
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Update Profile
          </Button>
        </div>
      </div>

      {/* Q Score Hero Card */}
      <Card className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-5xl font-bold">{qScore.overall}</div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">+{(qScore.overall || 0) - (qScore.previousWeek || 0)} this week</span>
                  </div>
                  <div className="text-sm opacity-75">Your Q Score</div>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div>
                  <div className="text-lg font-medium">Top {100 - (qScore.percentile || 0)}%</div>
                  <div className="text-sm opacity-75">of all startups</div>
                </div>
                <div>
                  <div className="text-lg font-medium">Series A Ready</div>
                  <div className="text-sm opacity-75">Investor readiness</div>
                </div>
              </div>
            </div>

            <div className="text-right space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                {Object.entries(qScore.breakdown).map(([key, data]) => {
                  const displayName = key === 'goToMarket' ? 'GTM' : key;
                  return (
                    <div key={key} className="bg-white/10 rounded-lg p-3">
                      <div className="text-lg font-bold">{data.score}</div>
                      <div className="text-xs opacity-75 capitalize">{displayName}</div>
                      <div className={`text-xs mt-1 ${data.trend === 'up' ? 'text-green-200' : data.trend === 'down' ? 'text-red-200' : 'text-gray-200'}`}>
                        {(data.change || 0) > 0 ? '+' : ''}{data.change || 0}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                View Detailed Breakdown
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Profile Views</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.profileViews.current}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+{metrics.profileViews.change}%</span>
              <span className="text-gray-500 ml-1">from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Investor Interest</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.investorInterest.current}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+{metrics.investorInterest.change}%</span>
              <span className="text-gray-500 ml-1">active signals</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Messages</p>
                <p className="text-2xl font-bold text-green-600">{metrics.messages.current}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+{metrics.messages.change}%</span>
              <span className="text-gray-500 ml-1">new conversations</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Matches</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.matches.current}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+{metrics.matches.change}%</span>
              <span className="text-gray-500 ml-1">new matches</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW: Recommended Actions - Top 3 */}
      <RecommendedActions recommendations={generateRecommendations(qScore)} />

      {/* NEW: Agent Conversations Preview */}
      <AgentConversations />

      {/* NEW: Upcoming Workshops Preview */}
      <WorkshopsPreview workshops={getUpcomingWorkshops()} />

      {/* NEW: Investor Match Notifications */}
      <InvestorNotifications />

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white border">
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="matches">Investor Matches</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Activity Feed Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Activity</CardTitle>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-start space-x-4 p-4 rounded-lg border-l-4 ${
                        activity.priority === 'high' ? 'border-red-500 bg-red-50' :
                        activity.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-green-500 bg-green-50'
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        activity.priority === 'high' ? 'bg-red-100' :
                        activity.priority === 'medium' ? 'bg-yellow-100' :
                        'bg-green-100'
                      }`}>
                        <activity.icon className={`h-5 w-5 ${
                          activity.priority === 'high' ? 'text-red-600' :
                          activity.priority === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{activity.investor}</p>
                            <p className="text-sm text-gray-600">{activity.message}</p>
                          </div>
                          <span className="text-xs text-gray-500">{activity.time}</span>
                        </div>
                        {activity.type === 'interest' && (
                          <Button size="sm" className="mt-2">
                            View Profile
                          </Button>
                        )}
                        {activity.type === 'message' && (
                          <Button size="sm" className="mt-2">
                            Reply
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Events */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Upcoming</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          event.type === 'meeting' ? 'bg-blue-100 text-blue-700' :
                          event.type === 'event' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{event.date}</p>
                      <p className="text-xs text-gray-500">{event.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Investor Matches Tab */}
        <TabsContent value="matches" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Top Investor Matches</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {investorMatches.map((investor) => (
                <div key={investor.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">{investor.logo}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{investor.name}</h3>
                        <p className="text-sm text-gray-600">{investor.stage} • {investor.checkSize}</p>
                        <p className="text-sm text-gray-500">Last active: {investor.lastActivity}</p>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="text-2xl font-bold text-green-600">{investor.matchScore}%</div>
                      <div className="text-xs text-gray-500">Match Score</div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(investor.status)}`}>
                        {investor.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Why they&apos;re a great fit:</p>
                      <p className="text-sm text-gray-600">{investor.thesisFit}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-900">Notable Portfolio:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {investor.portfolio.map((company, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {company}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Response likelihood:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          investor.response === 'high' ? 'bg-green-100 text-green-700' :
                          investor.response === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {investor.response}
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                        <Button size="sm">
                          Connect
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Actions to Boost Your Q Score</CardTitle>
              <p className="text-gray-600">Complete these tasks to improve your startup profile and attract more investors</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {actionItems.map((item) => (
                <div key={item.id} className={`border-l-4 rounded-lg p-4 ${getPriorityColor(item.priority)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{item.task}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.priority === 'high' ? 'bg-red-100 text-red-700' :
                          item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {item.priority}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {item.impact}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{item.timeEstimate}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="capitalize">{item.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Skip
                      </Button>
                      <Button size="sm">
                        Start Task
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Q Score Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Q Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <BarChart3 className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-gray-600">Q Score chart over time</p>
                    <p className="text-sm text-gray-500">Shows 30-day trend with key events</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Investor Engagement */}
            <Card>
              <CardHeader>
                <CardTitle>Investor Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <TrendingUp className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-gray-600">Profile views & interest over time</p>
                    <p className="text-sm text-gray-500">Track investor activity patterns</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-all">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Update Pitch Deck</h3>
            <p className="text-sm text-gray-600 mb-4">Keep investors engaged with your latest story</p>
            <Button size="sm" className="w-full">
              Upload New Version
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Pitch Coach</h3>
            <p className="text-sm text-gray-600 mb-4">Practice with our AI for upcoming meetings</p>
            <Button size="sm" variant="outline" className="w-full">
              Start Practice Session
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Message Investors</h3>
            <p className="text-sm text-gray-600 mb-4">Respond to interested investors quickly</p>
            <Button size="sm" variant="outline" className="w-full">
              View Messages ({metrics.messages.current})
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}