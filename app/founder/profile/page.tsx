'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  Users,
  TrendingUp,
  Target,
  Star,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  Share,
  Download,
  Zap,
  Brain,
  Award
} from 'lucide-react'

export default function ProfileBuilder() {
  const [profileCompletion, setProfileCompletion] = useState(87)

  const qScoreBreakdown = [
    { category: 'Team', score: 92, maxScore: 100, color: 'bg-blue-500' },
    { category: 'Market', score: 85, maxScore: 100, color: 'bg-green-500' },
    { category: 'Product', score: 89, maxScore: 100, color: 'bg-purple-500' },
    { category: 'Traction', score: 91, maxScore: 100, color: 'bg-yellow-500' },
    { category: 'Financials', score: 78, maxScore: 100, color: 'bg-red-500' }
  ]

  const overallQScore = Math.round(qScoreBreakdown.reduce((acc, item) => acc + item.score, 0) / qScoreBreakdown.length)

  const profileSections = [
    { name: 'Company Basics', completed: true, score: 95 },
    { name: 'Team Information', completed: true, score: 92 },
    { name: 'Product Overview', completed: true, score: 89 },
    { name: 'Market Analysis', completed: false, score: 65 },
    { name: 'Financial Projections', completed: false, score: 45 },
    { name: 'Traction Metrics', completed: true, score: 88 },
    { name: 'Funding History', completed: true, score: 90 }
  ]

  const recommendations = [
    {
      type: 'missing',
      title: 'Complete Financial Projections',
      description: 'Add 3-year financial forecasts to boost your Q Score by up to 15 points',
      impact: '+15 points',
      priority: 'high'
    },
    {
      type: 'improve',
      title: 'Enhance Market Analysis',
      description: 'Include competitive landscape analysis and TAM sizing',
      impact: '+8 points',
      priority: 'medium'
    },
    {
      type: 'add',
      title: 'Upload Pitch Deck',
      description: 'Add your latest pitch deck for investor preview',
      impact: '+5 points',
      priority: 'low'
    }
  ]

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile Builder</h1>
            <p className="text-gray-600">Build a comprehensive profile that attracts the right investors</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Q Score Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="w-6 h-6 text-blue-600 mr-2" />
                    Your Q Score
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {overallQScore}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {qScoreBreakdown.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <div className="absolute inset-0 rounded-full bg-gray-200"></div>
                        <div
                          className={`absolute inset-0 rounded-full ${item.color}`}
                          style={{
                            clipPath: `polygon(50% 50%, 50% 0%, ${50 + (item.score/2)}% 0%, ${50 + (item.score/2)}% ${50 - (item.score/2)}%, 50% 50%)`
                          }}
                        ></div>
                        <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                          <span className="text-sm font-bold">{item.score}</span>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-gray-700">{item.category}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{overallQScore}/100</div>
                  <div className="text-gray-600">Investment Readiness Score</div>
                  <div className="text-sm text-green-600 mt-1">Top 15% of startups</div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Sections */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Completion</CardTitle>
                <div className="flex items-center space-x-2">
                  <Progress value={profileCompletion} className="flex-1" />
                  <span className="text-sm font-medium">{profileCompletion}%</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profileSections.map((section, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {section.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{section.name}</div>
                          <div className="text-sm text-gray-500">Score: {section.score}/100</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4 mr-1" />
                        {section.completed ? 'Edit' : 'Complete'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Investor Views</span>
                  <span className="font-bold text-blue-600">247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Interest Signals</span>
                  <span className="font-bold text-green-600">18</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Match Score Avg</span>
                  <span className="font-bold text-purple-600">89%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Profile Rank</span>
                  <span className="font-bold text-orange-600">Top 15%</span>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-600" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{rec.title}</h4>
                        <Badge
                          variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {rec.impact}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{rec.description}</p>
                      <Button size="sm" className="w-full text-xs">
                        {rec.type === 'missing' ? 'Complete' : rec.type === 'improve' ? 'Improve' : 'Add'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievement Badges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-600" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-xs font-medium">Profile Complete</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-xs font-medium">High Traction</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <div className="text-xs font-medium">Clear Vision</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <Users className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                    <div className="text-xs font-medium">Strong Team</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Sections */}
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Company Name</label>
                      <div className="mt-1 text-gray-900">TechFlow Solutions</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Industry</label>
                      <div className="mt-1 text-gray-900">AI/ML, Enterprise Software</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Founded</label>
                      <div className="mt-1 text-gray-900">2022</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Location</label>
                      <div className="mt-1 text-gray-900">San Francisco, CA</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Stage</label>
                      <div className="mt-1 text-gray-900">Series A</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Website</label>
                      <div className="mt-1 text-blue-600">www.techflow.com</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <Button>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Company Info
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would follow similar pattern */}
        </Tabs>
      </div>
    </div>
  )
}