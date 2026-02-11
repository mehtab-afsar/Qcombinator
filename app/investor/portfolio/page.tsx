"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Briefcase,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Download,
  Filter
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PortfolioCompany {
  id: string;
  name: string;
  logo: string;
  sector: string;
  stage: string;
  investedAmount: string;
  currentValuation: string;
  investmentDate: string;
  ownership: string;
  lastRound: string;
  health: "excellent" | "good" | "concern" | "critical";
  metrics: {
    revenue: string;
    growth: string;
    burnRate: string;
    runway: string;
  };
  performance: {
    multiple: number;
    change: number;
  };
  nextMilestone: string;
  lastUpdate: string;
}

const mockPortfolio: PortfolioCompany[] = [
  {
    id: "1",
    name: "TechFlow AI",
    logo: "/api/placeholder/64/64",
    sector: "AI/ML",
    stage: "Series A",
    investedAmount: "$2M",
    currentValuation: "$50M",
    investmentDate: "Jan 2023",
    ownership: "8.5%",
    lastRound: "Series B ($15M)",
    health: "excellent",
    metrics: {
      revenue: "$2.1M ARR",
      growth: "+180% YoY",
      burnRate: "$150K/mo",
      runway: "24 months"
    },
    performance: {
      multiple: 3.2,
      change: 15
    },
    nextMilestone: "Series B closing Q1 2024",
    lastUpdate: "2 days ago"
  },
  {
    id: "2",
    name: "HealthTech Pro",
    logo: "/api/placeholder/64/64",
    sector: "Healthcare",
    stage: "Seed",
    investedAmount: "$500K",
    currentValuation: "$12M",
    investmentDate: "Jun 2023",
    ownership: "5.2%",
    lastRound: "Seed ($2M)",
    health: "good",
    metrics: {
      revenue: "$450K ARR",
      growth: "+240% YoY",
      burnRate: "$80K/mo",
      runway: "18 months"
    },
    performance: {
      multiple: 1.8,
      change: 8
    },
    nextMilestone: "FDA approval process",
    lastUpdate: "5 days ago"
  },
  {
    id: "3",
    name: "FinanceOS",
    logo: "/api/placeholder/64/64",
    sector: "Fintech",
    stage: "Series A",
    investedAmount: "$3M",
    currentValuation: "$65M",
    investmentDate: "Mar 2022",
    ownership: "12%",
    lastRound: "Series A ($8M)",
    health: "excellent",
    metrics: {
      revenue: "$3.5M ARR",
      growth: "+150% YoY",
      burnRate: "$200K/mo",
      runway: "30 months"
    },
    performance: {
      multiple: 4.1,
      change: 22
    },
    nextMilestone: "Profitability Q2 2024",
    lastUpdate: "1 day ago"
  },
  {
    id: "4",
    name: "DataHub Analytics",
    logo: "/api/placeholder/64/64",
    sector: "SaaS",
    stage: "Seed",
    investedAmount: "$750K",
    currentValuation: "$15M",
    investmentDate: "Aug 2023",
    ownership: "6.8%",
    lastRound: "Seed ($3M)",
    health: "concern",
    metrics: {
      revenue: "$890K ARR",
      growth: "+210% YoY",
      burnRate: "$180K/mo",
      runway: "12 months"
    },
    performance: {
      multiple: 1.4,
      change: -5
    },
    nextMilestone: "Series A fundraise",
    lastUpdate: "1 week ago"
  },
  {
    id: "5",
    name: "SecureCloud",
    logo: "/api/placeholder/64/64",
    sector: "Cybersecurity",
    stage: "Series A",
    investedAmount: "$2.5M",
    currentValuation: "$55M",
    investmentDate: "Nov 2022",
    ownership: "9.2%",
    lastRound: "Series A ($6M)",
    health: "good",
    metrics: {
      revenue: "$2.8M ARR",
      growth: "+190% YoY",
      burnRate: "$170K/mo",
      runway: "22 months"
    },
    performance: {
      multiple: 2.7,
      change: 12
    },
    nextMilestone: "Enterprise expansion",
    lastUpdate: "3 days ago"
  }
];

export default function PortfolioPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Calculate portfolio metrics
  const totalInvested = mockPortfolio.reduce((sum, company) => {
    return sum + parseFloat(company.investedAmount.replace(/[$MK]/g, "")) * (company.investedAmount.includes("M") ? 1000000 : 1000);
  }, 0);

  const totalValue = mockPortfolio.reduce((sum, company) => {
    const ownership = parseFloat(company.ownership.replace("%", "")) / 100;
    const valuation = parseFloat(company.currentValuation.replace(/[$MK]/g, "")) * (company.currentValuation.includes("M") ? 1000000 : 1000);
    return sum + (valuation * ownership);
  }, 0);

  const totalROI = ((totalValue - totalInvested) / totalInvested) * 100;

  const getHealthColor = (health: PortfolioCompany["health"]) => {
    switch (health) {
      case "excellent":
        return "bg-green-100 text-green-700 border-green-200";
      case "good":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "concern":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "critical":
        return "bg-red-100 text-red-700 border-red-200";
    }
  };

  const getHealthIcon = (health: PortfolioCompany["health"]) => {
    switch (health) {
      case "excellent":
      case "good":
        return <CheckCircle className="w-4 h-4" />;
      case "concern":
      case "critical":
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-600 mt-1">Track performance and manage your investments</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Invested</p>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">
              ${(totalInvested / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-blue-600 mt-1">{mockPortfolio.length} companies</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Current Value</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-900">
              ${(totalValue / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +{totalROI.toFixed(1)}% ROI
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg Multiple</p>
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-900">
              {(mockPortfolio.reduce((sum, c) => sum + c.performance.multiple, 0) / mockPortfolio.length).toFixed(1)}x
            </p>
            <p className="text-xs text-purple-600 mt-1">Across portfolio</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Active Deals</p>
              <Briefcase className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-900">{mockPortfolio.length}</p>
            <p className="text-xs text-orange-600 mt-1">
              {mockPortfolio.filter(c => c.health === "excellent" || c.health === "good").length} performing well
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Companies */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Companies ({mockPortfolio.length})</TabsTrigger>
          <TabsTrigger value="excellent">
            Excellent ({mockPortfolio.filter(c => c.health === "excellent").length})
          </TabsTrigger>
          <TabsTrigger value="attention">
            Needs Attention ({mockPortfolio.filter(c => c.health === "concern" || c.health === "critical").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {mockPortfolio.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={company.logo} alt={company.name} />
                      <AvatarFallback>{company.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
                          <Badge variant="outline" className={getHealthColor(company.health)}>
                            {getHealthIcon(company.health)}
                            <span className="ml-1 capitalize">{company.health}</span>
                          </Badge>
                          <Badge variant="outline">{company.sector}</Badge>
                          <Badge variant="secondary">{company.stage}</Badge>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Invested: {company.investedAmount}</span>
                          <span>•</span>
                          <span>Ownership: {company.ownership}</span>
                          <span>•</span>
                          <span>Since {company.investmentDate}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Current Value</div>
                          <div className="font-semibold text-gray-900">{company.currentValuation}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Revenue</div>
                          <div className="font-semibold text-gray-900">{company.metrics.revenue}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Growth</div>
                          <div className="font-semibold text-green-600">{company.metrics.growth}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Runway</div>
                          <div className="font-semibold text-gray-900">{company.metrics.runway}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Multiple</div>
                          <div className="flex items-center space-x-1">
                            <span className="font-semibold text-gray-900">{company.performance.multiple}x</span>
                            {company.performance.change > 0 ? (
                              <span className="text-xs text-green-600 flex items-center">
                                <ArrowUpRight className="w-3 h-3" />
                                {company.performance.change}%
                              </span>
                            ) : (
                              <span className="text-xs text-red-600 flex items-center">
                                <ArrowDownRight className="w-3 h-3" />
                                {Math.abs(company.performance.change)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center text-gray-600">
                            <Target className="w-4 h-4 mr-1" />
                            {company.nextMilestone}
                          </div>
                          <div className="flex items-center text-gray-400">
                            <Calendar className="w-4 h-4 mr-1" />
                            Updated {company.lastUpdate}
                          </div>
                        </div>

                        <Button variant="outline" size="sm" onClick={() => router.push(`/investor/startup/${company.id}`)}>
                          View Details
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="excellent">
          {mockPortfolio
            .filter((company) => company.health === "excellent")
            .map((company) => (
              <Card key={company.id} className="border-green-200 bg-green-50/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={company.logo} alt={company.name} />
                        <AvatarFallback>{company.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{company.name}</h3>
                        <p className="text-sm text-gray-600">
                          {company.performance.multiple}x multiple • {company.metrics.growth}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => router.push(`/investor/startup/${company.id}`)}>
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="attention">
          {mockPortfolio
            .filter((company) => company.health === "concern" || company.health === "critical")
            .map((company) => (
              <Card key={company.id} className="border-yellow-200 bg-yellow-50/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={company.logo} alt={company.name} />
                        <AvatarFallback>{company.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-lg">{company.name}</h3>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Attention Required
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Runway: {company.metrics.runway} • Burn: {company.metrics.burnRate}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => router.push(`/investor/startup/${company.id}`)}>
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
