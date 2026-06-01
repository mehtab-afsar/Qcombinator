"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ChevronsUpDown,
  ClipboardList, CreditCard, GraduationCap, Home, LogOut, MessageSquare,
  Settings, Target, UserCircle, Rss,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePendingConnections } from "../hooks/usePendingConnections";
import { useNotifications } from "../hooks/useNotifications";
import { SidebarNotification } from "../types/founder.types";
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'
import { APP_NAME } from '@/lib/constants/app'
import { Avatar } from '@/features/shared/components/Avatar'
import { EmailConfirmBanner } from '@/features/shared/components/EmailConfirmBanner'
import { NotificationDropdown, NotificationBellButton, NotifItem } from '@/features/shared/components/NotificationPanel'

// ─── nav items ────────────────────────────────────────────────────────────────
const BASE_NAV = [
  { name: "Dashboard",         href: "/founder/dashboard",       icon: Home,          badge: null    },
  { name: "Profile Builder",   href: "/founder/profile-builder", icon: ClipboardList, badge: null    },
  { name: "CXO Suite",         href: "/founder/cxo",             icon: Brain,         badge: "9"     },
  { name: "Investor Matching", href: "/founder/matching",        icon: Target,        badge: "Smart" },
  { name: "Academy",           href: "/founder/academy",         icon: GraduationCap, badge: "NEW"   },
  { name: "Pulse",             href: "/feed",                    icon: Rss,           badge: "New"   },
  { name: "Messages",          href: "/founder/messages",        icon: MessageSquare, badge: null    },
];

const BADGE: Record<string, { bg: string; color: string }> = {
  "9":     { bg: "#EEF2FF", color: "#3730A3" },
  "Smart": { bg: "#F0FDF4", color: "#166534" },
  "NEW":   { bg: "#FDF4FF", color: "#6B21A8" },
  "New":   { bg: "#F5F3FF", color: "#6B21A8" },
};

function msgBadgeStyle(count: number): { bg: string; color: string } {
  if (count === 0) return { bg: surf, color: muted };
  return { bg: "#FEF2F2", color: "#DC2626" };
}

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
  const hoverBg = danger ? "rgba(220,38,38,0.08)" : surf;
  const restBg  = danger ? "rgba(220,38,38,0.04)" : "transparent";
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    fontSize: 13,
    color: danger ? "#DC2626" : ink,
    textDecoration: "none",
    cursor: "pointer",
    background: restBg,
    border: "none",
    width: "100%",
    fontFamily: "inherit",
    transition: "background .12s",
  };
  const hover = (e: React.MouseEvent) => ((e.currentTarget as HTMLElement).style.background = hoverBg);
  const leave = (e: React.MouseEvent) => ((e.currentTarget as HTMLElement).style.background = restBg);

  if (href) {
    return (
      <Link href={href} replace style={style} onMouseEnter={hover} onMouseLeave={leave}>
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
  const [expanded,  setExpanded]  = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const { user, signOut } = useAuth();

  const msgCount = usePendingConnections();

  // Build nav with dynamic message badge
  const nav = BASE_NAV.map(item =>
    item.name === "Messages" && msgCount !== null && msgCount > 0
      ? { ...item, badge: String(msgCount) }
      : item
  );

  // Active path helpers for CXO Suite (matches /founder/cxo, /founder/cxo/*)
  function isNavActive(href: string, pathname: string): boolean {
    if (href === "/founder/cxo") {
      return pathname === "/founder/cxo" || pathname.startsWith("/founder/cxo?") || pathname.startsWith("/founder/cxo/");
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  const displayName   = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Founder";
  const startupName   = (user?.user_metadata?.startup_name as string) || APP_NAME;
  const avatarUrl     = (user?.user_metadata?.avatar_url as string | null) ?? null;
  const companyLogoUrl = (user?.user_metadata?.company_logo_url as string | null) ?? null;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const W_OPEN   = 220;
  const W_CLOSED = 52;

  return (
    <>
      <EmailConfirmBanner
        statusApiPath="/api/founder/email-status"
        resendApiPath="/api/auth/resend-confirmation"
      />
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
          <Avatar url={companyLogoUrl} name={startupName} size={28} radius={7} />
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

          {/* Divider */}
          <div style={{ height: 1, background: bdr, margin: "6px 4px 8px" }} />

          {nav.map(item => {
            const active = isNavActive(item.href, pathname);
            const Icon   = item.icon;
            const isMessages = item.name === "Messages";
            const bs = isMessages && item.badge
              ? msgBadgeStyle(Number(item.badge))
              : item.badge
                ? BADGE[item.badge] ?? null
                : null;

            return (
              <Link
                key={item.href}
                href={item.href}
                replace
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
                <Avatar url={avatarUrl} name={displayName} size={24} radius={999} fontSize={9} />
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
              <Avatar url={avatarUrl} name={displayName} size={28} radius={999} fontSize={10} />
              <div style={{ overflow: "hidden" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
                <p style={{ fontSize: 11, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</p>
              </div>
            </div>
            <div style={{ padding: "2px 14px 10px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>
                ● FOUNDER
              </span>
            </div>
            <DropSep />
            <DropItem href="/founder/profile"              icon={UserCircle} label="Profile" />
            <DropItem href="/founder/settings"             icon={Settings}   label="Settings" />
            <DropItem href="/founder/billing" icon={CreditCard} label="Subscription" />
            <DropSep />
            <DropItem icon={LogOut} label="Sign out" onClick={handleSignOut} danger />
          </Dropdown>
        </div>

      </motion.nav>
    </>
  );
}

// ─── exported top-right notification bell ─────────────────────────────────────
export function FounderNotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useNotifications();

  function handleOpen() {
    setOpen(v => !v);
    if (!open && unreadCount > 0) markAllRead();
  }

  const notifItems: NotifItem[] = (notifications as Array<SidebarNotification & { read?: boolean }>).map(n => ({
    id:    n.id,
    icon:  n.icon,
    type:  n.action_type,
    title: n.title,
    time:  n.time,
    read:  n.read ?? false,
  }));

  return (
    <>
      <NotificationBellButton open={open} unreadCount={unreadCount} onClick={handleOpen} />
      <AnimatePresence>
        {open && (
          <NotificationDropdown
            notifications={notifItems}
            unreadCount={unreadCount}
            onClose={() => setOpen(false)}
            onMarkAllRead={markAllRead}
            footerHref="/founder/activity"
          />
        )}
      </AnimatePresence>
    </>
  );
}
