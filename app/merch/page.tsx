"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:     "#F9F7F2",
  ink:    "#18160F",
  dim:    "rgba(24,22,15,0.40)",
  dimmer: "rgba(24,22,15,0.18)",
  line:   "rgba(24,22,15,0.08)",
  green:  "#47FF95",
  gnBg:   "#DDFBEA",
  blue:   "#1A6CFF",
  blBg:   "#EAF2FF",
  cream:  "#F7F4EF",
  card:   "#FFFFFF",
  mono:   "var(--font-ibm-plex-mono, 'IBM Plex Mono', monospace)",
  sans:   "var(--font-inter-tight, 'Inter Tight', sans-serif)",
}

// ─── Global CSS (@keyframes + 3D flip — cannot be done with inline styles) ───
const CSS = `
  @keyframes ea-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes ea-blink  { 0%,100%{opacity:1}   50%{opacity:0.3} }
  @keyframes ea-cur    { 0%,100%{opacity:0.3} 50%{opacity:0}   }
  @keyframes ea-modal  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .ea-dot    { animation: ea-blink 2.4s ease-in-out infinite; }
  .ea-cursor { animation: ea-cur   1.1s step-end    infinite; }
  .ea-strip-track { display:flex; animation: ea-scroll 44s linear infinite; white-space:nowrap; }
  .ea-modal-box { animation: ea-modal 0.3s ease; }

  /* Flip card */
  .ea-bs-item { perspective: 1000px; cursor: pointer; }
  .ea-bs-inner {
    position: relative; width: 100%; height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.55s cubic-bezier(0.4,0.2,0.2,1);
  }
  .ea-bs-item:hover .ea-bs-inner { transform: rotateY(180deg); }
  .ea-bs-front, .ea-bs-back {
    position: absolute; inset: 0;
    backface-visibility: hidden; -webkit-backface-visibility: hidden;
    padding: 32px 36px;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .ea-bs-back { transform: rotateY(180deg); background: #18160F; }
  .ea-bs-bar  { position: absolute; bottom: 0; left: 0; height: 2px; width: 0; transition: width 0.35s; }
  .ea-bs-item:hover .ea-bs-bar { width: 100%; }

  /* Product cards */
  .ea-card {
    background: #fff; border: 1px solid rgba(24,22,15,0.07);
    display: flex; flex-direction: column;
    transition: transform 0.25s, box-shadow 0.25s; cursor: pointer;
  }
  .ea-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(24,22,15,0.10); }
  .ea-ps { transition: transform 0.4s ease; filter: drop-shadow(0 12px 32px rgba(24,22,15,0.18)); }
  .ea-card:hover .ea-ps { transform: scale(1.03) translateY(-4px); }

  /* Button hovers */
  .ea-acq:hover  { background: #1A6CFF !important; }
  .ea-mcta:hover { background: #1A6CFF !important; }
  .ea-wc-b:hover { opacity: 0.85; }
  .ea-cl:hover   { color: #18160F !important; }
  .ea-ncta:hover { opacity: 0.75; }
`

// ─── Shared SVG gradient defs (rendered once, referenced by all product SVGs) ─
function SvgDefs() {
  return (
    <svg width={0} height={0} aria-hidden="true" style={{ position: "absolute", overflow: "hidden" }}>
      <defs>
        {/* Dark shirt gradients */}
        <linearGradient id="ea-ds-b"  x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#1a1e26" />
          <stop offset="100%" stopColor="#0c0e13" />
        </linearGradient>
        <linearGradient id="ea-ds-sl" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#10131a" />
          <stop offset="100%" stopColor="#1a1e26" />
        </linearGradient>
        <linearGradient id="ea-ds-sr" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#1a1e26" />
          <stop offset="100%" stopColor="#10131a" />
        </linearGradient>
        {/* Light shirt gradients */}
        <linearGradient id="ea-ls-b"  x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#F5F2EC" />
          <stop offset="100%" stopColor="#E8E4DB" />
        </linearGradient>
        <linearGradient id="ea-ls-sl" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#DDD9D0" />
          <stop offset="100%" stopColor="#F0EDE6" />
        </linearGradient>
        <linearGradient id="ea-ls-sr" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#F0EDE6" />
          <stop offset="100%" stopColor="#DDD9D0" />
        </linearGradient>
        {/* Mug gradients */}
        <linearGradient id="ea-mg-b"  x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#1e2228" />
          <stop offset="60%"  stopColor="#141720" />
          <stop offset="100%" stopColor="#0e1016" />
        </linearGradient>
        <linearGradient id="ea-mg-t"  x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a2f38" />
          <stop offset="100%" stopColor="#1e2228" />
        </linearGradient>
        <linearGradient id="ea-mg-h"  x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#1a1e26" />
          <stop offset="50%"  stopColor="#0e1016" />
          <stop offset="100%" stopColor="#1a1e26" />
        </linearGradient>
        <linearGradient id="ea-mg-s"  x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)"    />
        </linearGradient>
        <radialGradient id="ea-mg-sh" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="rgba(14,17,22,0.35)" />
          <stop offset="100%" stopColor="rgba(14,17,22,0)"    />
        </radialGradient>
      </defs>
    </svg>
  )
}

// ─── SVG product shapes ───────────────────────────────────────────────────────
function ShirtDark({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "85%", height: "85%" }} className="ea-ps">
      <path d="M68 52 L22 80 L10 130 L40 134 L40 272 L200 272 L200 134 L230 130 L218 80 L172 52"  fill="url(#ea-ds-b)"  />
      <path d="M68 52 L22 80 L10 130 L40 134 L40 100 L68 52"                                       fill="url(#ea-ds-sl)" />
      <path d="M172 52 L218 80 L230 130 L200 134 L200 100 L172 52"                                 fill="url(#ea-ds-sr)" />
      <path d="M68 52 Q90 36 120 34 Q150 36 172 52 Q155 68 120 70 Q85 68 68 52Z"                   fill="#141720"        />
      <line x1="120" y1="72"  x2="115" y2="272" stroke="rgba(255,255,255,0.025)" strokeWidth="1.5" />
      <line x1="90"  y1="140" x2="85"  y2="272" stroke="rgba(255,255,255,0.018)" strokeWidth="1"   />
      <line x1="150" y1="140" x2="155" y2="272" stroke="rgba(255,255,255,0.018)" strokeWidth="1"   />
      <line x1="40"  y1="270" x2="200" y2="270" stroke="rgba(255,255,255,0.04)"  strokeWidth="1.5" />
      {children}
    </svg>
  )
}

function ShirtLight({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "85%", height: "85%" }} className="ea-ps">
      <path d="M68 52 L22 80 L10 130 L40 134 L40 272 L200 272 L200 134 L230 130 L218 80 L172 52"  fill="url(#ea-ls-b)"  />
      <path d="M68 52 L22 80 L10 130 L40 134 L40 100 L68 52"                                       fill="url(#ea-ls-sl)" />
      <path d="M172 52 L218 80 L230 130 L200 134 L200 100 L172 52"                                 fill="url(#ea-ls-sr)" />
      <path d="M68 52 Q90 36 120 34 Q150 36 172 52 Q155 68 120 70 Q85 68 68 52Z"                   fill="#D8D4CA"        />
      <line x1="120" y1="72"  x2="115" y2="272" stroke="rgba(0,0,0,0.04)"  strokeWidth="1.5" />
      <line x1="90"  y1="140" x2="85"  y2="272" stroke="rgba(0,0,0,0.025)" strokeWidth="1"   />
      <line x1="150" y1="140" x2="155" y2="272" stroke="rgba(0,0,0,0.025)" strokeWidth="1"   />
      <line x1="40"  y1="270" x2="200" y2="270" stroke="rgba(0,0,0,0.06)"  strokeWidth="1.5" />
      {children}
    </svg>
  )
}

function MugSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "78%", height: "78%" }} className="ea-ps">
      <ellipse cx="95" cy="192" rx="55" ry="8"    fill="url(#ea-mg-sh)" />
      <path    d="M30 52 Q30 40 95 38 Q160 40 160 52 L155 175 Q155 185 95 185 Q35 185 35 175 Z"
               fill="url(#ea-mg-b)" />
      <ellipse cx="95" cy="52"  rx="65" ry="14"   fill="url(#ea-mg-t)"  />
      <ellipse cx="95" cy="52"  rx="52" ry="10"   fill="#0a0c10"        />
      <path    d="M155 80 Q188 80 190 110 Q192 140 160 145"
               fill="none" stroke="url(#ea-mg-h)" strokeWidth="13" strokeLinecap="round" />
      <path    d="M155 80 Q182 80 184 110 Q186 138 160 143"
               fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      <path    d="M42 58 Q42 52 55 50 L55 120 Q42 115 42 58Z" fill="url(#ea-mg-s)" />
      {children}
    </svg>
  )
}

// ─── Score Modal ──────────────────────────────────────────────────────────────
function ScoreModal({ product, onClose }: { product: string; onClose: () => void }) {
  const router = useRouter()
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(24,22,15,0.70)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="ea-modal-box"
        style={{
          background: C.card, maxWidth: 480, width: "90%",
          border: `1px solid ${C.line}`, overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Dark top */}
        <div style={{ background: C.ink, padding: "32px 36px 28px" }}>
          <p style={{
            fontFamily: C.mono, fontSize: 9, letterSpacing: "0.30em",
            textTransform: "uppercase", color: "rgba(245,245,245,0.30)", margin: "0 0 12px",
          }}>Score-gated access</p>
          <h2 style={{
            fontSize: "clamp(22px,3vw,34px)", fontWeight: 900,
            letterSpacing: "-0.04em", textTransform: "uppercase",
            color: "#F5F5F5", lineHeight: 1.05, margin: 0,
          }}>
            Get Your Q Score<br />
            <span style={{ color: C.green }}>First.</span>
          </h2>
        </div>
        {/* Body */}
        <div style={{ padding: "28px 36px 32px" }}>
          <p style={{
            fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em",
            textTransform: "uppercase", color: C.dimmer, margin: "0 0 8px",
          }}>
            Item: <span style={{ color: C.ink, fontWeight: 500 }}>{product}</span>
          </p>
          <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.75, margin: "0 0 24px" }}>
            This piece unlocks when you score above{" "}
            <strong style={{ color: C.ink, fontWeight: 600 }}>70 on the Edge Alpha Q Score™</strong>.<br /><br />
            Build your profile, work with your AI advisers, and raise your readiness. The gear follows the score.
          </p>
          <button
            className="ea-mcta"
            onClick={() => router.push("/founder/onboarding")}
            style={{
              display: "block", width: "100%", padding: 16,
              background: C.ink, color: C.bg,
              fontFamily: C.mono, fontSize: 11, letterSpacing: "0.20em",
              textTransform: "uppercase", textAlign: "center",
              border: "none", cursor: "pointer", marginBottom: 10,
              transition: "background 0.15s",
            }}
          >Start My Q Score →</button>
          <button
            onClick={onClose}
            style={{
              display: "block", width: "100%", padding: 10,
              background: "none", border: "none", cursor: "pointer",
              fontFamily: C.mono, fontSize: 9, letterSpacing: "0.15em",
              textTransform: "uppercase", color: C.dimmer,
              transition: "color 0.15s",
            }}
          >Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Acquire button (shared) ──────────────────────────────────────────────────
function AcqBtn({ name, onAcquire }: { name: string; onAcquire: (n: string) => void }) {
  return (
    <button
      className="ea-acq"
      onClick={e => { e.stopPropagation(); onAcquire(name) }}
      style={{
        fontFamily: C.mono, fontSize: 10, letterSpacing: "0.12em",
        textTransform: "uppercase", background: C.ink, color: C.bg,
        border: "none", padding: "9px 16px", cursor: "pointer",
        transition: "background 0.15s", whiteSpace: "nowrap",
      }}
    >Get Your Q Score →</button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MerchPage() {
  const router = useRouter()
  const [modal, setModal] = useState<string | null>(null)

  return (
    <div style={{
      background: C.bg, color: C.ink,
      fontFamily: C.sans,
      WebkitFontSmoothing: "antialiased",
      overflowX: "hidden",
    }}>
      <style>{CSS}</style>
      <SvgDefs />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 52,
        background: "rgba(249,247,242,0.94)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.line}`,
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{
            fontFamily: C.mono, fontSize: 11, letterSpacing: "0.18em",
            textTransform: "uppercase", color: C.ink,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div className="ea-dot" style={{
              width: 6, height: 6, borderRadius: "50%",
              background: C.green, border: "1px solid rgba(24,22,15,0.10)",
            }} />
            Edge Alpha™
          </div>
        </Link>
        <div style={{
          fontFamily: C.mono, fontSize: 10, letterSpacing: "0.12em",
          color: C.dim, display: "flex", gap: 32, alignItems: "center",
        }}>
          {[["#q", "Q Series"], ["#os", "Startup OS"], ["#signal", "Signal"]].map(([href, label]) => (
            <a key={href} href={href} className="ea-cl"
              style={{ color: C.dim, textDecoration: "none", transition: "color 0.15s" }}
            >{label}</a>
          ))}
          <Link href="/" className="ea-cl"
            style={{ color: C.dim, textDecoration: "none", transition: "color 0.15s" }}
          >edgealpha.vc ↗</Link>
        </div>
        <button
          className="ea-ncta"
          onClick={() => router.push("/founder/onboarding")}
          style={{
            fontFamily: C.mono, fontSize: 10, letterSpacing: "0.15em",
            textTransform: "uppercase", background: C.ink, color: C.bg,
            border: "none", padding: "9px 18px", cursor: "pointer",
            transition: "opacity 0.15s",
          }}
        >Get Q Score</button>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "80px 40px 72px",
        borderBottom: `1px solid ${C.line}`,
        display: "grid", gridTemplateColumns: "1fr 320px",
        gap: 40, alignItems: "end",
      }}>
        <div>
          <p style={{
            fontFamily: C.mono, fontSize: 10, letterSpacing: "0.25em",
            textTransform: "uppercase", color: C.dimmer, marginBottom: 20,
          }}>Edge Alpha Merch — Powered by Q Score™</p>
          <h1 style={{
            fontSize: "clamp(72px, 11vw, 148px)", fontWeight: 900,
            lineHeight: 0.86, letterSpacing: "-0.06em", textTransform: "uppercase",
            color: C.ink, marginBottom: 28,
          }}>Q &gt;<br />FOMO.</h1>
          <p style={{ fontSize: 16, color: C.dim, lineHeight: 1.65 }}>
            The unofficial uniform of startup readiness.<br /><br />
            Gear for <strong style={{ color: C.ink, fontWeight: 500 }}>founders</strong>,{" "}
            <strong style={{ color: C.ink, fontWeight: 500 }}>operators</strong>,<br />
            and <strong style={{ color: C.ink, fontWeight: 500 }}>signal hunters</strong>.
          </p>
        </div>
        <div style={{
          paddingLeft: 40, borderLeft: `1px solid ${C.line}`,
          alignSelf: "end", paddingBottom: 4,
        }}>
          <p style={{
            fontFamily: C.mono, fontSize: 9, letterSpacing: "0.25em",
            textTransform: "uppercase", color: C.dimmer, marginBottom: 12,
          }}>Edge Alpha Q Score™</p>
          <div style={{
            fontFamily: C.mono, fontSize: 11, letterSpacing: "0.10em",
            color: C.dim, lineHeight: 2.1,
          }}>
            {"Domains    "}<strong style={{ color: C.ink, fontWeight: 500 }}>5</strong><br />
            {"Indicators "}<strong style={{ color: C.ink, fontWeight: 500 }}>25</strong><br />
            {"India 2026 "}<strong style={{ color: C.blue }}>72.4</strong>
          </div>
        </div>
      </div>

      {/* ── Bestsellers (flip cards) ─────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)",
        borderBottom: `1px solid ${C.line}`,
      }}>
        {[
          {
            rank: "Best Seller № 01", name: "Q > FOMO",
            desc: "Most startup mistakes start with FOMO.",
            backBody: <><strong>Capital, markets, narratives</strong> — all chased before real readiness is built.<br /><br />Q &gt; FOMO is the Edge Alpha rule:<br /><strong>measure first, move second.</strong></>,
            barColor: C.green,
          },
          {
            rank: "Best Seller № 02", name: "Raise Q. Not Just Capital.",
            desc: "Investors fund readiness.",
            backBody: <>Capital does not fix weak readiness.<br /><strong>It amplifies whatever is already there.</strong><br /><br />Founders who raise Q first raise capital on better terms, with better outcomes, to better investors.</>,
            barColor: C.blue,
          },
          {
            rank: "Best Seller № 03", name: "Structure Reveals.",
            desc: "Chaos is expensive.",
            backBody: <>Chaos hides problems. <strong>Structure shows where the company is actually ready</strong> — and where it is not.<br /><br />The score implies where to look first.</>,
            barColor: C.ink,
          },
        ].map((bs, i) => (
          <div
            key={i}
            className="ea-bs-item"
            style={{
              borderRight: i < 2 ? `1px solid ${C.line}` : "none",
              height: 260,
            }}
          >
            <div className="ea-bs-inner">
              {/* Front */}
              <div className="ea-bs-front" style={{ background: C.card }}>
                <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: C.dimmer, margin: 0 }}>{bs.rank}</p>
                <div>
                  <p style={{ fontSize: "clamp(18px,2vw,26px)", fontWeight: 800, letterSpacing: "-0.03em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 6 }}>{bs.name}</p>
                  <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.55, margin: 0 }}>{bs.desc}</p>
                </div>
                <p style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.dimmer, margin: 0 }}>
                  Why It Exists →
                </p>
                <div className="ea-bs-bar" style={{ background: bs.barColor }} />
              </div>
              {/* Back */}
              <div className="ea-bs-back">
                <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.30em", textTransform: "uppercase", color: "rgba(245,245,245,0.30)", margin: 0 }}>Why It Exists</p>
                <div>
                  <p style={{ fontSize: "clamp(16px,1.8vw,22px)", fontWeight: 800, letterSpacing: "-0.02em", textTransform: "uppercase", color: "#F5F5F5", lineHeight: 1.05, marginBottom: 0 }}>{bs.name}</p>
                  <p style={{ fontSize: 12, color: "rgba(245,245,245,0.55)", lineHeight: 1.75, padding: "16px 0 0", margin: 0 }}>{bs.backBody}</p>
                </div>
                <button
                  className="ea-wc-b"
                  onClick={() => setModal(bs.name)}
                  style={{
                    fontFamily: C.mono, fontSize: 10, letterSpacing: "0.15em",
                    textTransform: "uppercase", color: C.ink,
                    background: C.green, border: "none", cursor: "pointer",
                    padding: "12px 20px", width: "100%", transition: "opacity 0.15s",
                  }}
                >Get Your Q Score →</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ════ COLLECTION 01 — Q SERIES ════════════════════════════════════ */}
      <div id="q" style={{ paddingBottom: 16, background: C.gnBg }}>
        <div style={{
          padding: "56px 40px 0",
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 28,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.30em", textTransform: "uppercase", color: C.dimmer }}>Collection 01 — Q Series</span>
          <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.15em", color: C.dimmer }}>5 items</span>
        </div>
        <div style={{
          padding: "0 40px 40px",
          display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10,
        }}>

          {/* 01 — Q > FOMO (wide flagship) */}
          <div className="ea-card" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "5fr 7fr" }}>
            <div style={{
              background: "#F2F0EB", display: "flex", alignItems: "center",
              justifyContent: "center", overflow: "hidden",
              borderRight: "1px solid rgba(24,22,15,0.06)", minHeight: 340,
            }}>
              <ShirtDark>
                <text x="120" y="148" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="28" fill="#F5F5F5" letterSpacing="-1">Q &gt; FOMO</text>
                <text x="120" y="255" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6" fill="rgba(245,245,245,0.2)" letterSpacing="2">EDGE ALPHA™</text>
              </ShirtDark>
            </div>
            <div style={{ padding: "36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  01
                  <span style={{ fontSize: 8, letterSpacing: "0.10em", padding: "2px 7px", borderRadius: 2, fontWeight: 500, background: "#DDFBEA", color: "#0B6830" }}>Founding Edition · 2026</span>
                </div>
                <p style={{ fontSize: "clamp(24px,3.5vw,44px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 10 }}>Q &gt; FOMO</p>
                <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.5, marginBottom: 28 }}>Most startup mistakes start with FOMO.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 55</span>
                <AcqBtn name="Q > FOMO" onAcquire={setModal} />
              </div>
            </div>
          </div>

          {/* 02 — Raise Q */}
          <div className="ea-card">
            <div style={{ background: "#F2F0EB", aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid rgba(24,22,15,0.06)" }}>
              <ShirtLight>
                <text x="120" y="132" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="19" fill="#0E1116" letterSpacing="-0.5">RAISE Q.</text>
                <text x="120" y="156" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="19" fill="#0E1116" letterSpacing="-0.5">NOT JUST</text>
                <text x="120" y="180" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="19" fill="#0E1116" letterSpacing="-0.5">CAPITAL.</text>
                <text x="120" y="255" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6" fill="rgba(14,17,22,0.2)" letterSpacing="2">EDGE ALPHA Q SCORE™</text>
              </ShirtLight>
            </div>
            <div style={{ padding: "18px 20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6 }}>02</p>
              <p style={{ fontSize: "clamp(15px,1.6vw,19px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 5 }}>Raise Q. Not Just Capital.</p>
              <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, flex: 1, marginBottom: 0 }}>Investors fund readiness.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}`, marginTop: 16 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 55</span>
                <AcqBtn name="Raise Q. Not Just Capital." onAcquire={setModal} />
              </div>
            </div>
          </div>

          {/* 05 — Long Q */}
          <div className="ea-card">
            <div style={{ background: "#F2F0EB", aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid rgba(24,22,15,0.06)" }}>
              <ShirtDark>
                <text x="120" y="158" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="32" fill="#F5F5F5" letterSpacing="2">LONG Q</text>
                <text x="120" y="255" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6" fill="rgba(245,245,245,0.2)" letterSpacing="2">EDGE ALPHA™</text>
              </ShirtDark>
            </div>
            <div style={{ padding: "18px 20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6 }}>05</p>
              <p style={{ fontSize: "clamp(15px,1.6vw,19px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 5 }}>Long Q</p>
              <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, flex: 1 }}>Investing in readiness.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}`, marginTop: 16 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 55</span>
                <AcqBtn name="Long Q" onAcquire={setModal} />
              </div>
            </div>
          </div>

          {/* 06 — Q ↑ mug */}
          <div className="ea-card">
            <div style={{ background: "#EDECEA", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid rgba(24,22,15,0.06)" }}>
              <MugSvg>
                <text x="84" y="112" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="26" fill="#F5F5F5" letterSpacing="-0.5">Q ↑</text>
                <text x="84" y="148" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6.5" fill="rgba(245,245,245,0.22)" letterSpacing="1.5">EDGE ALPHA</text>
                <text x="84" y="160" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6.5" fill="rgba(245,245,245,0.18)" letterSpacing="1.5">Q SCORE™</text>
              </MugSvg>
            </div>
            <div style={{ padding: "18px 20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6 }}>06</p>
              <p style={{ fontSize: "clamp(15px,1.6vw,19px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 5 }}>Q ↑</p>
              <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, flex: 1 }}>Improve. Measure. Repeat.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}`, marginTop: 16 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 38</span>
                <AcqBtn name="Q ↑" onAcquire={setModal} />
              </div>
            </div>
          </div>

          {/* 07 — 87 */}
          <div className="ea-card">
            <div style={{ background: "#F2F0EB", aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid rgba(24,22,15,0.06)" }}>
              <ShirtDark>
                <text x="120" y="168" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="58" fill="#47FF95" letterSpacing="-3">87</text>
                <text x="120" y="255" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6" fill="rgba(245,245,245,0.2)" letterSpacing="2">EDGE ALPHA™</text>
              </ShirtDark>
            </div>
            <div style={{ padding: "18px 20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                07
                <span style={{ fontSize: 8, letterSpacing: "0.10em", padding: "2px 7px", borderRadius: 2, fontWeight: 500, background: "#EAF2FF", color: "#0D3A8F" }}>Geeky</span>
              </div>
              <p style={{ fontSize: "clamp(15px,1.6vw,19px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 5 }}>87</p>
              <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, flex: 1 }}>Front: a number. Back: EDGE ALPHA.<br />People will ask. That&apos;s the point.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}`, marginTop: 16 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 55</span>
                <AcqBtn name="87" onAcquire={setModal} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Scrolling strip ──────────────────────────────────────────────── */}
      <div style={{
        borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`,
        overflow: "hidden", height: 38,
        display: "flex", alignItems: "center", background: C.bg,
      }}>
        <div className="ea-strip-track">
          {[
            "Q > FOMO", "Structure Reveals", "Signal > Noise",
            "Readiness Before Fundraising", "Improve · Measure · Repeat",
            "Q Index™ · India 2026 · 72.4", "Neither Are Outcomes",
            "Alpha Is Detected · Not Invented",
            "Q > FOMO", "Structure Reveals", "Signal > Noise",
            "Readiness Before Fundraising", "Improve · Measure · Repeat",
            "Q Index™ · India 2026 · 72.4", "Neither Are Outcomes",
            "Alpha Is Detected · Not Invented",
          ].map((s, i) => (
            <span key={i} style={{
              fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em",
              textTransform: "uppercase", color: C.dimmer, padding: "0 36px",
              display: "inline-block",
            }}>
              <span style={{ color: C.blue, marginRight: 10 }}>◆</span>{s}
            </span>
          ))}
        </div>
      </div>

      {/* ════ COLLECTION 02 — STARTUP OS ══════════════════════════════════ */}
      <div id="os" style={{ paddingBottom: 16, background: C.blBg }}>
        <div style={{
          padding: "56px 40px 0",
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 28,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.30em", textTransform: "uppercase", color: C.dimmer }}>Collection 02 — Startup OS</span>
          <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.15em", color: C.dimmer }}>3 items</span>
        </div>
        <div style={{ padding: "0 40px 40px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>

          {/* 03 — Structure Reveals (wide) */}
          <div className="ea-card" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "5fr 7fr" }}>
            <div style={{
              background: "#EEECE7", display: "flex", alignItems: "center",
              justifyContent: "center", overflow: "hidden",
              borderRight: "1px solid rgba(24,22,15,0.06)", minHeight: 340,
            }}>
              <ShirtLight>
                <text x="120" y="143" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="24" fill="#0E1116" letterSpacing="-0.5">STRUCTURE</text>
                <text x="120" y="170" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="24" fill="#0E1116" letterSpacing="-0.5">REVEALS.</text>
                <text x="120" y="255" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6" fill="rgba(14,17,22,0.2)" letterSpacing="2">EDGE ALPHA STARTUP OS™</text>
              </ShirtLight>
            </div>
            <div style={{ padding: "36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6 }}>03</p>
                <p style={{ fontSize: "clamp(24px,3.5vw,44px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 10 }}>Structure Reveals.</p>
                <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.5, marginBottom: 28 }}>Chaos is expensive.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 65</span>
                <AcqBtn name="Structure Reveals." onAcquire={setModal} />
              </div>
            </div>
          </div>

          {/* 04 — Readiness Is Not Random */}
          <div className="ea-card">
            <div style={{ background: "#F2F0EB", aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid rgba(24,22,15,0.06)" }}>
              <ShirtDark>
                <text x="120" y="130" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="17" fill="#F5F5F5" letterSpacing="-0.3">READINESS</text>
                <text x="120" y="152" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="17" fill="#F5F5F5" letterSpacing="-0.3">IS NOT</text>
                <text x="120" y="174" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="17" fill="#F5F5F5" letterSpacing="-0.3">RANDOM.</text>
                <text x="120" y="255" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6" fill="rgba(245,245,245,0.2)" letterSpacing="2">EDGE ALPHA™</text>
              </ShirtDark>
            </div>
            <div style={{ padding: "18px 20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6 }}>04</p>
              <p style={{ fontSize: "clamp(15px,1.6vw,19px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 5 }}>Readiness Is Not Random.</p>
              <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, flex: 1 }}>Neither are outcomes.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}`, marginTop: 16 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 55</span>
                <AcqBtn name="Readiness Is Not Random." onAcquire={setModal} />
              </div>
            </div>
          </div>

          {/* 08 — Q Index™ mug */}
          <div className="ea-card">
            <div style={{ background: "#EDECEA", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid rgba(24,22,15,0.06)" }}>
              <MugSvg>
                <text x="84" y="100" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="8" fill="rgba(245,245,245,0.3)" letterSpacing="2">INDIA · 2026</text>
                <text x="84" y="132" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="30" fill="#47FF95" letterSpacing="-1">72.4</text>
                <text x="84" y="152" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6.5" fill="rgba(245,245,245,0.2)" letterSpacing="1.5">Q INDEX™</text>
              </MugSvg>
            </div>
            <div style={{ padding: "18px 20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6 }}>08</p>
              <p style={{ fontSize: "clamp(15px,1.6vw,19px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 5 }}>Q Index™</p>
              <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, flex: 1 }}>India · 2026 · 72.4<br />Feels like Bloomberg. Because it is.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}`, marginTop: 16 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 38</span>
                <AcqBtn name="Q Index™" onAcquire={setModal} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ════ COLLECTION 03 — SIGNAL SERIES ══════════════════════════════ */}
      <div id="signal" style={{ paddingBottom: 16, background: C.cream }}>
        <div style={{
          padding: "56px 40px 0",
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 28,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.30em", textTransform: "uppercase", color: C.dimmer }}>Collection 03 — Signal Series</span>
          <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.15em", color: C.dimmer }}>2 items</span>
        </div>
        <div style={{ padding: "0 40px 40px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>

          {/* 09 — Signal > Noise (wide) */}
          <div className="ea-card" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "5fr 7fr" }}>
            <div style={{
              background: "#EAE7E0", display: "flex", alignItems: "center",
              justifyContent: "center", overflow: "hidden",
              borderRight: "1px solid rgba(24,22,15,0.06)", minHeight: 340,
            }}>
              <ShirtDark>
                <text x="120" y="143" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="26" fill="#F5F5F5" letterSpacing="-0.5">SIGNAL &gt;</text>
                <text x="120" y="170" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="26" fill="#F5F5F5" letterSpacing="-0.5">NOISE</text>
                <text x="120" y="255" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6" fill="rgba(245,245,245,0.2)" letterSpacing="2">EDGE ALPHA™</text>
              </ShirtDark>
            </div>
            <div style={{ padding: "36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6 }}>09</p>
                <p style={{ fontSize: "clamp(24px,3.5vw,44px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 10 }}>Signal &gt; Noise</p>
                <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.5, marginBottom: 28 }}>The original edge.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 55</span>
                <AcqBtn name="Signal > Noise" onAcquire={setModal} />
              </div>
            </div>
          </div>

          {/* 10 — The Score Implies */}
          <div className="ea-card" style={{ gridColumn: "1 / 2" }}>
            <div style={{ background: "#EEEAE2", aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid rgba(24,22,15,0.06)" }}>
              <ShirtLight>
                <text x="120" y="127" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="14" fill="#0E1116" letterSpacing="-0.2">THE SCORE IMPLIES</text>
                <text x="120" y="148" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="14" fill="#0E1116" letterSpacing="-0.2">WHERE TO LOOK</text>
                <text x="120" y="169" textAnchor="middle" fontFamily="'Inter Tight',sans-serif" fontWeight="900" fontSize="14" fill="#0E1116" letterSpacing="-0.2">FIRST.</text>
                <text x="120" y="255" textAnchor="middle" fontFamily="'IBM Plex Mono',monospace" fontSize="6" fill="rgba(14,17,22,0.2)" letterSpacing="2">EDGE ALPHA STARTUP OS™</text>
              </ShirtLight>
            </div>
            <div style={{ padding: "18px 20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 6 }}>10</p>
              <p style={{ fontSize: "clamp(15px,1.6vw,19px)", fontWeight: 800, letterSpacing: "-0.025em", textTransform: "uppercase", color: C.ink, lineHeight: 1.05, marginBottom: 5 }}>The Score Implies…</p>
              <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, flex: 1 }}>Diagnosis before action. Most insider piece.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${C.line}`, marginTop: 16 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: "0.08em", color: C.dimmer }}>CHF 55</span>
                <AcqBtn name="The Score Implies…" onAcquire={setModal} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${C.line}`, padding: "48px 40px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "end",
      }}>
        {/* Terminal */}
        <div style={{ fontFamily: C.mono }}>
          <p style={{ fontSize: 9, letterSpacing: "0.20em", textTransform: "uppercase", color: C.dimmer, marginBottom: 8 }}>
            <span style={{ color: "#0B6830" }}>$</span> edge-alpha --status
          </p>
          {[
            ["SYSTEM",   "Edge Alpha Q Score™", ""],
            ["STATUS",   "ONLINE",              "online"],
            ["SIGNALS",  "DETECTED",            "detected"],
            ["Q INDEX™", "India 2026 · 72.4",   ""],
            ["LOCATION", "Zürich · Bhubaneswar", ""],
          ].map(([k, v, cls]) => (
            <div key={k} style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.dimmer, lineHeight: 2.1, display: "flex", gap: 16 }}>
              <span style={{ minWidth: 96 }}>{k}</span>
              <span style={{ color: cls === "online" ? "#0B6830" : cls === "detected" ? C.blue : C.ink, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, lineHeight: 2.1 }}>
            <span className="ea-cursor" style={{ display: "inline-block", width: 7, height: 11, background: C.ink, opacity: 0.3, verticalAlign: "middle", marginLeft: 2 }} />
          </div>
        </div>
        {/* Links */}
        <div style={{ textAlign: "right", fontFamily: C.mono, fontSize: 9, letterSpacing: "0.15em", color: C.dimmer, lineHeight: 2.4 }}>
          {[["edgealpha.vc ↗", "/"], ["Shipping", "#"], ["Returns", "#"], ["Size Guide", "#"], ["Contact", "#"]].map(([label, href]) => (
            <a key={label} href={href} className="ea-cl"
              style={{ display: "block", color: C.dimmer, textDecoration: "none", transition: "color 0.15s" }}
            >{label}</a>
          ))}
        </div>
      </footer>

      {/* ── Score Modal ──────────────────────────────────────────────────── */}
      {modal && <ScoreModal product={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
