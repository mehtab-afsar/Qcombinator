"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Search,
  Brain,
  PieChart,
  TrendingUp,
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  description?: string;
}

// Only pages that actually exist
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
    description: "Discover new opportunities"
  },
  {
    name: "AI Analysis",
    href: "/investor/ai-analysis",
    icon: Brain,
    description: "Deep startup intelligence"
  },
  {
    name: "Portfolio",
    href: "/investor/portfolio",
    icon: PieChart,
    description: "Track your investments"
  },
];

interface InvestorSidebarProps {
  className?: string;
}

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";

export default function InvestorSidebar({ className }: InvestorSidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", height: "100%", background: bg, borderRight: `1px solid ${bdr}`, width: 240 }}
    >
      {/* logo */}
      <div style={{ padding: "20px 20px 18px", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ height: 30, width: 30, borderRadius: 8, background: blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 7, letterSpacing: "0.05em" }}>EA</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.2 }}>Edge Alpha</p>
            <p style={{ fontSize: 11, color: muted }}>Investor Portal</p>
          </div>
        </div>
      </div>

      {/* fund pulse */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600, marginBottom: 10 }}>Fund Pulse</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            { label: "Deal Flow", value: "+15%", dot: "#22C55E" },
            { label: "Valuations", value: "Stable", dot: "#EAB308" },
            { label: "AI/ML Sector", value: "Hot", dot: "#3B82F6" },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ height: 6, width: 6, borderRadius: "50%", background: r.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: ink }}>{r.label}</span>
              </div>
              <span style={{ fontSize: 12, color: muted }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* performance strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: bdr, borderBottom: `1px solid ${bdr}` }}>
        {[{ label: "IRR", value: "24.3%", color: "#16A34A" }, { label: "MOIC", value: "2.8×", color: "#16A34A" }].map(s => (
          <div key={s.label} style={{ background: bg, padding: "10px 16px" }}>
            <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
        {investorNavigation.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                marginBottom: 2,
                background: isActive ? surf : "transparent",
                border: isActive ? `1px solid ${bdr}` : "1px solid transparent",
                transition: "background .15s",
                cursor: "pointer",
              }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = surf; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Icon style={{ height: 15, width: 15, color: isActive ? blue : muted, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? ink : ink, lineHeight: 1.2 }}>{item.name}</p>
                  {item.description && (
                    <p style={{ fontSize: 11, color: muted, marginTop: 1 }}>{item.description}</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* footer */}
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ height: 28, width: 28, borderRadius: "50%", background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp style={{ height: 12, width: 12, color: muted }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>Acme Ventures</p>
            <p style={{ fontSize: 11, color: muted }}>Series A-B · $50M fund</p>
          </div>
        </div>
      </div>
    </div>
  );
}
