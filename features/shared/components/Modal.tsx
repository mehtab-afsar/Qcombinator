"use client";

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { bg, bdr, ink, muted } from '@/lib/constants/colors';
import { radius, shadow, font } from '@/features/shared/tokens';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Modal({ open, onClose, title, width = 480, children, style }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (!cardRef.current?.contains(e.target as Node)) onClose(); }}
    >
      <div
        ref={cardRef}
        style={{
          width: '100%',
          maxWidth: width,
          background: bg,
          border: `1px solid ${bdr}`,
          borderRadius: radius.xl,
          boxShadow: shadow.xl,
          ...style,
        }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 0',
          }}>
            <p style={{ fontSize: font.size.md, fontWeight: font.weight.semibold, color: ink }}>{title}</p>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 4, color: muted, display: 'flex', borderRadius: radius.sm,
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = ink)}
              onMouseLeave={e => (e.currentTarget.style.color = muted)}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}
        <div style={{ padding: title ? '16px 24px 24px' : '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
