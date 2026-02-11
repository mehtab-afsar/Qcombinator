"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Filter,
  SlidersHorizontal,
  TrendingUp,
  MapPin,
  Calendar,
  Sparkles,
  ChevronRight,
  Heart,
  MessageCircle,
  Share2,
  Eye
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Deal {
  id: string;
  name: string;
  tagline: string;
  logo: string;
  qScore: number;
  stage: string;
  sector: string;
  location: string;
  fundingGoal: string;
  valuation: string;
  matchScore: number;
  addedDate: string;
  founder: {
    name: string;
    avatar: string;
    title: string;
  };
  highlights: string[];
  momentum: "hot" | "trending" | "steady";
  viewed: boolean;
}

const mockDeals: Deal[] = [
  {
    id: "1",
    name: "NeuralFlow AI",
    tagline: "Real-time ML model optimization for edge devices",
    logo: "/api/placeholder/64/64",
    qScore: 891,
    stage: "Series A",
    sector: "AI/ML",
    location: "San Francisco, CA",
    fundingGoal: "$8M",
    valuation: "$45M",
    matchScore: 96,
    addedDate: "2 hours ago",
    founder: {
      name: "Dr. Lisa Zhang",
      avatar: "/api/placeholder/40/40",
      title: "CEO & Co-founder"
    },
    highlights: [
      "Ex-DeepMind team",
      "3 Fortune 500 clients",
      "250% YoY growth"
    ],
    momentum: "hot",
    viewed: false
  },
  {
    id: "2",
    name: "BioSense Labs",
    tagline: "Non-invasive glucose monitoring wearable",
    logo: "/api/placeholder/64/64",
    qScore: 867,
    stage: "Seed",
    sector: "Healthcare",
    location: "Boston, MA",
    fundingGoal: "$4M",
    valuation: "$18M",
    matchScore: 94,
    addedDate: "5 hours ago",
    founder: {
      name: "Dr. Raj Patel",
      avatar: "/api/placeholder/40/40",
      title: "Founder & CTO"
    },
    highlights: [
      "FDA breakthrough designation",
      "Harvard partnership",
      "10K waitlist"
    ],
    momentum: "trending",
    viewed: false
  },
  {
    id: "3",
    name: "CryptoGuard",
    tagline: "Enterprise blockchain security platform",
    logo: "/api/placeholder/64/64",
    qScore: 843,
    stage: "Series A",
    sector: "Cybersecurity",
    location: "Austin, TX",
    fundingGoal: "$10M",
    valuation: "$60M",
    matchScore: 91,
    addedDate: "1 day ago",
    founder: {
      name: "Marcus Chen",
      avatar: "/api/placeholder/40/40",
      title: "CEO"
    },
    highlights: [
      "$5M ARR",
      "85 enterprise clients",
      "SOC 2 certified"
    ],
    momentum: "steady",
    viewed: true
  },
  {
    id: "4",
    name: "EcoCharge",
    tagline: "Ultra-fast EV charging network powered by solar",
    logo: "/api/placeholder/64/64",
    qScore: 819,
    stage: "Series B",
    sector: "CleanTech",
    location: "Los Angeles, CA",
    fundingGoal: "$25M",
    valuation: "$150M",
    matchScore: 89,
    addedDate: "2 days ago",
    founder: {
      name: "Sarah Martinez",
      avatar: "/api/placeholder/40/40",
      title: "Founder & CEO"
    },
    highlights: [
      "200+ charging stations",
      "Partnership with Tesla",
      "Break-even in Q2"
    ],
    momentum: "hot",
    viewed: true
  },
  {
    id: "5",
    name: "TalentAI",
    tagline: "AI-powered recruiting and talent matching",
    logo: "/api/placeholder/64/64",
    qScore: 798,
    stage: "Seed",
    sector: "HR Tech",
    location: "New York, NY",
    fundingGoal: "$3.5M",
    valuation: "$15M",
    matchScore: 87,
    addedDate: "3 days ago",
    founder: {
      name: "Jennifer Wu",
      avatar: "/api/placeholder/40/40",
      title: "Co-founder & CEO"
    },
    highlights: [
      "$1.2M ARR",
      "500+ companies",
      "92% retention"
    ],
    momentum: "trending",
    viewed: false
  },
  {
    id: "6",
    name: "FoodTech Solutions",
    tagline: "Vertical farming automation and optimization",
    logo: "/api/placeholder/64/64",
    qScore: 775,
    stage: "Pre-Seed",
    sector: "AgTech",
    location: "Denver, CO",
    fundingGoal: "$2M",
    valuation: "$8M",
    matchScore: 84,
    addedDate: "4 days ago",
    founder: {
      name: "Tom Anderson",
      avatar: "/api/placeholder/40/40",
      title: "Founder"
    },
    highlights: [
      "3 pilot farms",
      "MIT incubator",
      "40% cost reduction"
    ],
    momentum: "steady",
    viewed: false
  }
];

export default function DealFlowPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");
  const [sortBy, setSortBy] = useState("match");

  const getMomentumBadge = (momentum: Deal["momentum"]) => {
    switch (momentum) {
      case "hot":
        return <Badge className="bg-red-100 text-red-700 border-red-200"><Sparkles className="w-3 h-3 mr-1" />Hot</Badge>;
      case "trending":
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200"><TrendingUp className="w-3 h-3 mr-1" />Trending</Badge>;
      case "steady":
        return <Badge variant="secondary" className="text-gray-600">Steady</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Flow</h1>
          <p className="text-gray-600 mt-1">Discover and evaluate new investment opportunities</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Saved Filters
          </Button>
          <Button>
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search companies, founders, keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-[160px]">
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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                <SelectItem value="ai-ml">AI/ML</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="fintech">Fintech</SelectItem>
                <SelectItem value="climate">CleanTech</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Match Score</SelectItem>
                <SelectItem value="qscore">Q Score</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="momentum">Momentum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Deals ({mockDeals.length})</TabsTrigger>
          <TabsTrigger value="hot">Hot Deals ({mockDeals.filter(d => d.momentum === "hot").length})</TabsTrigger>
          <TabsTrigger value="new">New ({mockDeals.filter(d => !d.viewed).length})</TabsTrigger>
          <TabsTrigger value="high-match">High Match (4)</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {mockDeals.map((deal) => (
            <Card key={deal.id} className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={deal.logo} alt={deal.name} />
                      <AvatarFallback>{deal.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{deal.name}</h3>
                        {!deal.viewed && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">New</Badge>}
                        {getMomentumBadge(deal.momentum)}
                      </div>

                      <p className="text-gray-600 mb-3">{deal.tagline}</p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {deal.location}
                        </div>
                        <div className="flex items-center">
                          <Badge variant="outline">{deal.stage}</Badge>
                        </div>
                        <div className="flex items-center">
                          <Badge variant="outline">{deal.sector}</Badge>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {deal.addedDate}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{deal.qScore}</div>
                          <div className="text-xs text-gray-500">Q Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{deal.matchScore}%</div>
                          <div className="text-xs text-gray-500">Match</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{deal.fundingGoal}</div>
                          <div className="text-xs text-gray-500">Seeking</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{deal.valuation}</div>
                          <div className="text-xs text-gray-500">Valuation</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={deal.founder.avatar} alt={deal.founder.name} />
                          <AvatarFallback>{deal.founder.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{deal.founder.name}</div>
                          <div className="text-gray-500">{deal.founder.title}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {deal.highlights.map((highlight, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {highlight}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-3 ml-4">
                    <Button onClick={() => router.push(`/investor/startup/${deal.id}`)}>
                      View Details
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="ghost">
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hot" className="space-y-4">
          {mockDeals
            .filter((deal) => deal.momentum === "hot")
            .map((deal) => (
              <Card key={deal.id} className="border-red-200 bg-red-50/30">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={deal.logo} alt={deal.name} />
                      <AvatarFallback>{deal.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-xl font-semibold">{deal.name}</h3>
                        <Badge className="bg-red-100 text-red-700">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Hot Deal
                        </Badge>
                      </div>
                      <p className="text-gray-600">{deal.tagline}</p>
                    </div>
                    <Button onClick={() => router.push(`/investor/startup/${deal.id}`)}>
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          {mockDeals
            .filter((deal) => !deal.viewed)
            .map((deal) => (
              <Card key={deal.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={deal.logo} alt={deal.name} />
                        <AvatarFallback>{deal.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{deal.name}</h3>
                        <p className="text-sm text-gray-600">{deal.tagline}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => router.push(`/investor/startup/${deal.id}`)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="high-match">
          {mockDeals
            .filter((deal) => deal.matchScore >= 90)
            .map((deal) => (
              <Card key={deal.id} className="border-green-200 bg-green-50/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={deal.logo} alt={deal.name} />
                        <AvatarFallback>{deal.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-lg">{deal.name}</h3>
                          <Badge className="bg-green-100 text-green-700">{deal.matchScore}% Match</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{deal.tagline}</p>
                      </div>
                    </div>
                    <Button onClick={() => router.push(`/investor/startup/${deal.id}`)}>
                      View Details
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
