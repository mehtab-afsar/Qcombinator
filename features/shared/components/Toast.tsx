'use client'

import { Toast as ToastItem, ToastVariant } from '@/features/shared/hooks/useToast'

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: '#F0FDF4', border: '#86EFAC', color: '#15803D', icon: '✓' },
  error:   { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', icon: '✕' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309', icon: '⚠' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB', icon: 'ℹ' },
}

function ToastItem_({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const s = VARIANT_STYLES[toast.variant]
  return (
    <div
      onClick={() => onDismiss(toast.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', borderRadius: 10,
        background: s.bg, border: `1px solid ${s.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        cursor: 'pointer', userSelect: 'none',
        animation: 'ea-toast-in 0.22s ease-out',
        maxWidth: 380, width: '100%',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%',
        background: s.color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, flexShrink: 0,
      }}>{s.icon}</span>
      <span style={{ fontSize: 13, color: s.color, fontWeight: 500, lineHeight: 1.4 }}>
        {toast.message}
      </span>
    </div>
  )
}

/** Mount this once at the layout level — renders all active toasts */
export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <>
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column-reverse', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem_ toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
      <style>{`@keyframes ea-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  )
}
