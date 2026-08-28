"use client";

import { bg, surf, bdr, ink, muted, blue } from "@/lib/constants/colors";
import { font } from "@/features/shared/tokens";
import type { QuizQuestion, AnswerLetter } from "../scoring/questions";

export function QuizQuestionCard({
  question,
  selected,
  onSelect,
}: {
  question: QuizQuestion;
  selected: AnswerLetter | undefined;
  onSelect: (letter: AnswerLetter) => void;
}) {
  return (
    <div>
      <h2 style={{
        fontFamily: font.family.serif, fontSize: "clamp(22px, 3.2vw, 30px)", fontWeight: 480,
        lineHeight: 1.3, letterSpacing: "-0.01em", color: ink, margin: "0 0 28px", textWrap: "balance",
      }}>
        {question.prompt}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((option) => {
          const isSelected = selected === option.letter;
          return (
            <button
              key={option.letter}
              type="button"
              className="lc-option"
              onClick={() => onSelect(option.letter)}
              style={{
                display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                padding: "16px 18px", borderRadius: 12, cursor: "pointer",
                background: isSelected ? ink : bg,
                border: `1.5px solid ${isSelected ? ink : bdr}`,
                transition: "background 0.15s ease, border-color 0.15s ease, transform 0.1s ease",
              }}
            >
              <span aria-hidden="true" style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                fontFamily: font.family.mono, fontSize: 12, fontWeight: 700,
                background: isSelected ? bg : surf,
                color: isSelected ? ink : muted,
                border: `1px solid ${isSelected ? bg : bdr}`,
              }}>
                {option.letter}
              </span>
              <span style={{
                fontSize: 14.5, lineHeight: 1.5,
                color: isSelected ? bg : ink,
              }}>
                {option.text}
              </span>
            </button>
          );
        })}
      </div>

      <style>{`
        .lc-option:hover { border-color: ${blue}; }
      `}</style>
    </div>
  );
}
