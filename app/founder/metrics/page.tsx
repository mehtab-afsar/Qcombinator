'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Target,
  Zap,
  Eye,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react'

export default function MetricsTracker() {
  const [timeframe, setTimeframe] = useState('30d')

  const keyMetrics = [
    {
      name: 'Monthly Recurring Revenue',
      value: '$127,500',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Active Users',
      value: '12,847',
      change: '+8.3%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Customer Acquisition Cost',
      value: '$245',
      change: '-5.2%',
      trend: 'up',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Churn Rate',
      value: '2.1%',
      change: '-0.3%',
      trend: 'up',
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  const growthMetrics = [
    { period: 'Jan 2024', revenue: 85000, users: 8500, cac: 280 },
    { period: 'Feb 2024', revenue: 92000, users: 9200, cac: 270 },
    { period: 'Mar 2024', revenue: 98000, users: 10100, cac: 265 },
    { period: 'Apr 2024', revenue: 105000, users: 11200, cac: 255 },
    { period: 'May 2024', revenue: 115000, users: 12100, cac: 250 },
    { period: 'Jun 2024', revenue: 127500, users: 12847, cac: 245 }
  ]

  const investorMetrics = [
    { name: 'Burn Rate', value: '$85,000/mo', status: 'healthy', target: '< $100K' },
    { name: 'Runway', value: '18 months', status: 'good', target: '> 12 months' },
    { name: 'Growth Rate', value: '12.5% MoM', status: 'excellent', target: '> 10%' },
    { name: 'LTV:CAC Ratio', value: '4.2:1', status: 'excellent', target: '> 3:1' },
    { name: 'Gross Margin', value: '78%', status: 'excellent', target: '> 70%' },
    { name: 'Net Revenue Retention', value: '115%', status: 'excellent', target: '> 100%' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'healthy': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Metrics Tracker</h1>
            <p className="text-gray-600">Track key performance indicators and growth metrics</p>
          </div>
          <div className="flex space-x-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Metric
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {keyMetrics.map((metric, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`h-12 w-12 rounded-lg ${metric.bgColor} flex items-center justify-center`}>
                    <metric.icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                  <div className="flex items-center space-x-1">
                    {metric.trend === 'up' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                  <div className="text-sm text-gray-600">{metric.name}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts and Detailed Metrics */}
        <Tabs defaultValue="growth" className="space-y-6">
          <TabsList>
            <TabsTrigger value="growth">
              <LineChart className="w-4 h-4 mr-2" />
              Growth Trends
            </TabsTrigger>
            <TabsTrigger value="investor">
              <BarChart3 className="w-4 h-4 mr-2" />
              Investor Metrics
            </TabsTrigger>
            <TabsTrigger value="performance">
              <Activity className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="benchmarks">
              <Target className="w-4 h-4 mr-2" />
              Benchmarks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="growth" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {growthMetrics.slice(-3).map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">{metric.period}</span>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            ${(metric.revenue / 1000).toFixed(0)}K
                          </div>
                          <div className="text-xs text-gray-500">
                            {index > 0 ? `+${(((metric.revenue - growthMetrics[growthMetrics.length - 3 + index - 1].revenue) / growthMetrics[growthMetrics.length - 3 + index - 1].revenue) * 100).toFixed(1)}%` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {growthMetrics.slice(-3).map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">{metric.period}</span>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">
                            {(metric.users / 1000).toFixed(1)}K
                          </div>
                          <div className="text-xs text-gray-500">
                            {index > 0 ? `+${(((metric.users - growthMetrics[growthMetrics.length - 3 + index - 1].users) / growthMetrics[growthMetrics.length - 3 + index - 1].users) * 100).toFixed(1)}%` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Growth Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Strong Growth</span>
                    </div>
                    <p className="text-sm text-green-700">Revenue growth accelerating with 12.5% MoM increase</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-800">User Expansion</span>
                    </div>
                    <p className="text-sm text-blue-700">User base growing consistently at 8.3% monthly</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-purple-800">Efficiency Gains</span>
                    </div>
                    <p className="text-sm text-purple-700">CAC decreasing while maintaining growth quality</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investor" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Investor Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {investorMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{metric.name}</div>
                          <div className="text-sm text-gray-500">Target: {metric.target}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{metric.value}</div>
                          <Badge className={getStatusColor(metric.status)}>
                            {metric.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Health Score</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">8.7/10</div>
                  <div className="text-gray-600 mb-4">Excellent financial health</div>
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between text-sm">
                      <span>Growth Sustainability</span>
                      <span className="font-medium">9.2/10</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Unit Economics</span>
                      <span className="font-medium">8.5/10</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Capital Efficiency</span>
                      <span className="font-medium">8.4/10</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <Eye className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Investor Readiness</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Your metrics show strong fundamentals for fundraising. Revenue growth, unit economics,
                  and efficiency metrics are all performing above market benchmarks.
                </p>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  Generate Investor Report
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Advanced Analytics Coming Soon</h3>
                  <p>Deep dive into performance metrics, cohort analysis, and predictive insights</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benchmarks">
            <Card>
              <CardHeader>
                <CardTitle>Industry Benchmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Benchmark Comparison Coming Soon</h3>
                  <p>Compare your metrics against industry standards and similar-stage companies</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}