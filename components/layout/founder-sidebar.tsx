"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Building2,
  BarChart3,
  Target,
  MessageSquare,
  Settings,
  HelpCircle,
  Brain,
  Home,
  GraduationCap,
  ChevronLeft,
  ChevronRight
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
    name: "AI Agents",
    href: "/founder/agents",
    icon: Brain,
    badge: "9",
    description: "Chat with AI advisors"
  },
  {
    name: "Investor Matching",
    href: "/founder/matching",
    icon: Target,
    badge: "Smart",
    description: "Find your perfect investors"
  },
  {
    name: "Academy",
    href: "/founder/academy",
    icon: GraduationCap,
    badge: "NEW",
    description: "Workshops & mentors"
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
    name: "Messages",
    href: "/messages",
    icon: MessageSquare,
    badge: "3",
    description: "Communication with investors"
  }
];

interface FounderSidebarProps {
  className?: string;
}

export default function FounderSidebar({ className }: FounderSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`relative flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    } ${className}`}>
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
        )}
      </button>

      {/* Logo Section */}
      <div className={`p-6 border-b border-gray-100 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${!isCollapsed ? 'space-x-3' : ''}`}>
          <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm transition-transform hover:scale-105">
            <span className="text-white font-light text-[8px] tracking-tight leading-none">EA</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <div className="font-light text-gray-900">Edge Alpha</div>
              <div className="text-xs text-blue-600 font-light">Founder Portal</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {founderNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`group flex items-center px-3 py-2.5 text-sm font-normal rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-light">{item.name}</span>
                        {item.badge && (
                          <span className={`px-2 py-0.5 text-xs font-normal rounded-full ${
                            isActive
                              ? 'bg-blue-100 text-blue-700'
                              : item.badge === 'Smart' ? 'bg-green-100 text-green-700'
                              : item.badge === 'NEW' ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-0.5 font-light">
                          {item.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <Link href="/founder/settings">
          <Button
            variant="ghost"
            className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} text-gray-600 hover:text-gray-900 font-light`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className={`h-4 w-4 ${!isCollapsed && 'mr-3'}`} />
            {!isCollapsed && 'Settings'}
          </Button>
        </Link>

        <Link href="/founder/help">
          <Button
            variant="ghost"
            className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} text-gray-600 hover:text-gray-900 font-light`}
            title={isCollapsed ? "Help & Support" : undefined}
          >
            <HelpCircle className={`h-4 w-4 ${!isCollapsed && 'mr-3'}`} />
            {!isCollapsed && 'Help & Support'}
          </Button>
        </Link>
      </div>
    </div>
  );
}