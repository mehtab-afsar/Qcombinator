'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Filter,
  Heart,
  MessageCircle,
  TrendingUp,
  Star,
  ChevronRight,
  Target,
  BarChart3,
  Briefcase,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Share,
  Inbox
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ConnectionRequestCard } from '@/components/investor/ConnectionRequestCard'
import { MeetingSchedulerModal } from '@/components/investor/MeetingSchedulerModal'
import { DeclineFeedbackForm } from '@/components/investor/DeclineFeedbackForm'

interface Startup {
  id: string
  name: string
  tagline: string
  logo: string
  qScore: number
  stage: string
  sector: string
  location: string
  fundingGoal: string
  traction: string
  matchScore: number
  lastActive: string
  founder: {
    name: string
    avatar: string
    background: string
  }
  metrics: {
    revenue: string
    growth: string
    customers: number
    team: number
  }
  tags: string[]
  status: 'new' | 'reviewing' | 'interested' | 'passed'
}

// Mock connection requests
const mockConnectionRequests = [
  {
    id: 'req-001',
    founderName: 'Sarah Mitchell',
    startupName: 'CloudSync',
    oneLiner: 'Real-time collaboration platform for distributed teams',
    qScore: 78,
    qScorePercentile: 85,
    qScoreBreakdown: {
      market: 82,
      product: 75,
      goToMarket: 68,
      financial: 80,
      team: 85,
      traction: 72
    },
    personalMessage: 'Hi! I noticed your investment in similar collaboration tools. Would love to discuss how CloudSync is different and our traction in the enterprise segment.',
    requestedDate: '2026-01-26',
    stage: 'Seed',
    industry: 'SaaS',
    fundingTarget: '$2M'
  },
  {
    id: 'req-002',
    founderName: 'Marcus Johnson',
    startupName: 'EcoTrack',
    oneLiner: 'Carbon footprint tracking and reduction platform for businesses',
    qScore: 72,
    qScorePercentile: 78,
    qScoreBreakdown: {
      market: 75,
      product: 70,
      goToMarket: 65,
      financial: 72,
      team: 78,
      traction: 70
    },
    personalMessage: undefined,
    requestedDate: '2026-01-27',
    stage: 'Pre-Seed',
    industry: 'Climate Tech',
    fundingTarget: '$1.5M'
  },
  {
    id: 'req-003',
    founderName: 'Lisa Park',
    startupName: 'HealthMetrics AI',
    oneLiner: 'AI-powered health analytics for preventative care',
    qScore: 85,
    qScorePercentile: 92,
    qScoreBreakdown: {
      market: 88,
      product: 85,
      goToMarket: 80,
      financial: 82,
      team: 90,
      traction: 85
    },
    personalMessage: 'Your portfolio company MedTech Solutions operates in adjacent space. I believe there could be strategic synergies. Would love to explore partnership opportunities.',
    requestedDate: '2026-01-27',
    stage: 'Seed',
    industry: 'HealthTech',
    fundingTarget: '$3M'
  }
];

// Sample startup data - expanded mock data
const mockStartups: Startup[] = [
  {
    id: '1',
    name: 'TechFlow AI',
    tagline: 'AI-powered workflow automation for enterprise teams',
    logo: '/api/placeholder/64/64',
    qScore: 847,
    stage: 'Series A',
    sector: 'AI/ML',
    location: 'San Francisco, CA',
    fundingGoal: '$5M',
    traction: '$2.1M ARR',
    matchScore: 94,
    lastActive: '2 hours ago',
    founder: {
      name: 'Alex Thompson',
      avatar: '/api/placeholder/40/40',
      background: 'Ex-Google, Stanford CS'
    },
    metrics: {
      revenue: '$2.1M ARR',
      growth: '+180% YoY',
      customers: 47,
      team: 12
    },
    tags: ['Enterprise', 'AI/ML', 'High Growth'],
    status: 'new'
  },
  {
    id: '2',
    name: 'HealthTech Pro',
    tagline: 'Remote patient monitoring and care coordination platform',
    logo: '/api/placeholder/64/64',
    qScore: 792,
    stage: 'Seed',
    sector: 'Healthcare',
    location: 'Boston, MA',
    fundingGoal: '$2M',
    traction: '$450K ARR',
    matchScore: 88,
    lastActive: '5 hours ago',
    founder: {
      name: 'Dr. Sarah Chen',
      avatar: '/api/placeholder/40/40',
      background: 'Ex-Kaiser, Harvard Med'
    },
    metrics: {
      revenue: '$450K ARR',
      growth: '+240% YoY',
      customers: 23,
      team: 8
    },
    tags: ['Healthcare', 'B2B', 'SaaS'],
    status: 'reviewing'
  },
  {
    id: '3',
    name: 'FinanceOS',
    tagline: 'Next-gen financial planning software for SMBs',
    logo: '/api/placeholder/64/64',
    qScore: 821,
    stage: 'Series A',
    sector: 'Fintech',
    location: 'New York, NY',
    fundingGoal: '$8M',
    traction: '$3.5M ARR',
    matchScore: 91,
    lastActive: '1 day ago',
    founder: {
      name: 'Michael Rodriguez',
      avatar: '/api/placeholder/40/40',
      background: 'Ex-Goldman, Wharton MBA'
    },
    metrics: {
      revenue: '$3.5M ARR',
      growth: '+150% YoY',
      customers: 340,
      team: 18
    },
    tags: ['Fintech', 'SaaS', 'Profitable'],
    status: 'interested'
  },
  {
    id: '4',
    name: 'GreenEnergy Labs',
    tagline: 'Smart grid optimization using AI and IoT',
    logo: '/api/placeholder/64/64',
    qScore: 768,
    stage: 'Pre-Seed',
    sector: 'Climate',
    location: 'Austin, TX',
    fundingGoal: '$1.5M',
    traction: '$120K ARR',
    matchScore: 85,
    lastActive: '3 hours ago',
    founder: {
      name: 'Emily Watson',
      avatar: '/api/placeholder/40/40',
      background: 'Ex-Tesla, MIT'
    },
    metrics: {
      revenue: '$120K ARR',
      growth: '+320% YoY',
      customers: 12,
      team: 5
    },
    tags: ['CleanTech', 'Hardware', 'IoT'],
    status: 'new'
  },
  {
    id: '5',
    name: 'DataHub Analytics',
    tagline: 'Real-time data analytics for e-commerce businesses',
    logo: '/api/placeholder/64/64',
    qScore: 805,
    stage: 'Seed',
    sector: 'SaaS',
    location: 'Seattle, WA',
    fundingGoal: '$3M',
    traction: '$890K ARR',
    matchScore: 89,
    lastActive: '4 hours ago',
    founder: {
      name: 'James Park',
      avatar: '/api/placeholder/40/40',
      background: 'Ex-Amazon, Berkeley'
    },
    metrics: {
      revenue: '$890K ARR',
      growth: '+210% YoY',
      customers: 67,
      team: 10
    },
    tags: ['Analytics', 'SaaS', 'B2B'],
    status: 'reviewing'
  },
  {
    id: '6',
    name: 'SecureCloud',
    tagline: 'Enterprise-grade cybersecurity platform for cloud infrastructure',
    logo: '/api/placeholder/64/64',
    qScore: 836,
    stage: 'Series A',
    sector: 'Cybersecurity',
    location: 'Palo Alto, CA',
    fundingGoal: '$6M',
    traction: '$2.8M ARR',
    matchScore: 92,
    lastActive: '6 hours ago',
    founder: {
      name: 'David Kim',
      avatar: '/api/placeholder/40/40',
      background: 'Ex-Palo Alto Networks, CMU'
    },
    metrics: {
      revenue: '$2.8M ARR',
      growth: '+190% YoY',
      customers: 89,
      team: 15
    },
    tags: ['Security', 'Enterprise', 'DevOps'],
    status: 'new'
  }
]

export default function InvestorDashboard() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedSector, setSelectedSector] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards')
  const [filteredStartups, setFilteredStartups] = useState(mockStartups)

  // Connection request state
  const [connectionRequests, setConnectionRequests] = useState(mockConnectionRequests)
  const [selectedRequest, setSelectedRequest] = useState<typeof mockConnectionRequests[0] | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [showDeclineForm, setShowDeclineForm] = useState(false)

  // Handle accept connection request
  const handleAcceptRequest = (requestId: string) => {
    const request = connectionRequests.find(r => r.id === requestId)
    if (request) {
      setSelectedRequest(request)
      setShowScheduler(true)
    }
  }

  // Handle decline connection request
  const handleDeclineRequest = (requestId: string) => {
    const request = connectionRequests.find(r => r.id === requestId)
    if (request) {
      setSelectedRequest(request)
      setShowDeclineForm(true)
    }
  }

  // Handle schedule meeting
  const handleScheduleMeeting = (date: string, time: string, notes: string) => {
    if (!selectedRequest) return

    // Remove request from list after scheduling
    setConnectionRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
    setShowScheduler(false)
    setSelectedRequest(null)
  }

  // Handle decline with feedback
  const handleDeclineWithFeedback = (reasons: string[], feedback: string) => {
    if (!selectedRequest) return

    // Remove request from list after declining
    setConnectionRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
    setShowDeclineForm(false)
    setSelectedRequest(null)
  }

  const stats = {
    totalDeals: 1247,
    newThisWeek: 23,
    averageQScore: 742,
    matchingCriteria: 89
  }

  const getStatusColor = (status: Startup['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'reviewing': return 'bg-yellow-100 text-yellow-800'
      case 'interested': return 'bg-green-100 text-green-800'
      case 'passed': return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: Startup['status']) => {
    switch (status) {
      case 'new': return <AlertCircle className="w-3 h-3" />
      case 'reviewing': return <Clock className="w-3 h-3" />
      case 'interested': return <CheckCircle className="w-3 h-3" />
      case 'passed': return <XCircle className="w-3 h-3" />
    }
  }

  const renderStartupCard = (startup: Startup) => (
    <Card key={startup.id} className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={startup.logo} alt={startup.name} />
              <AvatarFallback>{startup.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{startup.name}</h3>
              <p className="text-sm text-gray-600 truncate">{startup.tagline}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={getStatusColor(startup.status)}>
              {getStatusIcon(startup.status)}
              <span className="ml-1 capitalize">{startup.status}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{startup.qScore}</div>
            <div className="text-xs text-gray-500">Q Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{startup.matchScore}%</div>
            <div className="text-xs text-gray-500">Match</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">{startup.stage}</div>
            <div className="text-xs text-gray-500">Stage</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">{startup.fundingGoal}</div>
            <div className="text-xs text-gray-500">Seeking</div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-900">{startup.metrics.revenue}</div>
            <div className="text-gray-500">Revenue</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{startup.metrics.growth}</div>
            <div className="text-gray-500">Growth</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{startup.metrics.customers.toLocaleString()}</div>
            <div className="text-gray-500">Customers</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{startup.metrics.team}</div>
            <div className="text-gray-500">Team Size</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={startup.founder.avatar} alt={startup.founder.name} />
            <AvatarFallback>{startup.founder.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{startup.founder.name}</span>
          <span className="text-xs text-gray-500">• {startup.founder.background}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {startup.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button size="sm" variant="ghost">
              <Heart className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="ghost">
              <Share className="w-4 h-4 mr-1" />
              Share
            </Button>
            <Button size="sm" variant="ghost">
              <MessageCircle className="w-4 h-4 mr-1" />
              Message
            </Button>
          </div>
          <Button size="sm" onClick={() => router.push(`/investor/startup/${startup.id}`)}>
            View Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Connection Requests Section */}
      {connectionRequests.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <Inbox className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Connection Requests</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {connectionRequests.length} {connectionRequests.length === 1 ? 'founder' : 'founders'} would like to connect with you
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-600 text-white text-lg px-4 py-1">
                {connectionRequests.length} New
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectionRequests.map(request => (
              <ConnectionRequestCard
                key={request.id}
                request={request}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Deals</p>
                <p className="text-2xl font-bold">{stats.totalDeals.toLocaleString()}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New This Week</p>
                <p className="text-2xl font-bold text-green-600">{stats.newThisWeek}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Q Score</p>
                <p className="text-2xl font-bold text-purple-600">{stats.averageQScore}</p>
              </div>
              <Star className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Matching Criteria</p>
                <p className="text-2xl font-bold text-orange-600">{stats.matchingCriteria}%</p>
              </div>
              <Target className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deal Flow Pipeline</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by company name, founder, or sector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                <SelectItem value="seed">Seed</SelectItem>
                <SelectItem value="series-a">Series A</SelectItem>
                <SelectItem value="series-b">Series B</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                <SelectItem value="ai-ml">AI/ML</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="fintech">Fintech</SelectItem>
                <SelectItem value="climate">Climate</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Deals ({filteredStartups.length})</TabsTrigger>
              <TabsTrigger value="new">New ({filteredStartups.filter(s => s.status === 'new').length})</TabsTrigger>
              <TabsTrigger value="reviewing">Reviewing ({filteredStartups.filter(s => s.status === 'reviewing').length})</TabsTrigger>
              <TabsTrigger value="interested">Interested ({filteredStartups.filter(s => s.status === 'interested').length})</TabsTrigger>
              <TabsTrigger value="passed">Passed ({filteredStartups.filter(s => s.status === 'passed').length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStartups.map(startup => renderStartupCard(startup))}
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStartups
                  .filter(startup => startup.status === 'new')
                  .map(startup => renderStartupCard(startup))}
              </div>
            </TabsContent>

            <TabsContent value="reviewing" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStartups
                  .filter(startup => startup.status === 'reviewing')
                  .map(startup => renderStartupCard(startup))}
              </div>
            </TabsContent>

            <TabsContent value="interested" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStartups
                  .filter(startup => startup.status === 'interested')
                  .map(startup => renderStartupCard(startup))}
              </div>
            </TabsContent>

            <TabsContent value="passed" className="space-y-4">
              <div className="text-center py-12 text-gray-500">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No passed deals</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Meeting Scheduler Modal */}
      {selectedRequest && (
        <MeetingSchedulerModal
          isOpen={showScheduler}
          onClose={() => {
            setShowScheduler(false)
            setSelectedRequest(null)
          }}
          onSchedule={handleScheduleMeeting}
          founderName={selectedRequest.founderName}
          startupName={selectedRequest.startupName}
        />
      )}

      {/* Decline Feedback Form */}
      {selectedRequest && (
        <DeclineFeedbackForm
          isOpen={showDeclineForm}
          onClose={() => {
            setShowDeclineForm(false)
            setSelectedRequest(null)
          }}
          onSubmit={handleDeclineWithFeedback}
          founderName={selectedRequest.founderName}
          startupName={selectedRequest.startupName}
        />
      )}
    </div>
  )
}