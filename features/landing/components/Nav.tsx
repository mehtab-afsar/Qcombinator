"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { L, DUSK, FONT_MONO } from "../theme";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Advisers", href: "#advisers" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // over the dusk hero → dark glass pill; on the light page → cream pill
  const light = scrolled || open;
  const pillBg = light ? "rgba(249,247,242,0.92)" : "rgba(20,27,51,0.5)";
  const pillBorder = light ? "rgba(232,226,217,0.8)" : "rgba(245,239,228,0.16)";
  const pillShadow = light ? "0 6px 26px rgba(24,22,15,0.10)" : "0 6px 26px rgba(6,9,20,0.35)";
  const fg = light ? L.ink : DUSK.text;
  const fgMuted = light ? L.muted : "rgba(245,239,228,0.72)";
  const markBg = light ? L.ink : DUSK.text;
  const markFg = light ? L.bg : "#141B33";
  const ctaBg = light ? L.ink : DUSK.text;
  const ctaFg = light ? L.bg : "#141B33";

  return (
    <div style={{ position: "fixed", top: 14, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
      <header
        style={{
          pointerEvents: "auto", width: "100%", maxWidth: 940,
          background: pillBg,
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          border: `1px solid ${pillBorder}`,
          borderRadius: open ? 22 : 999,
          boxShadow: pillShadow,
          transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s, border-radius 0.2s",
        }}
      >
        <nav aria-label="Main" style={{ padding: "9px 10px 9px 20px", height: 46, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <span aria-hidden="true" style={{ width: 25, height: 25, borderRadius: 7, background: markBg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 13, fontWeight: 800, color: markFg, transition: "background 0.3s, color 0.3s" }}>α</span>
            <span style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.02em", color: fg, transition: "color 0.3s" }}>Edge Alpha</span>
          </Link>

          <div className="lp-nav-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={light ? "lp-nav-a" : "lp-nav-a-dark"} style={{ fontSize: 13.5, color: fgMuted, textDecoration: "none", transition: "color 0.3s" }}>{l.label}</a>
            ))}
            <Link href="/login" className={light ? "lp-nav-a" : "lp-nav-a-dark"} style={{ fontSize: 13.5, color: fgMuted, textDecoration: "none", transition: "color 0.3s" }}>Sign in</Link>
            <Link href="/founder/onboarding" className="lp-cta" style={{ background: ctaBg, color: ctaFg, padding: "8px 16px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, textDecoration: "none", transition: "background 0.3s, color 0.3s" }}>Get your Q-Score</Link>
          </div>

          <button className="lp-nav-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} style={{ display: "none", background: "none", border: "none", color: fg, cursor: "pointer", padding: 6 }}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {open && (
          <div style={{ padding: "4px 18px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ fontSize: 15, color: fgMuted, textDecoration: "none", padding: "9px 0" }}>{l.label}</a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} style={{ fontSize: 15, color: fgMuted, textDecoration: "none", padding: "9px 0" }}>Sign in</Link>
            <Link href="/founder/onboarding" style={{ background: ctaBg, color: ctaFg, padding: "11px 18px", borderRadius: 999, fontSize: 14.5, fontWeight: 600, textDecoration: "none", textAlign: "center", marginTop: 8 }}>Get your Q-Score</Link>
          </div>
        )}
      </header>
    </div>
  );
}
