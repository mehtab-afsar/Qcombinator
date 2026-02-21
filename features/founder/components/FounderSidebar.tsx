"use client";

import { motion } from "framer-motion";
import {
  BarChart3, Brain, Building2, ChevronsUpDown,
  GraduationCap, Home, LogOut, MessageSquare,
  Settings, Target, UserCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";

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

// ─── simple dropdown ──────────────────────────────────────────────────────────
function Dropdown({
  trigger,
  children,
  align = "left",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            [align]: 0,
            marginBottom: 6,
            minWidth: 200,
            background: bg,
            border: `1px solid ${bdr}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            padding: "6px 0",
            zIndex: 100,
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({
  href,
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  href?: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    fontSize: 13,
    color: danger ? "#DC2626" : ink,
    textDecoration: "none",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    width: "100%",
    fontFamily: "inherit",
    transition: "background .12s",
  };
  const hover = (e: React.MouseEvent) => ((e.currentTarget as HTMLElement).style.background = surf);
  const leave = (e: React.MouseEvent) => ((e.currentTarget as HTMLElement).style.background = "transparent");

  if (href) {
    return (
      <Link href={href} style={style} onMouseEnter={hover} onMouseLeave={leave}>
        <Icon style={{ height: 14, width: 14, color: danger ? "#DC2626" : muted }} />
        {label}
      </Link>
    );
  }
  return (
    <button onClick={onClick} style={style} onMouseEnter={hover} onMouseLeave={leave}>
      <Icon style={{ height: 14, width: 14, color: danger ? "#DC2626" : muted }} />
      {label}
    </button>
  );
}

function DropSep() {
  return <div style={{ height: 1, background: bdr, margin: "4px 0" }} />;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function FounderSidebar() {
  const [expanded, setExpanded] = useState(false);
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

  const W_OPEN   = 220;
  const W_CLOSED = 52;

  return (
    <motion.nav
      style={{
        position: "fixed", left: 0, top: 0, zIndex: 40,
        height: "100vh",
        background: bg,
        borderRight: `1px solid ${bdr}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      animate={{ width: expanded ? W_OPEN : W_CLOSED }}
      transition={{ ease: "easeOut", duration: 0.2 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >

      {/* ── top: startup row ─────────────────────────────────────────── */}
      <div style={{
        height: 52, flexShrink: 0,
        borderBottom: `1px solid ${bdr}`,
        display: "flex", alignItems: "center",
        padding: "0 10px",
      }}>
        <div style={{
          height: 28, width: 28, borderRadius: 7, flexShrink: 0,
          background: ink, color: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700,
        }}>
          {orgInitial}
        </div>
        <motion.div
          animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
          transition={{ duration: 0.15 }}
          style={{ marginLeft: 10, overflow: "hidden", whiteSpace: "nowrap" }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.2 }}>
            {startupName}
          </p>
          <p style={{ fontSize: 10, color: muted }}>Founder</p>
        </motion.div>
      </div>

      {/* ── middle: nav links ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 6px" }}>
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon   = item.icon;
          const bs     = item.badge ? BADGE[item.badge] : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                height: 36,
                borderRadius: 8,
                padding: "0 10px",
                marginBottom: 2,
                textDecoration: "none",
                background: active ? "#EEF2FF" : "transparent",
                transition: "background .12s",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = surf; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Icon style={{
                height: 16, width: 16, flexShrink: 0,
                color: active ? blue : muted,
              }} />

              <motion.div
                animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  marginLeft: 10, display: "flex", alignItems: "center",
                  flex: 1, overflow: "hidden", whiteSpace: "nowrap",
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 500,
                  color: active ? blue : ink,
                }}>
                  {item.name}
                </span>

                {bs && item.badge && (
                  <span style={{
                    marginLeft: "auto", flexShrink: 0,
                    padding: "1px 7px",
                    borderRadius: 999,
                    fontSize: 10, fontWeight: 600,
                    background: bs.bg, color: bs.color,
                  }}>
                    {item.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* ── bottom: user ─────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${bdr}`,
        padding: "8px 6px",
      }}>
        <Dropdown
          trigger={
            <div
              style={{
                display: "flex", alignItems: "center",
                height: 36, borderRadius: 8, padding: "0 10px",
                cursor: "pointer",
                transition: "background .12s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = surf)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <div style={{
                height: 24, width: 24, borderRadius: "50%", flexShrink: 0,
                background: ink, color: bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700,
              }}>
                {initials}
              </div>
              <motion.div
                animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  marginLeft: 10, display: "flex", alignItems: "center",
                  flex: 1, overflow: "hidden", whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: ink }}>
                  {displayName}
                </span>
                <ChevronsUpDown style={{ marginLeft: "auto", height: 12, width: 12, color: muted, flexShrink: 0 }} />
              </motion.div>
            </div>
          }
        >
          {/* user info */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
            <div style={{
              height: 28, width: 28, borderRadius: "50%", flexShrink: 0,
              background: ink, color: bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700,
            }}>
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
              <p style={{ fontSize: 11, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</p>
            </div>
          </div>
          <DropSep />
          <DropItem href="/founder/profile" icon={UserCircle} label="Profile" />
          <DropItem href="/founder/settings" icon={Settings} label="Settings" />
          <DropSep />
          <DropItem icon={LogOut} label="Sign out" onClick={handleSignOut} danger />
        </Dropdown>
      </div>

    </motion.nav>
  );
}
