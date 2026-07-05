"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { L, FONT_SERIF } from "../theme";
import { FAQS } from "../copy";
import { Reveal, Eyebrow } from "./Section";

export function Faq() {
  return (
    <section id="faq" style={{ padding: "100px 24px", maxWidth: 760, margin: "0 auto", scrollMarginTop: 80 }}>
      <Reveal>
        <Eyebrow color={L.blue}>FAQ</Eyebrow>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 480, lineHeight: 1.12, letterSpacing: "-0.02em", color: L.ink, margin: "0 0 40px", textWrap: "balance" }}>
          Fair questions.
        </h2>
      </Reveal>

      <Reveal>
        <Accordion.Root type="single" collapsible style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map((f, i) => (
            <Accordion.Item key={f.q} value={`faq-${i}`} style={{ background: L.card, border: `1px solid ${L.bdr}`, borderRadius: 14, overflow: "hidden" }}>
              <Accordion.Header style={{ margin: 0 }}>
                <Accordion.Trigger
                  className="lp-faq-trigger"
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                    background: "none", border: "none", cursor: "pointer",
                    padding: "19px 22px", textAlign: "left",
                    fontSize: 15.5, fontWeight: 600, color: L.ink, fontFamily: "inherit",
                  }}
                >
                  {f.q}
                  <ChevronDown size={17} aria-hidden="true" className="lp-faq-chevron" style={{ color: L.muted, flexShrink: 0 }} />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="lp-faq-content">
                <p style={{ padding: "0 22px 20px", margin: 0, fontSize: 14.5, color: L.muted, lineHeight: 1.7 }}>{f.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Reveal>
    </section>
  );
}
