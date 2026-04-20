"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Design tokens ─────────────────────────────────────────────────────────

const bg    = "#FFFFFF";
const bgSub = "#F7F6F3";
const bdr   = "#E8E5DF";
const ink   = "#18160F";
const muted = "#9B978F";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SidebarStat {
  label: string;
  value: string | number;
  color?: string;
}

export interface SidebarTab {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface SidebarAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export interface SidebarAlert {
  message: string;
  color: string;
  icon?: LucideIcon;
}

interface WorkspaceSidebarProps {
  name: string;
  role: string;
  emoji: string;
  accent: string;
  badge: string;
  tabs: SidebarTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  stats: SidebarStat[];
  quickActions?: SidebarAction[];
  alert?: SidebarAlert;
  backHref?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function WorkspaceSidebar({
  name, role, emoji, accent, badge,
  tabs, activeTab, onTabChange,
  stats, quickActions, alert,
  backHref = "/founder/agents",
}: WorkspaceSidebarProps) {
  return (
    <div style={{
      width: 240, minWidth: 240, height: "100vh",
      display: "flex", flexDirection: "column",
      background: bg, borderRight: `1px solid ${bdr}`,
      overflowY: "auto",
    }}>

      {/* ── back link ─────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 16px 0" }}>
        <Link href={backHref} style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 11, color: muted, textDecoration: "none", fontWeight: 500,
          transition: "color 0.15s",
        }}>
          <ArrowLeft size={12} />
          All Agents
        </Link>
      </div>

      {/* ── agent identity ─────────────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {/* avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${accent}14`, border: `1.5px solid ${accent}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>
            {emoji}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: ink, margin: 0, lineHeight: 1.2 }}>{name}</p>
            <p style={{ fontSize: 11, color: muted, margin: "2px 0 0", lineHeight: 1 }}>{role}</p>
          </div>
        </div>

        {/* badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", borderRadius: 999,
          background: `${accent}10`, border: `1px solid ${accent}25`,
          fontSize: 9, fontWeight: 700, color: accent, letterSpacing: "0.08em",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: accent, display: "inline-block", flexShrink: 0,
          }} />
          {badge}
        </div>
      </div>

      <Divider />

      {/* ── stats ──────────────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <>
          <div style={{ padding: "12px 16px" }}>
            <p style={{
              fontSize: 9, fontWeight: 700, color: muted, letterSpacing: "0.1em",
              textTransform: "uppercase", marginBottom: 10,
            }}>
              Overview
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {stats.map((s, i) => (
                <div key={i} style={{
                  padding: "10px 10px 8px",
                  background: bgSub, borderRadius: 8,
                  border: `1px solid ${bdr}`,
                }}>
                  <p style={{
                    fontSize: 18, fontWeight: 700, lineHeight: 1,
                    color: s.color ?? ink, margin: 0,
                  }}>
                    {s.value}
                  </p>
                  <p style={{
                    fontSize: 10, color: muted, margin: "4px 0 0",
                    fontWeight: 500, lineHeight: 1.2,
                  }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* alert banner */}
          {alert && (
            <div style={{
              margin: "0 12px 12px",
              padding: "8px 10px",
              borderRadius: 8,
              background: `${alert.color}0D`,
              border: `1px solid ${alert.color}30`,
              display: "flex", alignItems: "center", gap: 7,
            }}>
              {alert.icon && <alert.icon size={12} color={alert.color} style={{ flexShrink: 0 }} />}
              <span style={{ fontSize: 11, color: alert.color, fontWeight: 600, lineHeight: 1.3 }}>
                {alert.message}
              </span>
            </div>
          )}

          <Divider />
        </>
      )}

      {/* ── tab nav ────────────────────────────────────────────────────── */}
      <nav style={{ padding: "8px 8px" }}>
        {tabs.map(t => {
          const active = activeTab === t.id;
          const Icon   = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 9, padding: "9px 10px", borderRadius: 8,
                marginBottom: 1,
                background: active ? `${accent}0E` : "transparent",
                border: "none",
                borderLeft: active ? `3px solid ${accent}` : "3px solid transparent",
                cursor: "pointer", textAlign: "left",
                transition: "all 0.12s",
              }}
            >
              <Icon
                size={14}
                style={{ color: active ? accent : muted, flexShrink: 0 }}
              />
              <span style={{
                flex: 1,
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? ink : muted,
                lineHeight: 1,
              }}>
                {t.label}
              </span>
              {t.badge != null && t.badge > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  minWidth: 17, height: 17,
                  borderRadius: 999,
                  background: active ? accent : `${accent}20`,
                  color: active ? "#fff" : accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 4px",
                }}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── quick actions ───────────────────────────────────────────────── */}
      {quickActions && quickActions.length > 0 && (
        <>
          <Divider />
          <div style={{ padding: "12px 12px", flex: 1 }}>
            <p style={{
              fontSize: 9, fontWeight: 700, color: muted, letterSpacing: "0.1em",
              textTransform: "uppercase", marginBottom: 8, paddingLeft: 4,
            }}>
              Quick Build
            </p>
            {quickActions.map((a, i) => {
              const Icon = a.icon;
              return (
                <button
                  key={i}
                  onClick={a.onClick}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: 8, padding: "8px 10px", borderRadius: 8,
                    marginBottom: 2, background: "transparent", border: "none",
                    cursor: "pointer", textAlign: "left",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = bgSub; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: `${accent}12`, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={12} color={accent} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: ink, lineHeight: 1.2 }}>
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: bdr, flexShrink: 0 }} />;
}
