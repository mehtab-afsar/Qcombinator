"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  Search,
  Users,
  FileText,
  Brain,
  Target,
  MessageSquare,
  Settings,
  HelpCircle,
  ArrowRight,
  Home,
  Eye,
  Filter,
  Bookmark,
  PieChart,
  Star,
  Zap,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  description?: string;
}

const investorNavigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/investor/dashboard",
    icon: Home,
    description: "Investment overview & metrics"
  },
  {
    name: "Deal Flow",
    href: "/investor/deal-flow",
    icon: Search,
    badge: "12",
    description: "Discover new opportunities"
  },
  {
    name: "AI Analysis",
    href: "/investor/ai-analysis",
    icon: Brain,
    badge: "Pro",
    description: "Deep startup intelligence"
  },
  {
    name: "Portfolio",
    href: "/investor/portfolio",
    icon: PieChart,
    description: "Track your investments"
  },
  {
    name: "Watchlist",
    href: "/investor/watchlist",
    icon: Bookmark,
    badge: "5",
    description: "Startups you're tracking"
  },
  {
    name: "Due Diligence",
    href: "/investor/due-diligence",
    icon: FileText,
    description: "Active evaluations"
  },
  {
    name: "Network",
    href: "/investor/network",
    icon: Users,
    description: "Co-investor connections"
  },
  {
    name: "Messages",
    href: "/investor/messages",
    icon: MessageSquare,
    badge: "7",
    description: "Founder conversations"
  }
];

const quickActions = [
  {
    title: "Smart Scout",
    description: "AI finds deals for you",
    icon: Brain,
    href: "/investor/scout",
    color: "purple"
  },
  {
    title: "Hot Deals",
    description: "Trending opportunities",
    icon: Zap,
    href: "/investor/hot-deals",
    color: "orange"
  },
  {
    title: "Portfolio Insights",
    description: "Performance analytics",
    icon: TrendingUp,
    href: "/investor/insights",
    color: "green"
  }
];

interface InvestorSidebarProps {
  className?: string;
}

export default function InvestorSidebar({ className }: InvestorSidebarProps) {
  const pathname = usePathname();

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${className}`}>
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Q</span>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Qcombinator</div>
            <div className="text-xs text-purple-600 font-medium">Investor Portal</div>
          </div>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="p-4 border-b border-gray-50">
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">Acme Ventures</div>
              <div className="text-xs text-gray-600">Series A-B • $50M Fund</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-gray-600">Active Deals</div>
              <div className="font-semibold text-purple-600">12</div>
            </div>
            <div>
              <div className="text-gray-600">Portfolio</div>
              <div className="font-semibold text-green-600">24 cos</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Market Pulse */}
      <div className="p-4 border-b border-gray-50">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Market Pulse
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-700">Deal Flow</span>
            </div>
            <span className="text-green-600 font-medium">+15%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-gray-700">Valuations</span>
            </div>
            <span className="text-yellow-600 font-medium">Stable</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-700">AI/ML</span>
            </div>
            <span className="text-blue-600 font-medium">Hot</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {investorNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          isActive
                            ? 'bg-purple-100 text-purple-700'
                            : item.badge === 'Pro' ? 'bg-orange-100 text-orange-700'
                            : /^\d+$/.test(item.badge) ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="px-3 mt-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Quick Actions
          </div>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="p-3 hover:shadow-sm transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center space-x-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      action.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                      action.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                      action.color === 'green' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                        {action.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="px-3 mt-6">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center space-x-2 mb-3">
              <Brain className="h-5 w-5 text-blue-600" />
              <div className="font-medium text-sm text-gray-900">AI Insights</div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-gray-700">3 startups in your watchlist show strong momentum</div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-gray-700">New AI/ML deal matches your thesis</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              View All Insights
            </Button>
          </Card>
        </div>

        {/* Performance Summary */}
        <div className="px-3 mt-4">
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm text-gray-900">Fund Performance</div>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-600">IRR</div>
                <div className="font-semibold text-green-600">24.3%</div>
              </div>
              <div>
                <div className="text-gray-600">MOIC</div>
                <div className="font-semibold text-green-600">2.8x</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">Top quartile performance</div>
          </Card>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-100 space-y-3">
        <Link href="/investor/settings">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-gray-900"
          >
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </Button>
        </Link>

        <Link href="/investor/help">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-gray-900"
          >
            <HelpCircle className="mr-3 h-4 w-4" />
            Help & Support
          </Button>
        </Link>
      </div>
    </div>
  );
}