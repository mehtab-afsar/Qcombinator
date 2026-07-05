"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { L, FONT_MONO } from "../theme";

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
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: solid ? L.alpha(L.bg, 0.85) : "transparent",
        backdropFilter: solid ? "blur(12px)" : "none",
        borderBottom: `1px solid ${solid ? L.bdr : "transparent"}`,
        transition: "background 0.25s, border-color 0.25s",
      }}
    >
      <nav aria-label="Main" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 7, background: L.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 13, fontWeight: 800, color: L.bg }}>α</span>
          <span style={{ fontSize: 16, fontWeight: 650, color: L.ink, letterSpacing: "-0.01em" }}>Edge Alpha</span>
        </Link>

        <div className="lp-nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="lp-nav-a" style={{ fontSize: 14, color: L.muted, textDecoration: "none" }}>{l.label}</a>
          ))}
          <Link href="/login" className="lp-nav-a" style={{ fontSize: 14, color: L.muted, textDecoration: "none" }}>Sign in</Link>
          <Link href="/signup" className="lp-cta" style={{ background: L.ink, color: L.bg, padding: "9px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Get your Q-Score</Link>
        </div>

        <button className="lp-nav-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} style={{ display: "none", background: "none", border: "none", color: L.ink, cursor: "pointer", padding: 8 }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div style={{ padding: "8px 24px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ fontSize: 16, color: L.muted, textDecoration: "none", padding: "10px 0" }}>{l.label}</a>
          ))}
          <Link href="/login" style={{ fontSize: 16, color: L.muted, textDecoration: "none", padding: "10px 0" }}>Sign in</Link>
          <Link href="/signup" style={{ background: L.ink, color: L.bg, padding: "12px 20px", borderRadius: 999, fontSize: 15, fontWeight: 600, textDecoration: "none", textAlign: "center", marginTop: 8 }}>Get your Q-Score</Link>
        </div>
      )}
    </header>
  );
}
