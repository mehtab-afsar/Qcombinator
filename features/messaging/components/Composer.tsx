"use client";

import { useRef } from 'react';
import { Send } from 'lucide-react';
import { bg, surf, bdr, ink, muted, indigo, red, white } from '@/lib/constants/colors';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_LENGTH = 4000;

export function Composer({ value, onChange, onSend, disabled = false, placeholder = 'Message…' }: ComposerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canSend = value.trim().length > 0 && !disabled && value.length <= MAX_LENGTH;

  return (
    <div style={{ borderTop: `1px solid ${bdr}`, padding: '12px 16px 14px', flexShrink: 0, background: bg }}>
      <div
        ref={wrapRef}
        style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          background: surf, border: `1px solid ${bdr}`, borderRadius: 12,
          padding: '10px 10px 10px 14px',
          transition: 'border-color .15s, box-shadow .15s',
        }}
        onFocusCapture={e => {
          const el = e.currentTarget;
          el.style.borderColor = indigo;
          el.style.boxShadow = `0 0 0 3px ${indigo}14`;
        }}
        onBlurCapture={e => {
          const el = e.currentTarget;
          el.style.borderColor = bdr;
          el.style.boxShadow = 'none';
        }}
      >
        <textarea
          value={value}
          onChange={e => {
            onChange(e.target.value);
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 140) + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          rows={1}
          style={{
            flex: 1, border: 'none', outline: 'none', resize: 'none', overflow: 'hidden',
            background: 'transparent', fontSize: 13, color: ink,
            fontFamily: 'inherit', lineHeight: 1.6, maxHeight: 140,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {value.length > 3500 && (
            <span style={{ fontSize: 10, color: value.length > MAX_LENGTH ? red : muted }}>
              {value.length}/{MAX_LENGTH}
            </span>
          )}
          <button
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send message"
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: canSend ? indigo : bdr,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canSend ? 'pointer' : 'default',
              transition: 'background .12s', flexShrink: 0,
            }}
          >
            <Send style={{ height: 13, width: 13, color: canSend ? white : muted }} />
          </button>
        </div>
      </div>
      <p style={{ fontSize: 10, color: muted, marginTop: 5, paddingLeft: 2 }}>⌘+Enter to send</p>
    </div>
  );
}
