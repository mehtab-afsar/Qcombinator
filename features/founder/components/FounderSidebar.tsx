"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  BarChart3, Brain, Building2, ChevronsUpDown,
  GraduationCap, Home, LogOut, MessageSquare,
  Settings, Target, UserCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/hooks/useAuth";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg   = "#F9F7F2";
const surf = "#F0EDE6";
const bdr  = "#E2DDD5";
const ink  = "#18160F";
const muted = "#8A867C";

// ─── framer variants ──────────────────────────────────────────────────────────
const sidebarVariants = {
  open:   { width: "15rem" },
  closed: { width: "3.05rem" },
};

const labelVariants = {
  open:   { opacity: 1, x: 0,   transition: { duration: 0.15 } },
  closed: { opacity: 0, x: -6,  transition: { duration: 0.1  } },
};

// ─── nav items ────────────────────────────────────────────────────────────────
const nav = [
  { name: "Dashboard",         href: "/founder/dashboard", icon: Home,          badge: null    },
  { name: "AI Agents",         href: "/founder/agents",    icon: Brain,         badge: "9"     },
  { name: "Investor Matching", href: "/founder/matching",  icon: Target,        badge: "Smart" },
  { name: "Academy",           href: "/founder/academy",   icon: GraduationCap, badge: "NEW"   },
  { name: "Profile Builder",   href: "/founder/profile",   icon: Building2,     badge: null    },
  { name: "Metrics",           href: "/founder/metrics",   icon: BarChart3,     badge: null    },
  { name: "Messages",          href: "/messages",          icon: MessageSquare, badge: "3"     },
];

const BADGE: Record<string, { bg: string; color: string }> = {
  "9":     { bg: "#EEF2FF", color: "#3730A3" },
  "Smart": { bg: "#F0FDF4", color: "#166534" },
  "NEW":   { bg: "#FDF4FF", color: "#6B21A8" },
  "3":     { bg: surf,      color: muted     },
};

// ─── component ────────────────────────────────────────────────────────────────
export default function FounderSidebar({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const router   = useRouter();
  const { user, signOut } = useAuth();

  const displayName = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Founder";
  const startupName = (user?.user_metadata?.startup_name as string) || "Edge Alpha";
  const initials    = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const orgInitial  = startupName[0]?.toUpperCase() ?? "E";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <motion.div
      className={cn("fixed left-0 top-0 z-40 h-screen border-r overflow-hidden", className)}
      style={{ borderColor: bdr, background: bg }}
      initial="closed"
      animate={collapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={{ ease: "easeOut", duration: 0.2 }}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      {/* ── Outer flex column fills full height ─────────────────────── */}
      <div className="flex h-full flex-col overflow-hidden">

        {/* ── TOP: startup / org row ──────────────────────────────── */}
        <div
          className="flex h-[54px] w-full shrink-0 items-center px-2"
          style={{ borderBottom: `1px solid ${bdr}` }}
        >
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 outline-none"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = surf)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded"
                  style={{ width: 22, height: 22, background: ink, fontSize: 9, fontWeight: 700, color: bg }}
                >
                  {orgInitial}
                </div>
                <motion.div
                  variants={labelVariants}
                  className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
                >
                  <span className="truncate text-sm font-medium" style={{ color: ink }}>
                    {startupName}
                  </span>
                  <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0" style={{ color: muted }} />
                </motion.div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/founder/profile" className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4" /> Edit startup profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/founder/dashboard" className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4" /> Dashboard
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── MIDDLE: nav (flex-1 = takes all remaining space) ──────── */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="flex flex-col gap-0.5 p-2">
              {nav.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon   = item.icon;
                const bs     = item.badge ? BADGE[item.badge] : null;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex h-8 w-full items-center rounded-md px-2 py-1.5"
                    style={{
                      background: active ? "#EEF2FF" : "transparent",
                      textDecoration: "none",
                      transition: "background 0.14s",
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = surf; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: active ? "#2563EB" : muted }}
                    />
                    <motion.div
                      variants={labelVariants}
                      className="ml-2 flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
                    >
                      <span
                        className="truncate text-sm font-medium"
                        style={{ color: active ? "#2563EB" : ink }}
                      >
                        {item.name}
                      </span>
                      {bs && item.badge && (
                        <span
                          className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: bs.bg, color: bs.color }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* ── BOTTOM: settings + user (always pinned to bottom) ─────── */}
        <div
          className="flex shrink-0 flex-col gap-0.5 p-2"
          style={{ borderTop: `1px solid ${bdr}` }}
        >
          {/* User dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 py-1.5 outline-none"
                style={{ background: "transparent", border: "none", cursor: "pointer", transition: "background 0.14s" }}
                onMouseEnter={e => (e.currentTarget.style.background = surf)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{ width: 20, height: 20, background: ink, color: bg, fontSize: 9, fontWeight: 700 }}
                >
                  {initials}
                </div>
                <motion.div
                  variants={labelVariants}
                  className="flex min-w-0 flex-1 items-center overflow-hidden"
                >
                  <span className="truncate text-sm font-medium" style={{ color: ink }}>
                    {displayName}
                  </span>
                  <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0" style={{ color: muted }} />
                </motion.div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={6} align="start" className="w-52">
              <div className="flex items-center gap-2 px-2 py-2">
                <div
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{ width: 28, height: 28, background: ink, color: bg, fontSize: 11, fontWeight: 700 }}
                >
                  {initials}
                </div>
                <div className="flex min-w-0 flex-col text-left">
                  <span className="truncate text-sm font-medium" style={{ color: ink }}>{displayName}</span>
                  <span className="truncate text-xs" style={{ color: muted }}>{user?.email}</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/founder/profile" className="flex items-center gap-2 text-sm">
                  <UserCircle className="h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/founder/settings" className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-sm">
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </motion.div>
  );
}
