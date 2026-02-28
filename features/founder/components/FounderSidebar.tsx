"use client";

import { motion } from "framer-motion";
import {
  BarChart3, Bell, Brain, Building2, ChevronsUpDown,
  GraduationCap, Home, LogOut, MessageSquare,
  Settings, Target, UserCircle, FolderOpen, Briefcase, Presentation,
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
const BASE_NAV = [
  { name: "Dashboard",         href: "/founder/dashboard", icon: Home,          badge: null    },
  { name: "AI Agents",         href: "/founder/agents",    icon: Brain,         badge: "9"     },
  { name: "Workspace",         href: "/founder/workspace", icon: FolderOpen,    badge: null    },
  { name: "Portfolio",         href: "/founder/portfolio",  icon: Briefcase,     badge: null    },
  { name: "Pitch Deck",        href: "/founder/pitch-deck", icon: Presentation,  badge: null    },
  { name: "Investor Matching", href: "/founder/matching",   icon: Target,        badge: "Smart" },
  { name: "Academy",           href: "/founder/academy",   icon: GraduationCap, badge: "NEW"   },
  { name: "Profile Builder",   href: "/founder/profile",         icon: Building2,     badge: null    },
  { name: "Startup Profile",  href: "/founder/startup-profile", icon: UserCircle,    badge: null    },
  { name: "Metrics",           href: "/founder/metrics",   icon: BarChart3,     badge: null    },
  { name: "Messages",          href: "/messages",          icon: MessageSquare, badge: null    },
];

const BADGE: Record<string, { bg: string; color: string }> = {
  "9":     { bg: "#EEF2FF", color: "#3730A3" },
  "Smart": { bg: "#F0FDF4", color: "#166534" },
  "NEW":   { bg: "#FDF4FF", color: "#6B21A8" },
};

function msgBadgeStyle(count: number): { bg: string; color: string } {
  if (count === 0) return { bg: surf, color: muted };
  return { bg: "#FEF2F2", color: "#DC2626" };
}

// ─── notification types ───────────────────────────────────────────────────────
interface Notification {
  id: string;
  icon: string;
  agentId: string;
  action_type: string;
  title: string;
  time: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const READ_KEY = "ea_read_notifs_v1";

// ─── notification panel ───────────────────────────────────────────────────────
function NotificationPanel({
  notifications,
  onClose,
}: {
  notifications: Notification[];
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 49,
          background: "transparent",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", left: 60, top: 0, bottom: 0, zIndex: 50,
        width: 320,
        background: bg,
        borderRight: `1px solid ${bdr}`,
        display: "flex", flexDirection: "column",
        boxShadow: "4px 0 24px rgba(0,0,0,0.08)",
      }}>
        {/* Header */}
        <div style={{
          height: 52, flexShrink: 0,
          borderBottom: `1px solid ${bdr}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
        }}>
          <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, fontWeight: 700, color: ink }}>
            Notifications
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 4, display: "flex", alignItems: "center",
              color: muted, borderRadius: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {notifications.length === 0 ? (
            <div style={{
              padding: "48px 24px", textAlign: "center",
              fontFamily: "system-ui, sans-serif",
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔔</div>
              <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.6 }}>
                No notifications yet.<br />Agent actions will appear here.
              </p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 16px",
                  borderBottom: `1px solid ${bdr}`,
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: surf, border: `1px solid ${bdr}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                }}>
                  {n.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 13, color: ink, margin: "0 0 3px",
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {n.title}
                  </p>
                  <p style={{
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 11, color: muted, margin: 0,
                  }}>
                    {n.agentId !== "system" ? n.agentId.charAt(0).toUpperCase() + n.agentId.slice(1) : "System"} · {timeAgo(n.time)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0, borderTop: `1px solid ${bdr}`,
          padding: "10px 16px",
        }}>
          <Link
            href="/founder/activity"
            onClick={onClose}
            style={{
              display: "block", textAlign: "center",
              fontFamily: "system-ui, sans-serif",
              fontSize: 12, fontWeight: 600, color: blue,
              textDecoration: "none",
              padding: "8px",
              borderRadius: 8,
              background: `${blue}10`,
              transition: "background 0.15s",
            }}
          >
            View all activity →
          </Link>
        </div>
      </div>
    </>
  );
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
  const [expanded,      setExpanded]      = useState(false);
  const [msgCount,      setMsgCount]      = useState<number | null>(null);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const pathname = usePathname();
  const router   = useRouter();
  const { user, signOut } = useAuth();

  // Fetch pending connection request count for Messages badge
  useEffect(() => {
    fetch("/api/connections")
      .then(r => r.json())
      .then(d => {
        const statuses = Object.values(d.connections ?? {}) as string[];
        const pending  = statuses.filter(s => s === "pending" || s === "viewed").length;
        setMsgCount(pending);
      })
      .catch(() => setMsgCount(null));
  }, []);

  // Fetch notifications
  useEffect(() => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(d => {
        const notifs: Notification[] = d.notifications ?? [];
        setNotifications(notifs);
        try {
          const readIds = new Set<string>(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
          setUnreadCount(notifs.filter(n => !readIds.has(n.id)).length);
        } catch {
          setUnreadCount(notifs.length);
        }
      })
      .catch(() => {});
  }, []);

  function openNotifications() {
    setNotifOpen(true);
    // Mark all as read
    try {
      const ids = notifications.map(n => n.id);
      localStorage.setItem(READ_KEY, JSON.stringify(ids));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }

  // Build nav with dynamic message badge
  const nav = BASE_NAV.map(item =>
    item.name === "Messages" && msgCount !== null && msgCount > 0
      ? { ...item, badge: String(msgCount) }
      : item
  );

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
    <>
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

          {/* Notification bell */}
          <button
            onClick={openNotifications}
            style={{
              display: "flex", alignItems: "center",
              height: 36, width: "100%",
              borderRadius: 8, padding: "0 10px",
              marginBottom: 2,
              background: notifOpen ? `${blue}10` : "transparent",
              border: "none", cursor: "pointer",
              transition: "background .12s",
              position: "relative",
            }}
            onMouseEnter={e => { if (!notifOpen) (e.currentTarget as HTMLElement).style.background = surf; }}
            onMouseLeave={e => { if (!notifOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Bell style={{ height: 16, width: 16, color: notifOpen ? blue : muted }} />
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -5,
                  width: 14, height: 14, borderRadius: "50%",
                  background: "#DC2626", color: "#fff",
                  fontSize: 8, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${bg}`,
                }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <motion.div
              animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
              transition={{ duration: 0.15 }}
              style={{
                marginLeft: 10, display: "flex", alignItems: "center",
                flex: 1, overflow: "hidden", whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: notifOpen ? blue : ink }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: "auto", flexShrink: 0,
                  padding: "1px 7px", borderRadius: 999,
                  fontSize: 10, fontWeight: 600,
                  background: "#FEF2F2", color: "#DC2626",
                }}>
                  {unreadCount}
                </span>
              )}
            </motion.div>
          </button>

          {/* Divider */}
          <div style={{ height: 1, background: bdr, margin: "6px 4px 8px" }} />

          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
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

      {/* ── Notification panel ───────────────────────────────────────── */}
      {notifOpen && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setNotifOpen(false)}
        />
      )}
    </>
  );
}
