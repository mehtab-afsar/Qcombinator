"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, TrendingUp, Users, Zap, Star, Brain, Target, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const handleFounderAction = (action: 'evaluate' | 'score') => {
    if (action === 'evaluate') {
      router.push('/founder/onboarding');
    } else {
      router.push('/founder/onboarding?focus=score');
    }
  };

  const handleInvestorAction = () => {
    router.push('/investor/onboarding');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="relative z-10 p-6 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {/* Aesthetic Q Combinator Logo */}
              <div className="h-12 w-12 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <div className="relative">
                  <span className="text-white font-black text-xl">Q</span>
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              {/* Orbiting dots */}
              <div className="absolute -top-1 -left-1 h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-gray-900 tracking-tight">Q Combinator</span>
              <div className="text-xs text-blue-600 font-semibold tracking-wide">AI-POWERED FUNDING PLATFORM</div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
            <span>The Future of Startup-Investor Matching</span>
            <Button variant="ghost" size="sm">Sign In</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex items-center justify-center px-6 py-20">
        <div className="max-w-7xl mx-auto w-full">

          {/* Main Hero */}
          <div className="text-center space-y-12 mb-20">
            <div className="space-y-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 leading-[1.1] max-w-5xl mx-auto">
                <div className="block">Get Your Startup</div>
                <div className="block">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Funded
                  </span>{" "}
                  by the
                </div>
                <div className="block">
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Right Investors
                  </span>
                </div>
              </h1>

              <div className="space-y-4">
                <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
                  The intelligent platform that connects visionary founders with perfect-fit investors
                </p>
                <p className="text-base sm:text-lg text-gray-500 max-w-3xl mx-auto">
                  Advanced AI analysis, behavioral matching, and your unique Q Score
                </p>
              </div>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span>15-minute evaluations</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>95% match accuracy</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span>10,000+ connections made</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>$2.3B+ funded</span>
              </div>
            </div>
          </div>

          {/* Main CTAs for Founders */}
          <div className="max-w-5xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">For Founders</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Start your funding journey with AI-powered insights</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Primary CTA - Start Evaluation */}
              <Card
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                onClick={() => handleFounderAction('evaluate')}
              >
                <CardContent className="p-8 text-center space-y-6">
                  <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Zap className="h-8 w-8 text-white" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Start Free Evaluation</h3>
                    <p className="text-blue-100">
                      Get your complete Q Score, AI analysis, and investor matches in just 15 minutes
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="text-left space-y-3">
                      <div className="flex items-center text-sm text-blue-100">
                        <div className="h-2 w-2 bg-white rounded-full mr-3 flex-shrink-0"></div>
                        <span>Complete founder assessment</span>
                      </div>
                      <div className="flex items-center text-sm text-blue-100">
                        <div className="h-2 w-2 bg-white rounded-full mr-3 flex-shrink-0"></div>
                        <span>Build your startup profile</span>
                      </div>
                      <div className="flex items-center text-sm text-blue-100">
                        <div className="h-2 w-2 bg-white rounded-full mr-3 flex-shrink-0"></div>
                        <span>Get matched with investors</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold group-hover:scale-105 transition-transform duration-300"
                    size="lg"
                  >
                    Start Now - It's Free
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>

                  <p className="text-xs text-blue-200">
                    🚀 Takes 15 minutes • No credit card required
                  </p>
                </CardContent>
              </Card>

              {/* Secondary CTA - Q Score Teaser */}
              <Card
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-0 bg-white/80 backdrop-blur-sm"
                onClick={() => handleFounderAction('score')}
              >
                <CardContent className="p-8 text-center space-y-6">
                  <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Brain className="h-8 w-8 text-white" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-gray-900">See Your Q Score</h3>
                    <p className="text-gray-600">
                      Discover where you stand with our proprietary startup readiness score
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Q Score Preview */}
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4">
                      <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        Q Score: 742
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Out of 1000 • Top 15%</div>
                    </div>

                    <div className="text-left space-y-3">
                      <div className="flex items-center text-sm text-gray-700">
                        <div className="h-2 w-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                        <span>Team strength analysis</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                        <span>Market opportunity sizing</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <div className="h-2 w-2 bg-purple-500 rounded-full mr-3 flex-shrink-0"></div>
                        <span>Funding readiness score</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 group-hover:scale-105 transition-all duration-300"
                    size="lg"
                  >
                    Calculate My Q Score
                    <Target className="ml-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                  </Button>

                  <p className="text-xs text-gray-500">
                    ⚡ Quick assessment • Instant results
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Investor Section */}
          <div className="max-w-5xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">For Investors</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">AI-powered deal flow that matches your thesis</p>
            </div>

            <Card
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-0 bg-gradient-to-br from-purple-600 to-pink-600 text-white"
              onClick={handleInvestorAction}
            >
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold">AI-Powered Deal Flow Intelligence</h3>
                      <p className="text-purple-100">
                        Discover high-potential startups through advanced AI analysis, streamlined due diligence, and predictive success scoring.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-purple-100">
                        <div className="h-2 w-2 bg-white rounded-full mr-3 flex-shrink-0"></div>
                        <span>Pre-vetted deals with Q Scores</span>
                      </div>
                      <div className="flex items-center text-sm text-purple-100">
                        <div className="h-2 w-2 bg-white rounded-full mr-3 flex-shrink-0"></div>
                        <span>Thesis-aligned recommendations</span>
                      </div>
                      <div className="flex items-center text-sm text-purple-100">
                        <div className="h-2 w-2 bg-white rounded-full mr-3 flex-shrink-0"></div>
                        <span>Automated due diligence reports</span>
                      </div>
                      <div className="flex items-center text-sm text-purple-100">
                        <div className="h-2 w-2 bg-white rounded-full mr-3 flex-shrink-0"></div>
                        <span>Competitive intelligence alerts</span>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-white text-purple-600 hover:bg-gray-100 font-semibold group-hover:scale-105 transition-transform duration-300"
                      size="lg"
                    >
                      Start Finding Deals
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {/* Deal Preview Cards */}
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">NeuralTech</div>
                        <div className="text-sm bg-white/20 px-2 py-1 rounded-full">Q: 891</div>
                      </div>
                      <div className="text-xs text-purple-200">AI/ML • Series A • 94% thesis match</div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">CloudScale</div>
                        <div className="text-sm bg-white/20 px-2 py-1 rounded-full">Q: 847</div>
                      </div>
                      <div className="text-xs text-purple-200">DevTools • Seed • 91% thesis match</div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-purple-200">+ 127 more matches this week</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Trust Indicators */}
          <div className="text-center mt-16 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">$2.3B+</div>
                <div className="text-sm text-gray-600">Funded via Platform</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">10,000+</div>
                <div className="text-sm text-gray-600">Successful Matches</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">500+</div>
                <div className="text-sm text-gray-600">Active Investors</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">95%</div>
                <div className="text-sm text-gray-600">Match Accuracy</div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <span>Secure</span>
              <span>•</span>
              <span>Private</span>
              <span>•</span>
              <span>AI-Powered</span>
              <span>•</span>
              <span>YC Backed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 bg-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 h-32 w-32 bg-pink-200/30 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}