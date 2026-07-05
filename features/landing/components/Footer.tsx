"use client";

import Link from "next/link";
import { L, FONT_MONO } from "../theme";
import { FOOTER_LINKS } from "../copy";

export function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${L.bdr}`, padding: "56px 24px 40px", background: L.surf }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div className="lp-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32, marginBottom: 48 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 6, background: L.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 12, fontWeight: 800, color: L.bg }}>α</span>
              <span style={{ fontSize: 15, fontWeight: 650, color: L.ink }}>Edge Alpha</span>
            </div>
            <p style={{ fontSize: 13.5, color: L.muted, lineHeight: 1.6, maxWidth: 280, margin: 0 }}>
              The startup OS with a score. Build a fundable business, then raise.
            </p>
          </div>
          {FOOTER_LINKS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: L.muted, margin: "0 0 14px" }}>{col.title}</p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("#") ? (
                      <a href={l.href} className="lp-nav-a" style={{ fontSize: 13.5, color: L.muted, textDecoration: "none" }}>{l.label}</a>
                    ) : (
                      <Link href={l.href} className="lp-nav-a" style={{ fontSize: 13.5, color: L.muted, textDecoration: "none" }}>{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${L.bdr}`, paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontSize: 12.5, color: L.muted, margin: 0 }}>© {new Date().getFullYear()} Edge Alpha. All rights reserved.</p>
          <p style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: L.muted, margin: 0 }}>Fundable is measurable.</p>
        </div>
      </div>
    </footer>
  );
}
