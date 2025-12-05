"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Building2,
  BarChart3,
  FileText,
  Users,
  Target,
  MessageSquare,
  Settings,
  HelpCircle,
  ArrowRight,
  Brain,
  Zap,
  TrendingUp,
  Home,
  Upload,
  Eye,
  CheckCircle
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  description?: string;
}

const founderNavigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/founder/dashboard",
    icon: Home,
    description: "Your startup overview"
  },
  {
    name: "Pitch Analyzer",
    href: "/founder/pitch-analyzer",
    icon: Brain,
    badge: "AI",
    description: "AI-powered pitch evaluation"
  },
  {
    name: "Investor Matching",
    href: "/founder/matching",
    icon: Target,
    badge: "Smart",
    description: "Find your perfect investors"
  },
  {
    name: "Profile Builder",
    href: "/founder/profile",
    icon: Building2,
    description: "Build your startup profile"
  },
  {
    name: "Metrics Tracker",
    href: "/founder/metrics",
    icon: BarChart3,
    description: "Track key performance metrics"
  },
  {
    name: "Pitch Deck",
    href: "/founder/pitch-deck",
    icon: FileText,
    description: "Upload and optimize your deck"
  },
  {
    name: "AI Model Test",
    href: "/founder/model-test",
    icon: Zap,
    badge: "NEW",
    description: "Test different Groq AI models"
  },
  {
    name: "Messages",
    href: "/messages",
    icon: MessageSquare,
    badge: "3",
    description: "Communication with investors"
  }
];

const quickActions = [
  {
    title: "Upload Pitch Deck",
    description: "Get instant AI feedback",
    icon: Upload,
    href: "/founder/pitch-deck/upload",
    color: "blue"
  },
  {
    title: "View Profile Score",
    description: "See your readiness score",
    icon: Eye,
    href: "/founder/profile/score",
    color: "green"
  },
  {
    title: "Find Investors",
    description: "AI-matched opportunities",
    icon: Target,
    href: "/founder/matching/discover",
    color: "purple"
  }
];

interface FounderSidebarProps {
  className?: string;
}

export default function FounderSidebar({ className }: FounderSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${className}`}>
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20 transition-transform hover:scale-105">
            <span className="text-white font-black text-[8px] tracking-tighter leading-none">EDGE</span>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Edge Alpha</div>
            <div className="text-xs text-blue-600 font-medium">Founder Portal</div>
          </div>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="p-4 border-b border-gray-50">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">TechCorp Inc.</div>
              <div className="text-xs text-gray-600">SaaS • Series A Ready</div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Profile Score</span>
              <span className="font-medium text-green-600">8.7/10</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full" style={{ width: '87%' }}></div>
            </div>
            <div className="text-xs text-gray-500">Investor Ready</div>
          </div>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {founderNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : item.badge === 'AI' ? 'bg-purple-100 text-purple-700'
                            : item.badge === 'Smart' ? 'bg-green-100 text-green-700'
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
                      action.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      action.color === 'green' ? 'bg-green-100 text-green-600' :
                      action.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="px-3 mt-6">
          <Card className="p-4 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="font-medium text-sm text-gray-900">Setup Progress</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Profile Complete</span>
                <span className="font-medium text-green-600">7/8</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '87.5%' }}></div>
              </div>
              <div className="text-xs text-gray-500">Almost there! Upload your pitch deck.</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-100 space-y-3">
        <Link href="/founder/settings">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-gray-900"
          >
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </Button>
        </Link>

        <Link href="/founder/help">
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