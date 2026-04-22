"use client";

import { motion } from "framer-motion";
import {
  Bell, Search, PieChart, MessageSquare,
  ChevronsUpDown, LogOut, Settings, UserCircle, Kanban, CreditCard, LayoutDashboard, Rss,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'
import { useInvestorNotifications, InvestorNotification } from '@/features/investor/hooks/useInvestorNotifications'

// ─── nav items ────────────────────────────────────────────────────────────────
const BASE_NAV = [
  { name: "Dashboard",  href: "/investor/dashboard",  icon: LayoutDashboard, badge: null   },
  { name: "Deal Flow",  href: "/investor/deal-flow",  icon: Search,          badge: "Live" },
  { name: "Pipeline",   href: "/investor/pipeline",   icon: Kanban,          badge: null   },
  { name: "Portfolio",  href: "/investor/portfolio",  icon: PieChart,        badge: null   },
  { name: "Pulse",      href: "/feed",                icon: Rss,             badge: "New"  },
  { name: "Messages",   href: "/investor/messages",   icon: MessageSquare,   badge: null   },
];

const BADGE: Record<string, { bg: string; color: string }> = {
  "Live": { bg: "#F0FDF4", color: "#166534" },
  "New":  { bg: "#F5F3FF", color: "#6B21A8" },
};

function badgeStyle(badge: string): { bg: string; color: string } {
  if (BADGE[badge]) return BADGE[badge];
  // numeric unread count — red
  return { bg: "#FEF2F2", color: "#DC2626" };
}

// ─── notification panel ───────────────────────────────────────────────────────
function NotificationPanel({
  notifications,
  onClose,
}: {
  notifications: InvestorNotification[];
  onClose: () => void;
}) {
  const router = useRouter();

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function NotifRow({ n }: { n: InvestorNotification }) {
    const isShare = n.type === 'startup_share';
    const founderId = n.metadata?.founderId as string | undefined;

    return (
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "12px 16px", borderBottom: `1px solid ${bdr}`,
        background: n.read ? "transparent" : `${blue}05`,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: isShare ? `${blue}12` : surf,
          border: `1px solid ${isShare ? blue : bdr}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
        }}>{n.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, color: ink, margin: "0 0 3px", lineHeight: 1.45,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{n.title}</p>
          {n.body && (
            <p style={{ fontSize: 12, color: muted, margin: "0 0 6px", fontStyle: "italic", lineHeight: 1.4 }}>
              {n.body}
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 11, color: muted, margin: 0 }}>{timeAgo(n.time)}</p>
            {isShare && founderId && (
              <button
                onClick={() => { router.push(`/investor/startup/${founderId}`); onClose(); }}
                style={{
                  fontSize: 11, fontWeight: 600, color: blue, background: `${blue}10`,
                  border: `1px solid ${blue}30`, borderRadius: 999,
                  padding: "2px 10px", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                View startup →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, zIndex: 50,
        width: 320, background: bg, borderLeft: `1px solid ${bdr}`,
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
      }}>
        <div style={{
          height: 52, flexShrink: 0, borderBottom: `1px solid ${bdr}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Notifications</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: muted, borderRadius: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {notifications.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔔</div>
              <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.6 }}>
                No notifications yet.<br />Updates will appear here.
              </p>
            </div>
          ) : notifications.map(n => <NotifRow key={n.id} n={n} />)}
        </div>
      </div>
    </>
  );
}

// ─── dropdown ─────────────────────────────────────────────────────────────────
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
export default function InvestorSidebar() {
  const [expanded,  setExpanded]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const { user, signOut } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0);
  const { notifications } = useInvestorNotifications();

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/investor/messages/unread");
        if (!res.ok || cancelled) return;
        const d = await res.json();
        setUnreadTotal(d.total ?? 0);
        setPendingConnections(d.pendingRequests ?? 0);
      } catch { /* non-critical */ }
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const nav = BASE_NAV.map(item => {
    if (item.name === "Messages" && unreadTotal > 0) return { ...item, badge: String(unreadTotal) };
    if (item.name === "Portfolio" && pendingConnections > 0) return { ...item, badge: String(pendingConnections) };
    return item;
  });

  const displayName = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Investor";
  const fundName    = (user?.user_metadata?.fund_name as string) || "Edge Alpha";
  const avatarUrl   = (user?.user_metadata?.avatar_url as string | null) ?? null;
  const firmLogoUrl = (user?.user_metadata?.firm_logo_url as string | null) ?? null;

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

      {/* ── top: EA logo row ──────────────────────────────────────────── */}
      <div style={{
        height: 52, flexShrink: 0,
        borderBottom: `1px solid ${bdr}`,
        display: "flex", alignItems: "center",
        padding: "0 10px",
      }}>
        <Avatar url={firmLogoUrl} name={fundName} size={28} radius={7} bgColor={blue} fgColor="#fff" fontSize={9} />
        <motion.div
          animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
          transition={{ duration: 0.15 }}
          style={{ marginLeft: 10, overflow: "hidden", whiteSpace: "nowrap" }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.2 }}>
            {fundName}
          </p>
          <p style={{ fontSize: 10, color: muted }}>Investor</p>
        </motion.div>
      </div>

      {/* ── middle: nav links ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 6px" }}>

        {/* Divider */}
        <div style={{ height: 1, background: bdr, margin: "6px 4px 8px" }} />

        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon   = item.icon;
          const bs = item.badge ? badgeStyle(item.badge) : null;

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
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
            <Avatar url={avatarUrl} name={displayName} size={28} radius={999} fontSize={10} />
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
              <p style={{ fontSize: 11, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</p>
            </div>
          </div>
          <DropSep />
          <DropItem href="/investor/portfolio" icon={UserCircle}  label="Profile" />
          <DropItem href="/investor/settings"  icon={Settings}    label="Settings" />
          <DropItem href="/investor/billing"   icon={CreditCard}  label="Subscription" />
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

// ─── exported top-right notification bell ─────────────────────────────────────
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useInvestorNotifications();

  function handleOpen() {
    setOpen(v => !v);
    if (!open && unreadCount > 0) markAllRead();
  }

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          position: "relative", width: 36, height: 36, borderRadius: 10,
          background: open ? `${blue}10` : surf,
          border: `1px solid ${open ? blue : bdr}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all .15s",
        }}
      >
        <Bell style={{ height: 15, width: 15, color: open ? blue : muted }} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            width: 16, height: 16, borderRadius: "50%",
            background: "#DC2626", color: "#fff",
            fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${bg}`,
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
