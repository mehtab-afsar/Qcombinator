'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  MapPin,
  Globe,
  Heart,
  Share,
  MessageCircle,
  Download,
  ExternalLink,
  Building2,
  Target,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  Shield,
  Award,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import Link from 'next/link'

interface StartupData {
  id: string
  name: string
  tagline: string
  description: string
  logo: string
  website: string
  founded: string
  location: string
  stage: string
  sector: string
  qScore: number
  matchScore: number

  founder: {
    name: string
    title: string
    avatar: string
    background: string
    linkedin: string
    previousExperience: string[]
  }

  team: {
    size: number
    keyMembers: Array<{
      name: string
      role: string
      avatar: string
      background: string
    }>
  }

  financials: {
    revenue: string
    growth: string
    runway: string
    burnRate: string
    customers: number
    cac: string
    ltv: string
    grossMargin: string
  }

  funding: {
    totalRaised: string
    currentRound: string
    seeking: string
    valuation: string
    investors: string[]
    useOfFunds: Array<{
      category: string
      percentage: number
    }>
  }

  traction: {
    highlights: string[]
    milestones: Array<{
      date: string
      description: string
      type: 'revenue' | 'product' | 'team' | 'partnership'
    }>
  }

  market: {
    size: string
    growth: string
    competition: Array<{
      name: string
      description: string
      funding: string
    }>
  }

  documents: Array<{
    name: string
    type: string
    size: string
    lastUpdated: string
  }>

  aiAnalysis: {
    strengths: string[]
    risks: string[]
    recommendations: string[]
  }
}

const mockStartup: StartupData = {
  id: '1',
  name: 'TechFlow AI',
  tagline: 'AI-powered workflow automation for enterprise teams',
  description: 'TechFlow AI revolutionizes enterprise productivity by automating complex workflows using advanced AI. Our platform integrates seamlessly with existing tools and can reduce manual work by up to 70% while improving accuracy and compliance.',
  logo: '/api/placeholder/80/80',
  website: 'https://techflow.ai',
  founded: '2022',
  location: 'San Francisco, CA',
  stage: 'Series A',
  sector: 'AI/ML',
  qScore: 847,
  matchScore: 94,

  founder: {
    name: 'Sarah Chen',
    title: 'CEO & Co-founder',
    avatar: '/api/placeholder/60/60',
    background: 'Ex-Google AI Research, Stanford CS PhD',
    linkedin: 'https://linkedin.com/in/sarahchen',
    previousExperience: [
      'Lead AI Researcher at Google (3 years)',
      'Senior ML Engineer at DeepMind (2 years)',
      'PhD in Computer Science, Stanford'
    ]
  },

  team: {
    size: 12,
    keyMembers: [
      {
        name: 'David Kim',
        role: 'CTO & Co-founder',
        avatar: '/api/placeholder/50/50',
        background: 'Ex-Uber Engineering, MIT'
      },
      {
        name: 'Maria Rodriguez',
        role: 'VP of Sales',
        avatar: '/api/placeholder/50/50',
        background: 'Ex-Salesforce, 8 years enterprise sales'
      },
      {
        name: 'Alex Thompson',
        role: 'Head of Product',
        avatar: '/api/placeholder/50/50',
        background: 'Ex-Figma, Stanford MBA'
      }
    ]
  },

  financials: {
    revenue: '$2.1M ARR',
    growth: '+180% YoY',
    runway: '18 months',
    burnRate: '$85K/month',
    customers: 47,
    cac: '$2,400',
    ltv: '$24,000',
    grossMargin: '85%'
  },

  funding: {
    totalRaised: '$3.2M',
    currentRound: 'Series A',
    seeking: '$5M',
    valuation: '$25M pre-money',
    investors: ['Andreessen Horowitz', 'First Round Capital', 'Y Combinator'],
    useOfFunds: [
      { category: 'Engineering & Product', percentage: 60 },
      { category: 'Sales & Marketing', percentage: 25 },
      { category: 'Operations', percentage: 10 },
      { category: 'Working Capital', percentage: 5 }
    ]
  },

  traction: {
    highlights: [
      '$2.1M ARR with 180% YoY growth',
      '47 enterprise customers including Fortune 500 companies',
      '95% customer retention rate',
      'Average 70% reduction in manual work for customers'
    ],
    milestones: [
      {
        date: '2024-01',
        description: 'Reached $2M ARR milestone',
        type: 'revenue'
      },
      {
        date: '2023-12',
        description: 'Launched AI Workflow Builder 2.0',
        type: 'product'
      },
      {
        date: '2023-11',
        description: 'Partnership with Microsoft Azure',
        type: 'partnership'
      },
      {
        date: '2023-10',
        description: 'Hired VP of Sales from Salesforce',
        type: 'team'
      }
    ]
  },

  market: {
    size: '$12.8B TAM',
    growth: '23% CAGR',
    competition: [
      {
        name: 'Zapier',
        description: 'Workflow automation platform',
        funding: '$140M raised'
      },
      {
        name: 'UiPath',
        description: 'RPA and automation platform',
        funding: 'Public company'
      },
      {
        name: 'Automation Anywhere',
        description: 'Enterprise automation platform',
        funding: '$840M raised'
      }
    ]
  },

  documents: [
    {
      name: 'Pitch Deck - Series A',
      type: 'PDF',
      size: '12.4 MB',
      lastUpdated: '2024-01-15'
    },
    {
      name: 'Financial Model',
      type: 'XLSX',
      size: '2.8 MB',
      lastUpdated: '2024-01-10'
    },
    {
      name: 'Product Demo Video',
      type: 'MP4',
      size: '45.2 MB',
      lastUpdated: '2024-01-08'
    },
    {
      name: 'Customer References',
      type: 'PDF',
      size: '1.2 MB',
      lastUpdated: '2024-01-05'
    }
  ],

  aiAnalysis: {
    strengths: [
      'Strong technical team with AI expertise from top companies',
      'Impressive revenue growth (180% YoY) with healthy unit economics',
      'Large addressable market with clear differentiation',
      'High customer retention and proven product-market fit'
    ],
    risks: [
      'Competitive market with well-funded incumbents',
      'Dependency on key founders for technical vision',
      'Need to scale sales team for enterprise market',
      'Regulatory risks in AI automation space'
    ],
    recommendations: [
      'Strong investment opportunity with proven traction',
      'Consider co-investing with existing top-tier VCs',
      'Due diligence focus on technical moat and scalability',
      'Negotiate board seat given the growth stage'
    ]
  }
}

export default function StartupDeepDive({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isSaved, setIsSaved] = useState(false)
  const startup = mockStartup

  const qScoreBreakdown = [
    { category: 'Team', score: 92, weight: '30%' },
    { category: 'Market', score: 85, weight: '25%' },
    { category: 'Traction', score: 88, weight: '20%' },
    { category: 'Product', score: 90, weight: '15%' },
    { category: 'Financials', score: 82, weight: '10%' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/investor/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Pipeline
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={startup.logo} alt={startup.name} />
                  <AvatarFallback>{startup.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{startup.name}</h1>
                  <p className="text-gray-600">{startup.tagline}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <Badge variant="secondary">{startup.stage}</Badge>
                    <Badge variant="secondary">{startup.sector}</Badge>
                    <span className="text-sm text-gray-500 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {startup.location}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{startup.qScore}</div>
                <div className="text-sm text-gray-500">Q Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{startup.matchScore}%</div>
                <div className="text-sm text-gray-500">Match</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="flex space-x-2">
                <Button
                  variant={isSaved ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSaved(!isSaved)}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button size="sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 leading-relaxed">{startup.description}</p>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div>
                        <div className="text-sm text-gray-500">Founded</div>
                        <div className="font-medium">{startup.founded}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Website</div>
                        <a href={startup.website} target="_blank" className="font-medium text-blue-600 hover:underline">
                          {startup.website}
                        </a>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Team Size</div>
                        <div className="font-medium">{startup.team.size} employees</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Funding Stage</div>
                        <div className="font-medium">{startup.stage}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{startup.financials.revenue}</div>
                        <div className="text-sm text-gray-500">Annual Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{startup.financials.growth}</div>
                        <div className="text-sm text-gray-500">YoY Growth</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{startup.financials.customers}</div>
                        <div className="text-sm text-gray-500">Customers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{startup.financials.grossMargin}</div>
                        <div className="text-sm text-gray-500">Gross Margin</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Traction Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {startup.traction.highlights.map((highlight, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Q Score Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {qScoreBreakdown.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.category}</span>
                          <span className="font-medium">{item.score}/100</span>
                        </div>
                        <Progress value={item.score} className="h-2" />
                        <div className="text-xs text-gray-500">Weight: {item.weight}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Funding Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500">Current Round</div>
                      <div className="font-medium">{startup.funding.currentRound}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Seeking</div>
                      <div className="font-medium">{startup.funding.seeking}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Valuation</div>
                      <div className="font-medium">{startup.funding.valuation}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Previous Investors</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {startup.funding.investors.map((investor, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {investor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Use of Funds</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {startup.funding.useOfFunds.map((item, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{item.category}</span>
                            <span className="font-medium">{item.percentage}%</span>
                          </div>
                          <Progress value={item.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Other tabs would be implemented similarly with detailed content */}
          <TabsContent value="financials" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">ARR</div>
                      <div className="text-2xl font-bold">{startup.financials.revenue}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Growth Rate</div>
                      <div className="text-2xl font-bold text-green-600">{startup.financials.growth}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">CAC</div>
                      <div className="text-lg font-medium">{startup.financials.cac}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">LTV</div>
                      <div className="text-lg font-medium">{startup.financials.ltv}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Burn & Runway</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500">Monthly Burn Rate</div>
                      <div className="text-2xl font-bold text-red-600">{startup.financials.burnRate}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Runway</div>
                      <div className="text-2xl font-bold">{startup.financials.runway}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Gross Margin</div>
                      <div className="text-lg font-medium text-green-600">{startup.financials.grossMargin}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Leadership Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Founder */}
                    <div className="flex items-start space-x-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={startup.founder.avatar} />
                        <AvatarFallback>{startup.founder.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{startup.founder.name}</h3>
                        <p className="text-blue-600 font-medium">{startup.founder.title}</p>
                        <p className="text-gray-600 text-sm mt-1">{startup.founder.background}</p>
                        <div className="mt-2">
                          <div className="text-sm font-medium mb-1">Previous Experience:</div>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {startup.founder.previousExperience.map((exp, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {exp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Key Team Members */}
                    <div className="space-y-4">
                      {startup.team.keyMembers.map((member, index) => (
                        <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium">{member.name}</h4>
                            <p className="text-gray-600 text-sm">{member.role}</p>
                            <p className="text-gray-500 text-xs mt-1">{member.background}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Total Team Size</div>
                    <div className="text-2xl font-bold">{startup.team.size}</div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Department Breakdown</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Engineering</span>
                        <span>7 (58%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sales & Marketing</span>
                        <span>3 (25%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Operations</span>
                        <span>2 (17%)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="market" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Market Opportunity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500">Total Addressable Market</div>
                      <div className="text-3xl font-bold text-blue-600">{startup.market.size}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Market Growth Rate</div>
                      <div className="text-2xl font-bold text-green-600">{startup.market.growth}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Competitive Landscape</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {startup.market.competition.map((competitor, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <h4 className="font-medium">{competitor.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{competitor.description}</p>
                        <p className="text-xs text-gray-500 mt-2">{competitor.funding}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {startup.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{doc.name}</div>
                          <div className="text-sm text-gray-500">{doc.size} • Updated {doc.lastUpdated}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {startup.aiAnalysis.strengths.map((strength, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{strength}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-yellow-600">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Risks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {startup.aiAnalysis.risks.map((risk, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{risk}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-600">
                    <Info className="w-5 h-5 mr-2" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {startup.aiAnalysis.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}