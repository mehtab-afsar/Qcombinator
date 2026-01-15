'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Target,
  TrendingUp,
  MapPin,
  DollarSign,
  Users,
  Building2,
  Star,
  Heart,
  MessageCircle,
  Eye,
  Zap,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react'

interface Investor {
  id: string
  name: string
  firm: string
  avatar: string
  matchScore: number
  investmentFocus: string[]
  checkSize: string
  location: string
  portfolio: string[]
  recentInvestments: number
  responseRate: number
  avgDealTime: string
  thesis: string
}

const mockInvestors: Investor[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    firm: 'TechVenture Partners',
    avatar: '/api/placeholder/60/60',
    matchScore: 94,
    investmentFocus: ['AI/ML', 'SaaS', 'Enterprise'],
    checkSize: '$1M-$5M',
    location: 'San Francisco, CA',
    portfolio: ['OpenAI', 'Stripe', 'Figma'],
    recentInvestments: 12,
    responseRate: 85,
    avgDealTime: '6 weeks',
    thesis: 'Investing in AI-first companies transforming enterprise workflows'
  },
  {
    id: '2',
    name: 'Michael Chen',
    firm: 'Innovation Capital',
    avatar: '/api/placeholder/60/60',
    matchScore: 89,
    investmentFocus: ['HealthTech', 'AI/ML', 'B2B'],
    checkSize: '$500K-$2M',
    location: 'Boston, MA',
    portfolio: ['Moderna', 'Veracyte', 'PathAI'],
    recentInvestments: 8,
    responseRate: 78,
    avgDealTime: '8 weeks',
    thesis: 'Healthcare innovation through AI and data-driven solutions'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    firm: 'Future Fund',
    avatar: '/api/placeholder/60/60',
    matchScore: 87,
    investmentFocus: ['Climate', 'Energy', 'Sustainability'],
    checkSize: '$2M-$10M',
    location: 'New York, NY',
    portfolio: ['Tesla', 'Rivian', 'Sunrun'],
    recentInvestments: 15,
    responseRate: 92,
    avgDealTime: '4 weeks',
    thesis: 'Climate solutions and sustainable technology for global impact'
  }
]

export default function InvestorMatching() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFocus, setSelectedFocus] = useState('all')
  const [selectedStage, setSelectedStage] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const renderInvestorCard = (investor: Investor) => (
    <Card key={investor.id} className="hover:shadow-lg transition-all duration-200 group">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={investor.avatar} />
              <AvatarFallback>{investor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{investor.name}</h3>
              <p className="text-gray-600">{investor.firm}</p>
              <div className="flex items-center space-x-1 mt-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-sm text-gray-500">{investor.location}</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{investor.matchScore}%</div>
            <div className="text-xs text-gray-500">Match Score</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Investment Focus</div>
            <div className="flex flex-wrap gap-1">
              {investor.investmentFocus.map(focus => (
                <Badge key={focus} variant="secondary" className="text-xs">
                  {focus}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-900">{investor.checkSize}</div>
              <div className="text-gray-500">Check Size</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">{investor.responseRate}%</div>
              <div className="text-gray-500">Response Rate</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Investment Thesis</div>
            <p className="text-sm text-gray-600 line-clamp-2">{investor.thesis}</p>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Notable Portfolio</div>
            <div className="flex space-x-2">
              {investor.portfolio.slice(0, 3).map(company => (
                <Badge key={company} variant="outline" className="text-xs">
                  {company}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex space-x-2">
            <Button size="sm" variant="ghost">
              <Heart className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="ghost">
              <Eye className="w-4 h-4 mr-1" />
              View Profile
            </Button>
          </div>
          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
            <MessageCircle className="w-4 h-4 mr-2" />
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Investor Matching</h1>
          <p className="text-gray-600 text-lg">Find investors perfectly aligned with your startup and thesis</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">1,247</div>
              <div className="text-sm text-gray-600">Active Investors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">89%</div>
              <div className="text-sm text-gray-600">Match Accuracy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">47</div>
              <div className="text-sm text-gray-600">Your Matches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">6.2x</div>
              <div className="text-sm text-gray-600">Higher Success Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Find Your Perfect Investors</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filters
                </Button>
                <Button variant="outline" size="sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Recommendations
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search investors by name, firm, or focus area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedFocus} onValueChange={setSelectedFocus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Investment Focus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Focus Areas</SelectItem>
                  <SelectItem value="ai-ml">AI/ML</SelectItem>
                  <SelectItem value="saas">SaaS</SelectItem>
                  <SelectItem value="healthtech">HealthTech</SelectItem>
                  <SelectItem value="fintech">FinTech</SelectItem>
                  <SelectItem value="climate">Climate</SelectItem>
                </SelectContent>
              </Select>
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
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Tabs defaultValue="recommended" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recommended">
              <Zap className="w-4 h-4 mr-2" />
              AI Recommended (3)
            </TabsTrigger>
            <TabsTrigger value="all">All Matches (47)</TabsTrigger>
            <TabsTrigger value="saved">Saved (12)</TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <Sparkles className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">AI-Powered Recommendations</h3>
              </div>
              <p className="text-gray-700">
                These investors are perfectly aligned with your startup profile, investment stage, and sector focus.
                Our AI analyzed 50+ data points to find these matches.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {mockInvestors.map(investor => renderInvestorCard(investor))}
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {mockInvestors.map(investor => renderInvestorCard(investor))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <div className="text-center py-12 text-gray-500">
              <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No saved investors yet</p>
              <p className="text-sm">Start saving investors you&apos;re interested in connecting with</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-bold mb-2">Get More Targeted Matches</h3>
            <p className="mb-4">Complete your startup profile to unlock more precise investor recommendations</p>
            <Button className="bg-white text-blue-600 hover:bg-gray-100">
              Complete Profile
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}